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
  backendSlides = null,
}) {
  const [pdfDoc, setPdfDoc] = useState(cachedPdfDoc);
  const [loading, setLoading] = useState(!cachedPdfDoc && !backendSlides);
  const [activePageNum, setActivePageNum] = useState(targetPageNumber);

  // Load PDF Document when pdfUrl changes
  useEffect(() => {
    if (!pdfUrl) return;

    let isCancelled = false;
    setLoading(true);

    pdfjsLib.getDocument(pdfUrl).promise
      .then((doc) => {
        if (!isCancelled) {
          setPdfDoc(doc);
          setLoading(false);
          if (onNumPages) onNumPages(doc.numPages);
        }
      })
      .catch((err) => {
        console.warn("Native PDF not available (PPTX mode or unavailable file):", err);
        if (!isCancelled) {
          setPdfDoc(null);
          setLoading(false);
        }
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

  const numPages = pdfDoc ? pdfDoc.numPages : (backendSlides ? backendSlides.length : 55);
  const pagesList = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div
      className="pdf-continuous-scroll-workspace"
      ref={containerRef}
      onMouseUp={onMouseUp}
    >
      {loading && (
        <div className="pdf-loading-spinner">
          ⏳ Đang tải toàn bộ Slide bài giảng...
        </div>
      )}

      {/* Render Native PDF Canvas if PDF file loaded */}
      {pdfDoc ? (
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
      ) : backendSlides && backendSlides.length > 0 ? (
        /* Render Backend Slide Cards if PPTX or extracted text */
        <div className="pdf-vertical-pages-list">
          {backendSlides.map((slide) => {
            const pageNum = slide.slide_index;
            const isTarget = pageNum === activePageNum;
            return (
              <div
                key={slide.id || pageNum}
                id={`slide-page-${pageNum}`}
                className={`pdf-single-page-card ${isTarget ? "is-active-target-page" : ""}`}
                style={{
                  padding: "2rem",
                  marginBottom: "1.5rem",
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: isTarget ? "2px solid var(--vlearn-red)" : "1px solid #E2E8F0",
                  boxShadow: isTarget ? "0 8px 24px rgba(185, 28, 28, 0.12)" : "0 4px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  className="pdf-page-number-tag"
                  style={{
                    display: "inline-block",
                    background: isTarget ? "var(--vlearn-red)" : "#F1F5F9",
                    color: isTarget ? "#FFFFFF" : "#475569",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                  }}
                >
                  Slide <strong>{pageNum}</strong> / {backendSlides.length}
                </div>

                {slide.title && (
                  <h3
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "#0F172A",
                      marginBottom: "1rem",
                      borderBottom: "1px solid #F1F5F9",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    {slide.title}
                  </h3>
                )}

                <div
                  className="backend-slide-content"
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: "1.75",
                    color: "#334155",
                    whiteSpace: "pre-line",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {slide.full_text}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
