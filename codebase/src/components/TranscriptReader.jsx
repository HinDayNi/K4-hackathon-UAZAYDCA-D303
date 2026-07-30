import { useRef, useState, useCallback, useMemo } from "react";
import AITutorDrawer from "./AITutorDrawer.jsx";

const INITIAL_TOOLBAR = { visible: false, x: 0, y: 0, text: "", codes: [] };
const SEGMENTS_PER_SLIDE = 5; // Group segments into discrete slide pages matching real PDF slides

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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Group all transcript segments of current lesson into Slide Pages (5 segments per slide)
  const slides = useMemo(() => {
    if (!currentLesson || !currentLesson.segments) return [];
    const chunks = [];
    for (let i = 0; i < currentLesson.segments.length; i += SEGMENTS_PER_SLIDE) {
      chunks.push(currentLesson.segments.slice(i, i + SEGMENTS_PER_SLIDE));
    }
    return chunks;
  }, [currentLesson]);

  const activeSlideSegments = slides[currentSlideIndex] ?? [];
  const totalSlides = slides.length || 1;

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
    setToolbar(INITIAL_TOOLBAR);
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
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

    const codes = [...container.querySelectorAll("[data-segment-code]")]
      .filter((node) => range.intersectsNode(node))
      .map((node) => node.dataset.segmentCode);

    if (codes.length === 0) {
      setToolbar(INITIAL_TOOLBAR);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setToolbar({
      visible: true,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      text,
      codes,
    });
  }, []);

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
            📘 {currentLesson.id.toLowerCase()}-ai-product-thinking.pdf
            <span className="doc-meta">COMP2010 · Lecture_material_ms204v3b</span>
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
                    setCurrentSlideIndex(0);
                  }}
                >
                  <div className="sidebar-day-item__title-row">
                    <span className="play-icon">▶</span>
                    <div>
                      <strong>Day{String(idx + 1).padStart(2, "0")}</strong>
                      <span className="doc-count">
                        {item.segments.length > 0 ? "1 TÀI LIỆU" : "0 TÀI LIỆU"} · PUBLISHED
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="sidebar-doc-active">
                      <span className="badge-studying">STUDYING</span>
                      <div className="sidebar-doc-link">
                        📘 {item.id.toLowerCase()}-lecture-slides.pdf
                        <span className="page-count">{item.segments.length} đoạn kiến thức</span>
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
                  disabled={currentSlideIndex === 0}
                >
                  ‹
                </button>

                <span className="slide-page-badge">
                  Slide {currentSlideIndex + 1} / {totalSlides}
                </span>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex === totalSlides - 1}
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

          {/* Slide Document Card View (Dạng Slide Trình Chiếu PDF) */}
          <div className="document-paper-container">
            <div className="slide-card" ref={containerRef} onMouseUp={handleMouseUp}>
              {/* Slide Top Header Banner */}
              <div className="slide-card__header-banner">
                <div className="slide-header-top-row">
                  <div className="vinuni-brand">
                    <img src="/vinuni_logo.png" alt="VinUniversity" className="vinuni-slide-logo" />
                    <span>COMP2010</span>
                  </div>
                  <span className="slide-number-tag">SLIDE {currentSlideIndex + 1} OF {totalSlides}</span>
                </div>

                <h2>AI Product Thinking & Requirements</h2>
                <p className="slide-subtitle">
                  {currentLesson.id} — {currentLesson.title}
                </p>
              </div>

              {/* HAX Rule Banner */}
              <div className="hax-scope-banner">
                💡 <strong>Bôi đen đoạn văn bản:</strong> Chọn một đoạn bất kỳ bên dưới để kích hoạt menu <strong>⚡ Kiểm tra hiểu thật</strong> hoặc <strong>💬 Hỏi VLearn Tutor</strong>.
              </div>

              {/* Segments Text Content of Current Slide */}
              <div className="slide-card__body">
                {activeSlideSegments.map((segment) => (
                  <p
                    key={segment.code}
                    data-segment-code={segment.code}
                    className="segment-paragraph"
                  >
                    <span className="segment-code">[{segment.code}]</span> {segment.text}
                  </p>
                ))}
              </div>

              {/* Slide Card Bottom Footer */}
              <div className="slide-card__footer">
                <span>VinUniversity Phase 1 · Tuần 1 · Bài giảng VLearn</span>
                <span>Trang {currentSlideIndex + 1}</span>
              </div>
            </div>

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
                disabled={currentSlideIndex === 0}
              >
                ‹ Slide trước
              </button>

              <span>
                Slide <strong>{currentSlideIndex + 1}</strong> / {totalSlides}
              </span>

              <button
                type="button"
                className="btn-page-nav-large"
                onClick={handleNextSlide}
                disabled={currentSlideIndex === totalSlides - 1}
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
