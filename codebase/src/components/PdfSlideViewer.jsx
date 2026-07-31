import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js Worker using official CDN for reliable execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

let cachedPdfDoc = null;
let cachedPdfPromise = null;

// Individual Vertical Scrollable Slide Page Component
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

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        if (isCancelled) return;

        const textLayerDiv = textLayerRef.current;
        textLayerDiv.innerHTML = "";
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.width = `${viewport.width}px`;

        page.getTextContent().then((textContent) => {
          if (isCancelled) return;

          pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: [],
          });
        });
      });
    });

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
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
      >
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="pdf-text-layer textLayer" />
      </div>
    </div>
  );
}

export default function PdfSlideViewer({
  pdfUrl = "/lecture.pdf",
  targetPageNumber = 1,
  onNumPages,
  containerRef,
  onMouseUp,
  segments = [],
}) {
  const [pdfDoc, setPdfDoc] = useState(cachedPdfDoc);
  const [loading, setLoading] = useState(!cachedPdfDoc);
  const [activePageNum, setActivePageNum] = useState(targetPageNumber);

  // Load PDF document ONCE and cache it
  useEffect(() => {
    if (cachedPdfDoc) {
      setPdfDoc(cachedPdfDoc);
      setLoading(false);
      if (onNumPages) onNumPages(cachedPdfDoc.numPages);
      return;
    }

    let isCancelled = false;
    if (!cachedPdfPromise) {
      cachedPdfPromise = pdfjsLib.getDocument(pdfUrl).promise;
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
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

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

  const numPages = pdfDoc ? pdfDoc.numPages : 55;
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
