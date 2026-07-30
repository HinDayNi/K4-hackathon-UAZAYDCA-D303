export default function MyCoursesView({ onSelectCourse }) {
  return (
    <div className="vlearn-page">
      <div className="page-header">
        <div className="page-header__meta">VLEARN · VINUNI AI THỰC CHIẾN</div>
        <div className="page-header__title-row">
          <h1 className="page-header__title">Khóa học của tôi</h1>
          <span className="badge-pill">1 khóa học đang theo học</span>
        </div>
        <p className="page-header__subtitle">
          Mỗi khóa học lưu trữ tài liệu, giáo án và phần ghi chú tương tác của riêng bạn.
        </p>
      </div>

      <div className="my-courses-grid">
        <div className="course-card">
          <div className="course-card__header">
            <div className="course-card__icon">📖</div>
            <span className="badge-progress">0% đọc</span>
          </div>

          <div className="course-card__code">COMP2010</div>
          <h3 className="course-card__title">Khoá 3 + 4 Phase 1</h3>
          <p className="course-card__desc">Khóa học Khoá 3 + 4 Phase 1</p>

          <div className="course-card__status">
            <span className="status-text">⚡ Sẵn sàng học</span>
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

      <div className="notebook-banner">
        <div className="notebook-banner__left">
          <div className="stat-card__icon">📓</div>
          <div>
            <h4>Sổ tay học tập</h4>
            <p>Ghi chú, flashcard và phần kiến thức cần củng cố của bạn.</p>
          </div>
        </div>
        <span className="arrow-btn">→</span>
      </div>
    </div>
  );
}
