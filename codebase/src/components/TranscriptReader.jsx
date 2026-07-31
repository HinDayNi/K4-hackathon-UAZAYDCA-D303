import { useRef, useState, useCallback, useEffect } from "react";
import AITutorDrawer from "./AITutorDrawer.jsx";
import PdfSlideViewer from "./PdfSlideViewer.jsx";
import MindmapSideView from "./MindmapSideView.jsx";
import { fetchSlides } from "../services/apiClient.js";

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
  const [rightPanelMode, setRightPanelMode] = useState("mindmap"); // Mặc định mở Sơ đồ Mindmap side-by-side
  const [rightPanelWidth, setRightPanelWidth] = useState(450); // Chiều rộng vừa đẹp cho sơ đồ tư duy
  const [selectedPassageForDrawer, setSelectedPassageForDrawer] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [numPdfPages, setNumPdfPages] = useState(55);
  const [backendSlides, setBackendSlides] = useState(null);

  useEffect(() => {
    if (currentLesson?.id) {
      setBackendSlides(null);
      fetchSlides(currentLesson.id).then((slides) => {
        if (slides && slides.length > 0) {
          setBackendSlides(slides);
          setNumPdfPages(slides.length);
          setCurrentPageIndex(1);
        }
      });
    }
  }, [currentLesson?.id]);

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
            Quay lại
          </button>
        </div>
      </div>

      {/* Reader Body with Resizable Side Panel Layout */}
      <div className="reader-body">
        {/* Center Main Workspace Canvas */}
        <main className="reader-canvas">
          {/* Continuous Vertical Scroll PDF Slide Rendering Canvas */}
          <div className="document-paper-container">
            <PdfSlideViewer
              pdfUrl={currentLesson?.fileType === "pdf" ? (currentLesson.fileUrl || `http://127.0.0.1:8000/api/v1/decks/${currentLesson.id}/file`) : null}
              targetPageNumber={currentPageIndex}
              onNumPages={(num) => setNumPdfPages(num)}
              containerRef={containerRef}
              onMouseUp={handleMouseUp}
              segments={currentLesson.segments}
              backendSlides={backendSlides}
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`panel-tab ${rightPanelMode === "mindmap" ? "is-active" : ""}`}
                    onClick={() => setRightPanelMode("mindmap")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    Sơ đồ Mindmap
                  </button>

                  <button
                    type="button"
                    className={`panel-tab ${rightPanelMode === "chat" ? "is-active" : ""}`}
                    onClick={() => setRightPanelMode("chat")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    VLearn AI Tutor
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-close-panel"
                  onClick={() => setRightPanelMode("none")}
                  title="Thu gọn khung side-by-side"
                >
                  ✕
                </button>
              </div>

              {/* Panel Body Switching */}
              <div className="right-panel-content">
                {rightPanelMode === "mindmap" && (
                  <MindmapSideView
                    deckId={currentLesson?.id}
                    onSelectSlide={(code) => {
                      if (typeof code === "number") {
                        setCurrentPageIndex(code);
                        return;
                      }
                      const match = String(code).match(/\d+/);
                      if (match) {
                        const pageNum = parseInt(match[0], 10);
                        if (pageNum >= 1 && pageNum <= numPdfPages) {
                          setCurrentPageIndex(pageNum);
                          return;
                        }
                      }
                      const idx = currentLesson.segments.findIndex((s) => s.code === code);
                      if (idx >= 0) setCurrentPageIndex(idx + 1);
                    }}
                  />
                )}

                {rightPanelMode === "chat" && (
                  <AITutorDrawer
                    lesson={currentLesson}
                    selectedPassage={selectedPassageForDrawer}
                    onClose={() => setRightPanelMode("none")}
                    onOpenMindmap={() => setRightPanelMode("mindmap")}
                    onJumpToSlide={(code) => {
                      const match = String(code).match(/\d+/);
                      if (match) {
                        const pageNum = parseInt(match[0], 10);
                        if (pageNum >= 1 && pageNum <= numPdfPages) {
                          setCurrentPageIndex(pageNum);
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Trigger Button at Bottom Right when panel is closed */}
      {rightPanelMode === "none" && (
        <button
          type="button"
          className="floating-ai-tutor-trigger"
          onClick={() => setRightPanelMode("mindmap")}
          title="Mở Sơ đồ Mindmap & AI Tutor"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>Sơ đồ Mindmap</span>
        </button>
      )}
    </div>
  );
}
