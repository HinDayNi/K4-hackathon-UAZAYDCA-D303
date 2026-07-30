import { useState } from "react";
import MindmapModal from "./MindmapModal.jsx";

export default function DashboardView({ onOpenCourse, onOpenLesson }) {
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);

  return (
    <div className="vlearn-page vlearn-page--dashboard">
      {/* Crisp Architectural Campus Background Image Overlay */}
      <div className="vlearn-bg-image-overlay"></div>

      {/* Hero Welcome Banner */}
      <div className="vlearn-hero-sec">
        <div className="vlearn-hero-sec__badge">
          <span>🏛️</span> VINUNI AI THỰC CHIẾN - KHÓA 3 + 4
        </div>

        <h1 className="vlearn-hero-sec__title">
          Chào mừng trở lại, <span className="gold-text">NGUYỄN VĂN A!</span>
        </h1>

        <p className="vlearn-hero-sec__desc">
          Hệ thống AI Tutor & Học tập Thích ứng VinUniversity đang tổng hợp tiến độ đọc và tín hiệu học tập của bạn.
        </p>

        <div className="vlearn-hero-sec__pills">
          <span className="hero-pill hero-pill--active">
            <span className="dot"></span> Tín hiệu học tập đang hoạt động
          </span>
          <span className="hero-pill">
            📖 Đã đọc 0/6 ngày học (0%)
          </span>
          <span className="hero-pill">
            💡 Student ID: 26AI-0880
          </span>
        </div>
      </div>

      {/* Không gian học tập VLearn Section */}
      <div className="vlearn-academic-sec">
        <div className="sec-header">
          <span className="sec-header__meta">VLEARN - VINUNI ACADEMIC DASHBOARD</span>
          <h2 className="sec-header__title">Không gian học tập VLearn</h2>
        </div>

        {/* Stats Row */}
        <div className="vlearn-grid-2">
          <div className="glass-card stat-item" onClick={onOpenCourse}>
            <div className="stat-item__icon">📖</div>
            <div>
              <span className="stat-item__label">KHÓA HỌC ĐANG THEO HỌC</span>
              <span className="stat-item__val">1 Môn học</span>
            </div>
          </div>

          <div className="glass-card stat-item" onClick={onOpenCourse}>
            <div className="stat-item__icon">💬</div>
            <div>
              <span className="stat-item__label">CÂU HỎI VỚI AI TUTOR</span>
              <span className="stat-item__val">12 Lượt tương tác</span>
            </div>
          </div>
        </div>

        {/* Feature Showcase Grid: AI Tutor & Mindmap */}
        <div className="vlearn-grid-2 feature-showcase-grid">
          {/* AI Tutor Feature Box */}
          <div className="glass-card feature-card" onClick={onOpenCourse}>
            <div className="feature-card__badge">🤖 AI TUTOR & KIỂM TRA HIỂU THẬT</div>
            <h3>Trợ lý VLearn AI Tutor</h3>
            <p>
              Tự động hỏi đáp bám sát transcript bài giảng, sinh câu hỏi tình huống kiểm tra tư duy thực tế và trích dẫn mã đoạn [Txx-NNN].
            </p>
            <button type="button" className="btn-feature-link">
              Trải nghiệm AI Tutor →
            </button>
          </div>

          {/* Mindmap Feature Box */}
          <div
            className="glass-card feature-card feature-card--mindmap"
            onClick={() => setIsMindmapOpen(true)}
          >
            <div className="feature-card__badge feature-card__badge--gold">🗺️ MINDMAP & GAP MAP</div>
            <h3>Sơ đồ Tư duy & Lỗ hổng Kiến thức</h3>
            <p>
              Hệ thống hóa sơ đồ tư duy 6 ngày học, phân tích tín hiệu thắc mắc và định vị điểm kiến thức cần củng cố ngay tức thì.
            </p>
            <button type="button" className="btn-feature-link btn-feature-link--gold">
              Mở Sơ đồ Mindmap →
            </button>
          </div>
        </div>

        {/* Course Banner Row */}
        <div className="glass-card course-main-banner" onClick={onOpenCourse}>
          <div className="course-main-banner__left">
            <div className="course-icon">🎓</div>
            <div>
              <h3>COMP2010 - AI Product Thinking & Requirements</h3>
              <p>Mở khóa học để đọc bài giảng, xem sơ đồ tư duy và kiểm tra hiểu thật cùng VLearn AI Tutor.</p>
            </div>
          </div>
          <button type="button" className="btn-red-pill">
            Xem lớp học →
          </button>
        </div>
      </div>

      {/* Interactive Mindmap Popup Modal */}
      {isMindmapOpen && (
        <MindmapModal
          onClose={() => setIsMindmapOpen(false)}
          onOpenLesson={(lessonId) => {
            setIsMindmapOpen(false);
            onOpenLesson(lessonId);
          }}
        />
      )}
    </div>
  );
}
