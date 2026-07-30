import { useRef, useState, useCallback } from "react";
import AITutorDrawer from "./AITutorDrawer.jsx";
import PdfSlideViewer from "./PdfSlideViewer.jsx";

const INITIAL_TOOLBAR = { visible: false, x: 0, y: 0, text: "", codes: [] };

export default function TranscriptReader({
  lessons,
  currentLesson,
  onSelectLesson,
  onCheckComprehension,
  onBack,
}) {
  const containerRef = useRef(null);
  const [toolbar, setToolbar] = useState(INITIAL_TOOLBAR);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPassageForDrawer, setSelectedPassageForDrawer] = useState(null);
  const [activeTab, setActiveTab] = useState("read"); // read | pen | highlight
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [numPdfPages, setNumPdfPages] = useState(55);

  const handlePrevSlide = () => {
    setCurrentPageIndex((prev) => Math.max(1, prev - 1));
    setToolbar(INITIAL_TOOLBAR);
  };

  const handleNextSlide = () => {
    setCurrentPageIndex((prev) => Math.min(numPdfPages, prev + 1));
    setToolbar(INITIAL_TOOLBAR);
  };

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    const container = containerRef.current;

    if (!text || !container || selection.rangeCount === 0) {
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
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      text,
      codes,
    });
  }, [currentLesson, currentPageIndex]);

  const handleCheckClick = () => {
    onCheckComprehension({ passageText: toolbar.text, segmentCodes: toolbar.codes });
    setToolbar(INITIAL_TOOLBAR);
    window.getSelection()?.removeAllRanges();
  };

  const handleAskTutorClick = () => {
    setSelectedPassageForDrawer({ text: toolbar.text, codes: toolbar.codes });
    setIsDrawerOpen(true);
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

        <div className="reader-topbar__right">
          <span className="lang-picker">VI</span>
          <button type="button" className="icon-btn">🌙</button>
        </div>
      </div>

      {/* Main Two-Column Reader Layout */}
      <div className="reader-body">
        {/* Left Sidebar: Học liệu môn học */}
        <aside className="reader-sidebar">
          <div className="reader-sidebar__header">
            <h3>📖 Học liệu môn học</h3>
            <p>Chương, slide và tài liệu đã upload</p>
          </div>

          <div className="reader-sidebar__list">
            {lessons.map((item, idx) => {
              const isSelected = item.id === currentLesson.id;
              return (
                <div
                  key={item.id}
                  className={`sidebar-day-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    onSelectLesson(item.id);
                    setCurrentPageIndex(1);
                  }}
                >
                  <div className="sidebar-day-item__title-row">
                    <span className="play-icon">▶</span>
                    <div>
                      <strong>Day{String(idx + 1).padStart(2, "0")}</strong>
                      <span className="doc-count">
                        1 TÀI LIỆU PDF · PUBLISHED
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="sidebar-doc-active">
                      <span className="badge-studying">STUDYING</span>
                      <div className="sidebar-doc-link">
                        📘 AI Research to AI Products.pdf
                        <span className="page-count">{numPdfPages} trang slide PDF</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Main Workspace Canvas */}
        <main className="reader-canvas">
          {/* Reader Top Controls Toolbar with Slide Page Navigation */}
          <div className="canvas-toolbar">
            <div className="canvas-toolbar__tools">
              <button
                type="button"
                className={`tool-btn ${activeTab === "read" ? "is-active" : ""}`}
                onClick={() => setActiveTab("read")}
              >
                👁 Đọc
              </button>
              <button
                type="button"
                className={`tool-btn ${activeTab === "pen" ? "is-active" : ""}`}
                onClick={() => setActiveTab("pen")}
              >
                ✏️ Bút
              </button>
              <button
                type="button"
                className={`tool-btn ${activeTab === "highlight" ? "is-active" : ""}`}
                onClick={() => setActiveTab("highlight")}
              >
                🖍 Highlight
              </button>
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
                  onClick={handleCheckClick}
                >
                  ⚡ Kiểm tra hiểu thật
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--tutor"
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
      </div>

      {/* Floating AI Tutor Icon on Right Margin */}
      <button
        type="button"
        className="floating-ai-tutor-trigger"
        onClick={() => {
          setSelectedPassageForDrawer(null);
          setIsDrawerOpen(!isDrawerOpen);
        }}
        title="Mở VLearn Tutor AI"
      >
        🤖
      </button>

      {/* AI Tutor Side Drawer */}
      {isDrawerOpen && (
        <AITutorDrawer
          lesson={currentLesson}
          selectedPassage={selectedPassageForDrawer}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
}
