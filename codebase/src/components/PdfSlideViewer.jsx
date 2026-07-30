import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js Worker using official CDN for reliable cross-browser execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load PDF document on mount or pdfUrl change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    pdfjsLib
      .getDocument(pdfUrl)
      .promise.then((doc) => {
        if (!isCancelled) {
          setPdfDoc(doc);
          setLoading(false);
          if (onNumPages) onNumPages(doc.numPages);
        }
      })
      .catch((err) => {
        console.error("Error loading PDF:", err);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, onNumPages]);

  // Render target PDF Page + Text Selection Overlay Layer
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

  // Fallback segment text for active slide page
  const currentSegment = segments[pageNumber - 1] ?? segments[0];

  return (
    <div className="pdf-slide-container" ref={containerRef} onMouseUp={onMouseUp}>
      {loading && <div className="pdf-loading-spinner">⏳ Đang tải Slide PDF bài giảng VinUniversity...</div>}

      <div
        className="pdf-page-wrapper"
        data-segment-code={currentSegment?.code || `T01-${String(pageNumber).padStart(3, "0")}`}
      >
        <canvas ref={canvasRef} className="pdf-canvas" />
        <div ref={textLayerRef} className="pdf-text-layer textLayer" />
      </div>

      {/* Invisible Segment Code Metadata Anchor for Selection Toolbar */}
      {currentSegment && (
        <div
          data-segment-code={currentSegment.code}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        >
          [{currentSegment.code}] {currentSegment.text}
        </div>
      )}
    </div>
  );
}
