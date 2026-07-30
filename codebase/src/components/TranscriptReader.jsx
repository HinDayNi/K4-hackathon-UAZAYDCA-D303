import { useRef, useState, useCallback, useEffect } from "react";
import AITutorDrawer from "./AITutorDrawer.jsx";
import PdfSlideViewer from "./PdfSlideViewer.jsx";
import MindmapSideView from "./MindmapSideView.jsx";

const INITIAL_TOOLBAR = { visible: false, x: 0, y: 0, text: "", codes: [] };

export default function TranscriptReader({
  lessons,
  currentLesson,
  onSelectLesson,
  onCheckComprehension,
  onBack,
}) {
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [toolbar, setToolbar] = useState(INITIAL_TOOLBAR);
  const [rightPanelMode, setRightPanelMode] = useState("none"); // "none" | "chat" | "mindmap"
  const [rightPanelWidth, setRightPanelWidth] = useState(420); // Resizable width in px
  const [selectedPassageForDrawer, setSelectedPassageForDrawer] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [numPdfPages, setNumPdfPages] = useState(55);

  const handlePrevSlide = useCallback(() => {
    setCurrentPageIndex((prev) => Math.max(1, prev - 1));
    setToolbar(INITIAL_TOOLBAR);
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentPageIndex((prev) => Math.min(numPdfPages, prev + 1));
    setToolbar(INITIAL_TOOLBAR);
  }, [numPdfPages]);

  // Keyboard Arrow Left & Right listener for automatic slide switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        handlePrevSlide();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        handleNextSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevSlide, handleNextSlide]);

  // Mouse Drag Handle Resizer logic for expanding/collapsing right panel width
  const handleMouseDownResize = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (event) => {
      if (!isDraggingRef.current) return;
      const newWidth = window.innerWidth - event.clientX;
      if (newWidth >= 280 && newWidth <= 850) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUpResize = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "default";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUpResize);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUpResize);
  };

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      const container = containerRef.current;

      if (!text || text.length < 2 || !container || selection.rangeCount === 0) {
        setToolbar(INITIAL_TOOLBAR);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setToolbar(INITIAL_TOOLBAR);
        return;
      }

      const currentCode = currentLesson?.segments[currentPageIndex - 1]?.code || `T01-${String(currentPageIndex).padStart(3, "0")}`;
      const codes = [currentCode];

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setToolbar({
        visible: true,
        x: Math.max(80, rect.left - containerRect.left + rect.width / 2),
        y: Math.max(30, rect.top - containerRect.top),
        text,
        codes,
      });
    }, 10);
  }, [currentLesson, currentPageIndex]);

  const handleCheckClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onCheckComprehension({ passageText: toolbar.text, segmentCodes: toolbar.codes });
    setToolbar(INITIAL_TOOLBAR);
    window.getSelection()?.removeAllRanges();
  };

  const handleAskTutorClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPassageForDrawer({
      text: toolbar.text,
      codes: toolbar.codes,
      ts: Date.now(),
    });
    setRightPanelMode("chat");
    setToolbar(INITIAL_TOOLBAR);
    window.getSelection()?.removeAllRanges();
  };

  if (!currentLesson) return null;

  return (
    <div className="reader-workspace">
      {/* Top Document Header Bar */}
      <div className="reader-topbar">
        <div className="reader-topbar__left">
          <button type="button" className="btn-back" onClick={onBack}>
            ‹
          </button>
          <div className="vlearn-logo vlearn-logo--sm">
            <img src="/vinuni_logo.png" alt="VinUniversity VLearn" className="vinuni-logo-img-sm" />
          </div>
          <div className="doc-title-badge">
            📘 AI Research to AI Products.pdf
            <span className="doc-meta">COMP2010 · VinUniversity Lecture Material</span>
          </div>
        </div>

        {/* Topbar Right Controls (Cleaned: removed Đóng AI Tutor, VI, 🌙) */}
        <div className="reader-topbar__right">
          <button
            type="button"
            className={`btn-mode-topbar ${rightPanelMode === "mindmap" ? "is-active" : ""}`}
            onClick={() => setRightPanelMode(rightPanelMode === "mindmap" ? "none" : "mindmap")}
          >
            🗺️ Sơ đồ Mindmap
          </button>

          <button
            type="button"
            className={`btn-mode-topbar btn-mode-topbar--red ${rightPanelMode === "chat" ? "is-active" : ""}`}
            onClick={() => setRightPanelMode(rightPanelMode === "chat" ? "none" : "chat")}
          >
            🤖 AI Tutor
          </button>
        </div>
      </div>

      {/* Reader Body with Resizable Side Panel Layout */}
      <div className="reader-body">
        {/* Center Main Workspace Canvas */}
        <main className="reader-canvas">
          {/* Reader Top Controls Toolbar with Keyboard Hints */}
          <div className="canvas-toolbar">
            <div className="canvas-toolbar__tools">
              <span className="keyboard-hint-badge">
                ⌨️ Phím <strong>←</strong> <strong>→</strong> để chuyển slide mượt mà
              </span>
            </div>

            <div className="canvas-toolbar__page-info">
              {/* Slide Pagination Toolbar Controls */}
              <div className="slide-top-nav">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={handlePrevSlide}
                  disabled={currentPageIndex === 1}
                >
                  ‹
                </button>

                <span className="slide-page-badge">
                  Slide {currentPageIndex} / {numPdfPages}
                </span>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={handleNextSlide}
                  disabled={currentPageIndex === numPdfPages}
                >
                  ›
                </button>
              </div>

              <div className="zoom-controls">
                <button type="button">-</button>
                <span>100%</span>
                <button type="button">+</button>
              </div>
            </div>
          </div>

          {/* Real PDF Slide Rendering Workspace Canvas */}
          <div className="document-paper-container">
            <PdfSlideViewer
              pdfUrl="/lecture.pdf"
              pageNumber={currentPageIndex}
              onNumPages={(num) => setNumPdfPages(num)}
              containerRef={containerRef}
              onMouseUp={handleMouseUp}
              segments={currentLesson.segments}
            />

            {/* Selection Floating Action Popover Toolbar */}
            {toolbar.visible && (
              <div
                className="selection-floating-toolbar"
                style={{ left: toolbar.x, top: toolbar.y }}
              >
                <button
                  type="button"
                  className="action-btn action-btn--check"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCheckClick}
                >
                  ⚡ Kiểm tra hiểu thật
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--tutor"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleAskTutorClick}
                >
                  💬 Hỏi VLearn Tutor
                </button>
              </div>
            )}

            {/* Slide Pagination Footer Controls */}
            <div className="reader-pagination-footer">
              <button
                type="button"
                className="btn-page-nav-large"
                onClick={handlePrevSlide}
                disabled={currentPageIndex === 1}
              >
                ‹ Slide trước
              </button>

              <span>
                Slide <strong>{currentPageIndex}</strong> / {numPdfPages}
              </span>

              <button
                type="button"
                className="btn-page-nav-large"
                onClick={handleNextSlide}
                disabled={currentPageIndex === numPdfPages}
              >
                Slide tiếp ›
              </button>
            </div>
          </div>
        </main>

        {/* Resizable Split Handle & Right Side Panel (Inline replacing Chatbot with Mindmap) */}
        {rightPanelMode !== "none" && (
          <>
            {/* Drag Handle to Resize Right Panel Width */}
            <div
              className="panel-resizer"
              onMouseDown={handleMouseDownResize}
              title="Kéo thả để mở rộng / thu nhỏ panel"
            >
              <div className="resizer-bar"></div>
            </div>

            <div className="reader-right-panel" style={{ width: `${rightPanelWidth}px` }}>
              {/* Top Mode Tabs inside Right Panel */}
              <div className="right-panel-tabs">
                <button
                  type="button"
                  className={`panel-tab ${rightPanelMode === "chat" ? "is-active" : ""}`}
                  onClick={() => setRightPanelMode("chat")}
                >
                  💬 VLearn AI Tutor
                </button>
                <button
                  type="button"
                  className={`panel-tab ${rightPanelMode === "mindmap" ? "is-active" : ""}`}
                  onClick={() => setRightPanelMode("mindmap")}
                >
                  🗺️ Sơ đồ Mindmap
                </button>
                <button
                  type="button"
                  className="btn-close-panel"
                  onClick={() => setRightPanelMode("none")}
                >
                  ✕
                </button>
              </div>

              {/* Panel Body Switching */}
              <div className="right-panel-content">
                {rightPanelMode === "chat" && (
                  <AITutorDrawer
                    lesson={currentLesson}
                    selectedPassage={selectedPassageForDrawer}
                    onClose={() => setRightPanelMode("none")}
                    onOpenMindmap={() => setRightPanelMode("mindmap")}
                  />
                )}

                {rightPanelMode === "mindmap" && (
                  <MindmapSideView
                    onSelectSlide={(code) => {
                      const idx = currentLesson.segments.findIndex((s) => s.code === code);
                      if (idx >= 0) setCurrentPageIndex(idx + 1);
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating AI Tutor Icon Trigger at Bottom Right */}
      {rightPanelMode === "none" && (
        <button
          type="button"
          className="floating-ai-tutor-trigger"
          onClick={() => setRightPanelMode("chat")}
          title="Mở VLearn Tutor AI"
        >
          🤖
        </button>
      )}
    </div>
  );
}
