export default function CourseDetailView({ lessons, onOpenLesson }) {
  return (
    <div className="vlearn-page">
      {/* Background Overlay specifically using LF_07127-1-scaled.jpg for Courses */}
      <div className="vlearn-bg-image-overlay--courses"></div>

      <div className="page-header">
        <div className="page-header__meta">VLEARN · VINUNI ACADEMIC COURSE DETAIL</div>
        <div className="page-header__title-row">
          <h1 className="page-header__title">COMP2010 — AI Product Thinking & Requirements</h1>
          <div className="page-header__actions">
            <span className="reading-progress">
              ✓ Đã đọc 0/6 ngày <div className="progress-bar-inline"><div className="progress-fill" style={{ width: '0%' }}></div></div> 0%
            </span>
          </div>
        </div>
        <p className="page-header__subtitle">1074 học viên cùng lớp · Giảng viên: Dr. Lê Duy Dũng (VinUniversity)</p>
      </div>

      <div className="days-list">
        {lessons.map((lesson, idx) => (
          <div
            key={lesson.id}
            className="day-accordion-card glass-card"
            onClick={() => onOpenLesson(lesson.id)}
          >
            <div className="day-badge">
              <span className="day-badge__label">DAY</span>
              <span className="day-badge__num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-info">
              <h3 className="day-title">{lesson.id} — {lesson.title}</h3>
              <p className="day-subtext">Slide PDF bài giảng VinUniversity · {lesson.segments.length} trang slide & đoạn trích dẫn</p>
            </div>

            <div className="day-arrow">
              <span>➔</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
