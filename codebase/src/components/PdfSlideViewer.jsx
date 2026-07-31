import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

let cachedPdfDoc = null;

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

// Academic PowerPoint Presentation 16:9 Slide Card — for PPTX files
function PptxSlideCard({ slide, totalSlides, isTarget }) {
  const pageNum = slide.slide_index;
  const rawText = slide.full_text || "";
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const displayTitle = slide.title || lines[0] || `Trang Slide ${pageNum}`;
  const bodyLines = slide.title && lines[0] === slide.title ? lines.slice(1) : lines;

  return (
    <div
      id={`slide-page-${pageNum}`}
      className={`pdf-single-page-card ${isTarget ? "is-active-target-page" : ""}`}
      style={{ width: "100%", maxWidth: "920px", marginBottom: "2rem", scrollMarginTop: "20px" }}
    >
      <div
        style={{
          width: "100%",
          minHeight: "480px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          borderRadius: "18px",
          border: isTarget ? "3px solid var(--vlearn-red)" : "1px solid rgba(255,255,255,0.12)",
          boxShadow: isTarget ? "0 12px 36px rgba(185,28,28,0.25)" : "0 8px 30px rgba(15,23,42,0.2)",
          padding: "2rem 2.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#FFFFFF",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.85rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ background: "var(--vlearn-red)", color: "#FFF", fontWeight: 800, fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "4px", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>
              POWERPOINT SLIDE
            </span>
            <span style={{ fontSize: "0.82rem", color: "#94A3B8", fontWeight: 600 }}>Bài giảng PowerPoint Gốc</span>
          </div>
          <div style={{ background: isTarget ? "var(--vlearn-red)" : "rgba(255,255,255,0.1)", color: "#FFF", padding: "0.25rem 0.85rem", borderRadius: "999px", fontWeight: 800, fontSize: "0.82rem", fontFamily: "var(--font-heading)" }}>
            Slide <strong>{pageNum}</strong> / {totalSlides}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 800, color: "#38BDF8", lineHeight: 1.3, margin: 0 }}>
            {displayTitle}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "0.5rem" }}>
            {bodyLines.length > 0 ? bodyLines.map((line, idx) => (
              <div key={idx} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "0.75rem 1.25rem", display: "flex", alignItems: "flex-start", gap: "0.85rem", fontSize: "0.93rem", lineHeight: "1.6", color: "#F1F5F9", fontFamily: "var(--font-body)" }}>
                <span style={{ color: "var(--vlearn-red)", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>•</span>
                <div style={{ flex: 1 }}>{line}</div>
              </div>
            )) : (
              <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "0.9rem" }}>
                (Slide chứa hình vẽ / sơ đồ đồ họa PowerPoint)
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#64748B", fontFamily: "var(--font-heading)", fontWeight: 600 }}>
          <span>🎓 VLEARN AI TUTOR • POWERPOINT ACADEMIC CANVAS</span>
          <span>SLIDE {pageNum} OF {totalSlides}</span>
        </div>
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
    if (!pdfUrl) {
      setPdfDoc(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    fetch(pdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (isCancelled) return null;
        return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      })
      .then((doc) => {
        if (!doc || isCancelled) return;
        setPdfDoc(doc);
        setLoading(false);
        if (onNumPages) onNumPages(doc.numPages);
      })
      .catch((err) => {
        console.warn("Native PDF canvas load failed (PPTX mode or unavailable file):", err);
        if (!isCancelled) {
          setPdfDoc(null);
          setLoading(false);
        }
      });

    return () => { isCancelled = true; };
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
        /* Render PowerPoint 16:9 Presentation Canvas Cards */
        <div className="pdf-vertical-pages-list">
          {backendSlides.map((slide) => (
            <PptxSlideCard
              key={slide.id || slide.slide_index}
              slide={slide}
              totalSlides={backendSlides.length}
              isTarget={slide.slide_index === activePageNum}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
