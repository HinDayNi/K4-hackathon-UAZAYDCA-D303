import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js Worker using official CDN for reliable cross-browser execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

let cachedPdfDoc = null;
let cachedPdfPromise = null;

export default function PdfSlideViewer({
  pdfUrl = "/lecture.pdf",
  pageNumber = 1,
  onNumPages,
  containerRef,
  onMouseUp,
  segments = [],
}) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(cachedPdfDoc);
  const [loading, setLoading] = useState(!cachedPdfDoc);

  // Load PDF document ONCE and cache it to prevent slide reloading/flashing
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

  // Render target PDF Page + Text Selection Overlay Layer smoothly
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    let renderTask = null;
    let isCancelled = false;

    pdfDoc.getPage(pageNumber).then((page) => {
      if (isCancelled) return;

      const viewport = page.getViewport({ scale: 1.35 });
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

        // Render PDF Text Selection Layer on top of canvas
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
  }, [pdfDoc, pageNumber]);

  const currentSegment = segments[pageNumber - 1] ?? segments[0];

  return (
    <div className="pdf-slide-container" ref={containerRef} onMouseUp={onMouseUp}>
      {loading && (
        <div className="pdf-loading-spinner">
          ⏳ Đang tải Slide PDF bài giảng VinUniversity...
        </div>
      )}

      <div
        className="pdf-page-wrapper"
        data-segment-code={currentSegment?.code || `T01-${String(pageNumber).padStart(3, "0")}`}
      >
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="pdf-text-layer textLayer" />
      </div>
    </div>
  );
}
