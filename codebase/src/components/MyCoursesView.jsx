export default function MyCoursesView({ lessons = [], onSelectCourse }) {
  return (
    <div className="vlearn-page">
      {/* Sub-Header Section */}
      <div className="vlearn-sec-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="vlearn-kicker">VLEARN · VINUNI AI THỰC CHIẾN</span>
          <h1 className="vlearn-page-title" style={{ fontSize: '2rem' }}>Danh sách Bài giảng Slide</h1>
          <p className="vlearn-page-sub">Các bộ Slide bài giảng đã được hệ thống AI xử lý RAG & Sơ đồ Mindmap</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            className="btn-start-reading"
            onClick={() => onSelectCourse && lessons[0] && onSelectCourse(lessons[0].id)}
          >
            Bắt đầu học →
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="days-accordion-list">
        {lessons.map((item, idx) => (
          <div
            key={item.id}
            className="day-accordion-card"
            onClick={() => onSelectCourse && onSelectCourse(item.id)}
          >
            <div className="day-circle-badge">
              <span className="badge-tag">BÀI</span>
              <span className="badge-num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-accordion-info">
              <h3>{item.title.startsWith("Day") ? item.title : `Bài ${String(idx + 1).padStart(2, "0")}: ${item.title}`}</h3>
              <p>{item.slideCount ? `${item.slideCount} trang slide` : "Slide bài giảng"} • Tự động phân tích Mindmap & RAG Tutor</p>
            </div>

            <div className="day-chevron">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
