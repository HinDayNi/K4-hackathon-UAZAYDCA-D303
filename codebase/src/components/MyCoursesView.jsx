export default function MyCoursesView({ onSelectCourse }) {
  return (
    <div className="vlearn-page">
      {/* Background Overlay specifically using LF_07127-1-scaled.jpg for Courses */}
      <div className="vlearn-bg-image-overlay--courses"></div>

      <div className="page-header">
        <div className="page-header__meta">VLEARN · VINUNI ACADEMIC COURSES</div>
        <div className="page-header__title-row">
          <h1 className="page-header__title">Khóa học của tôi</h1>
          <span className="badge-pill">1 khóa học đang theo học</span>
        </div>
        <p className="page-header__subtitle">
          Mỗi khóa học lưu trữ tài liệu, giáo án bài giảng và phần ghi chú tương tác cùng VLearn AI.
        </p>
      </div>

      <div className="my-courses-grid">
        <div className="course-card glass-card">
          <div className="course-card__header">
            <div className="course-card__icon">🎓</div>
            <span className="badge-progress">0% đọc</span>
          </div>

          <div className="course-card__code">COMP2010</div>
          <h3 className="course-card__title">AI Product Thinking & Requirements</h3>
          <p className="course-card__desc">Khóa học VinUni AI Thực Chiến — Khoá 3 + 4 Phase 1</p>

          <div className="course-card__status">
            <span className="status-text">⚡ Sẵn sàng học với VLearn AI Tutor</span>
          </div>

          <div className="course-card__actions">
            <button type="button" className="btn-secondary">
              📓 Sổ tay học tập
            </button>
            <button
              type="button"
              className="btn-primary-link"
              onClick={onSelectCourse}
            >
              Mở khóa học →
            </button>
          </div>
        </div>
      </div>

      <div className="notebook-banner glass-card" onClick={onSelectCourse}>
        <div className="notebook-banner__left">
          <div className="stat-card__icon">📓</div>
          <div>
            <h4>Sổ tay học tập & Ghi chú tương tác</h4>
            <p>Ghi chú, flashcard và các điểm kiến thức AI phát hiện cần củng cố của bạn.</p>
          </div>
        </div>
        <span className="arrow-btn">→</span>
      </div>
    </div>
  );
}
