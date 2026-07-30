export default function DashboardView({ onOpenCourse }) {
  return (
    <div className="vlearn-page vlearn-page--dashboard">
      {/* Top Academic Sub-Header Section */}
      <div className="vlearn-sec-header">
        <div>
          <span className="vlearn-kicker">VLEARN · VINUNI AI THỰC CHIẾN</span>
          <h1 className="vlearn-page-title">Không gian học tập VLearn</h1>
          <p className="vlearn-page-sub">Theo dõi tiến độ, học liệu và phần kiến thức cần củng cố tại VinUni AI Thực Chiến.</p>
        </div>
        <div className="course-counter-pill">
          1 khóa học đang theo học
        </div>
      </div>

      {/* Hero Welcome Card with Slanted Red Accent Banner */}
      <div className="vlearn-hero-card">
        <div className="vlearn-hero-card__content">
          <span className="vlearn-kicker">VLEARN · VINUNI AI THỰC CHIẾN</span>
          <h2 className="vlearn-welcome-heading">
            Chào mừng trở lại, NGUYỄN THỊ THANH HIỀN!
          </h2>
          <p className="vlearn-welcome-desc">
            VLearn đang tổng hợp tiến độ đọc và các tín hiệu học tập. Mở Khóa học của tôi để tiếp tục ngày học hoặc trao đổi cùng VLearn Tutor.
          </p>
        </div>

        {/* Signature Slanted Red Right Edge Accent */}
        <div className="vlearn-hero-card__red-accent"></div>
      </div>

      {/* Course Main Banner Row */}
      <div className="vlearn-academic-sec">
        <div className="glass-card course-main-banner" onClick={onOpenCourse}>
          <div className="course-main-banner__left">
            <div className="course-badge-tag">COMP2010</div>
            <div>
              <h3>COMP2010 - AI Product Thinking</h3>
              <p>Mở khóa học của tôi để xem bài giảng slide, sơ đồ tư duy Mindmap và kiểm tra hiểu thật cùng VLearn Tutor.</p>
            </div>
          </div>
          <button type="button" className="btn-feature-link" style={{ background: '#C5221F', borderColor: '#C5221F' }}>
            Xem lớp học →
          </button>
        </div>
      </div>
    </div>
  );
}
