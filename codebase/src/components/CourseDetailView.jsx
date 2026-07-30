export default function CourseDetailView({ lessons, onOpenLesson }) {
  return (
    <div className="vlearn-page">
      <div className="page-header">
        <div className="page-header__meta">VLEARN · VINUNI AI THỰC CHIẾN</div>
        <div className="page-header__title-row">
          <h1 className="page-header__title">COMP2010 - Khoá 3 + 4 Phase 1</h1>
          <div className="page-header__actions">
            <span className="reading-progress">
              ✓ Đã đọc 0/6 ngày <div className="progress-bar-inline"><div className="progress-fill" style={{ width: '0%' }}></div></div> 0%
            </span>
            <button
              type="button"
              className="btn-start-reading"
              onClick={() => lessons[0] && onOpenLesson(lessons[0].id)}
            >
              Bắt đầu đọc
            </button>
          </div>
        </div>
        <p className="page-header__subtitle">1074 học viên cùng lớp</p>
      </div>

      <div className="days-list">
        {lessons.map((lesson, idx) => (
          <div
            key={lesson.id}
            className="day-accordion-card"
            onClick={() => onOpenLesson(lesson.id)}
          >
            <div className="day-badge">
              <span className="day-badge__label">DAY</span>
              <span className="day-badge__num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-info">
              <h3 className="day-title">{lesson.id} — {lesson.title}</h3>
              <p className="day-subtext">Chưa hoàn thành ngày học · {lesson.segments.length} đoạn kiến thức</p>
            </div>

            <div className="day-arrow">
              <span>chevron_down</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
