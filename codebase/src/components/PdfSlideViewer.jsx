import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";

// Sử dụng Worker nội bộ từ Vite/Webpackloader (?url) để không phụ thuộc CDN
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

let cachedPdfDoc = null;
let cachedPdfPromise = null;
let currentCachedUrl = null;

function PdfSinglePage({ pdfDoc, pageNum, numPages, isTargetPage, segments }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    let renderTask = null;
    let isCancelled = false;

    pdfDoc.getPage(pageNum).then((page) => {
      if (isCancelled) return;

      const parentWidth = wrapperRef.current ? (wrapperRef.current.clientWidth - 20) : 720;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const calculatedScale = parentWidth > 0 ? (parentWidth / unscaledViewport.width) : 1.0;

      const viewport = page.getViewport({ scale: calculatedScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      renderTask = page.render({ canvasContext: context, viewport });

      renderTask.promise.then(() => {
        if (isCancelled) return;

        const textLayerDiv = textLayerRef.current;
        textLayerDiv.innerHTML = "";
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.width = `${viewport.width}px`;

        page.getTextContent().then((textContent) => {
          if (isCancelled) return;

          // 🔥 SỬA CÚ PHÁP RENDER TEXT LAYER (Hỗ trợ cả bản PDF.js cũ lẫn mới)
          try {
            if (pdfjsLib.TextLayer) {
              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: viewport,
              });
              textLayer.render();
            } else {
              pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: [],
              });
            }
          } catch (err) {
            console.error("Text layer render fallback:", err);
          }
        });
      });
    });

    return () => {
      isCancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNum]);

  const currentSegment = segments[pageNum - 1] ?? segments[0];

  return (
    <div
      id={`slide-page-${pageNum}`}
      className={`pdf-single-page-card ${isTargetPage ? "is-active-target-page" : ""}`}
      ref={wrapperRef}
    >
      <div className="pdf-page-number-tag">
        Slide <strong>{pageNum}</strong> / {numPages}
      </div>

      <div
        className="pdf-page-wrapper"
        data-segment-code={currentSegment?.code || `T01-${String(pageNum).padStart(3, "0")}`}
        style={{ position: "relative", display: "inline-block" }}
      >
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div
          ref={textLayerRef}
          className="pdf-text-layer textLayer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "auto",
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
        />
      </div>
    </div>
  );
}

export default function PdfSlideViewer({
  pdfUrl = "/data/Lesson_01_Agile.pdf",
  targetPageNumber = 1,
  onNumPages,
  containerRef,
  onMouseUp,
  segments = [],
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePageNum, setActivePageNum] = useState(targetPageNumber);

  // Load PDF document and update cache when URL changes
  useEffect(() => {
    let isCancelled = false;

    // Guard Clause: Kiểm tra nếu pdfUrl bị thiếu/undefined
    if (!pdfUrl) {
      console.warn("PdfSlideViewer: Prop pdfUrl đang bị rỗng hoặc undefined!");
      setLoading(false);
      return;
    }

    // Reset cache nếu load URL mới
    if (currentCachedUrl !== pdfUrl) {
      cachedPdfDoc = null;
      cachedPdfPromise = null;
      currentCachedUrl = pdfUrl;
    }

    if (cachedPdfDoc) {
      setPdfDoc(cachedPdfDoc);
      setLoading(false);
      if (onNumPages) onNumPages(cachedPdfDoc.numPages);
      return;
    }

    setLoading(true);

    if (!cachedPdfPromise) {
      const urlToLoad = typeof pdfUrl === "string" ? pdfUrl : (pdfUrl?.url || "/data/Lesson_01_Agile.pdf");
      // Truyền đúng dạng object { url: ... } theo tiêu chuẩn pdfjs-dist mới
      cachedPdfPromise = pdfjsLib.getDocument({ url: urlToLoad }).promise;
    }

    cachedPdfPromise
      .then((doc) => {
        cachedPdfDoc = doc;
        if (!isCancelled) {
          setPdfDoc(doc);
          setLoading(false);
          if (onNumPages) onNumPages(doc.numPages);
        }
      })
      .catch((err) => {
        console.error("Error loading PDF:", err);
        cachedPdfPromise = null;
        cachedPdfDoc = null;
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, onNumPages]);

  // Smoothly scroll down to target slide page when targetPageNumber changes
  useEffect(() => {
    if (targetPageNumber) {
      setActivePageNum(targetPageNumber);
      const targetEl = document.getElementById(`slide-page-${targetPageNumber}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [targetPageNumber]);

  const numPages = pdfDoc ? pdfDoc.numPages : 0;
  const pagesList = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div
      className="pdf-continuous-scroll-workspace"
      ref={containerRef}
      onMouseUp={onMouseUp}
    >
      {loading && (
        <div className="pdf-loading-spinner">
          ⏳ Đang tải toàn bộ Slide bài giảng PDF...
        </div>
      )}

      {pdfDoc && (
        <div className="pdf-vertical-pages-list">
          {pagesList.map((pageNum) => (
            <PdfSinglePage
              key={pageNum}
              pdfDoc={pdfDoc}
              pageNum={pageNum}
              numPages={numPages}
              isTargetPage={pageNum === activePageNum}
              segments={segments}
            />
          ))}
        </div>
      )}
    </div>
  );
}