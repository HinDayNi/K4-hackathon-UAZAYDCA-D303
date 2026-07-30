export default function DashboardView({ onOpenCourse }) {
  return (
    <div className="vlearn-page vlearn-page--dashboard">
      {/* Crisp Architectural Campus Background Image Overlay */}
      <div className="vlearn-bg-image-overlay"></div>

      {/* Hero Welcome Banner - text overlaid directly on the campus photo */}
      <div className="vlearn-hero-sec">
        <div className="vlearn-hero-sec__badge">
          <span>🏛️</span> VLEARN · VINUNI AI THỰC CHIẾN
        </div>

        <h1 className="vlearn-hero-sec__title">
          Chào mừng trở lại, <span className="gold-text">NGUYỄN VĂN A!</span>
        </h1>

        <p className="vlearn-hero-sec__desc">
          VLearn đang tổng hợp tiến độ đọc và tín hiệu học tập của bạn. Mở khóa học để tiếp tục bài học hoặc
          trò chuyện cùng VLearn AI Tutor.
        </p>

        <div className="vlearn-hero-sec__pills">
          <span className="hero-pill hero-pill--active">
            <span className="dot"></span> Tín hiệu học tập đang hoạt động
          </span>
          <span className="hero-pill">📖 Đã đọc 0/6 buổi học (0%)</span>
          <span className="hero-pill">🎓 1 khóa học đang theo học</span>
        </div>
      </div>

      {/* Không gian học tập VLearn Section */}
      <div className="vlearn-academic-sec">
        <div className="sec-header">
          <span className="sec-header__meta">VINUNIVERSITY ACADEMIC DASHBOARD</span>
          <h2 className="sec-header__title">Không gian học tập VLearn</h2>
        </div>

        {/* Feature Showcase: AI Tutor & Mindmap - our flagship upgrades */}
        <div className="vlearn-grid-2 feature-showcase-grid">
          <div className="glass-card feature-card" onClick={onOpenCourse}>
            <div className="feature-card__badge">🤖 AI TUTOR & KIỂM TRA HIỂU THẬT</div>
            <h3>Trợ lý VLearn AI Tutor</h3>
            <p>
              Tự động hỏi đáp bám sát transcript bài giảng, sinh câu hỏi tình huống kiểm tra tư duy thực tế và
              trích dẫn mã đoạn [Txx-NNN]. Bạn đã có 12 lượt tương tác gần đây.
            </p>
            <button type="button" className="btn-feature-link">
              Trải nghiệm AI Tutor →
            </button>
          </div>

          {/* Mindmap showcase card - informational only, no standalone popup button */}
          <div className="glass-card feature-card feature-card--mindmap" onClick={onOpenCourse}>
            <div className="feature-card__badge feature-card__badge--gold">🗺️ MINDMAP & GAP MAP</div>
            <h3>Sơ đồ Tư duy & Lỗ hổng Kiến thức</h3>
            <p>
              Hệ thống hóa toàn bộ 6 buổi học thành một sơ đồ tư duy trực quan, tự động định vị điểm kiến thức
              bạn cần củng cố ngay tức thì. Mở khóa học để xem sơ đồ trong lúc học cùng VLearn AI Tutor.
            </p>
          </div>
        </div>

        {/* Course Banner Row */}
        <div className="glass-card course-main-banner" onClick={onOpenCourse}>
          <div className="course-main-banner__left">
            <div className="course-icon">🎓</div>
            <div>
              <h3>COMP2010 - AI Product Thinking</h3>
              <p>Mở khóa học để đọc bài giảng, xem sơ đồ tư duy và kiểm tra hiểu thật cùng VLearn AI Tutor.</p>
            </div>
          </div>
          <button type="button" className="btn-red-pill">
            Xem lớp học →
          </button>
        </div>
      </div>
    </div>
  );
}
