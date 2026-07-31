export default function CourseDetailView({ lessons, onOpenLesson }) {
  return (
    <div className="vlearn-page">
      {/* Sub-Header Section */}
      <div className="vlearn-sec-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="vlearn-kicker">VLEARN · VINUNI AI THỰC CHIẾN</span>
          <h1 className="vlearn-page-title" style={{ fontSize: '2rem' }}>COMP2010 - Khoá 3 + 4 Phase 1</h1>
          <p className="vlearn-page-sub">1074 học viên cùng lớp</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            className="btn-start-reading"
            onClick={() => onOpenLesson(lessons[0]?.id)}
          >
            Bắt đầu đọc
          </button>
        </div>
      </div>

      {/* Days Accordion List */}
      <div className="days-accordion-list">
        {lessons.map((lesson, idx) => (
          <div
            key={lesson.id}
            className="day-accordion-card"
            onClick={() => onOpenLesson(lesson.id)}
          >
            <div className="day-circle-badge">
              <span className="badge-tag">BÀI</span>
              <span className="badge-num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-accordion-info">
              <h3>{lesson.title.startsWith("Day") ? lesson.title : `Bài ${String(idx + 1).padStart(2, "0")}: ${lesson.title}`}</h3>
              <p>{lesson.slideCount ? `${lesson.slideCount} trang slide bài giảng` : "Slide bài giảng"} • AI tự phân tích sơ đồ Mindmap & RAG</p>
            </div>

            <div className="day-chevron">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
