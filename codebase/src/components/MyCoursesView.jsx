export default function MyCoursesView({ onSelectCourse }) {
  const daysList = [
    { id: "Day01", title: "Day01", slides: "2 slide", status: "Chưa hoàn thành ngày học" },
    { id: "Day02", title: "Day02", slides: "1 slide", status: "Chưa hoàn thành ngày học" },
    { id: "Day03", title: "Day03", slides: "1 slide", status: "Chưa hoàn thành ngày học" },
    { id: "Day04", title: "Day04", slides: "1 slide", status: "Chưa hoàn thành ngày học" },
    { id: "Day05", title: "Day05", slides: "1 slide", status: "Chưa hoàn thành ngày học" },
    { id: "Day06", title: "Day06", slides: "1 slide", status: "Chưa hoàn thành ngày học" },
  ];

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
          <div className="reading-progress-pill">
            <span className="check-icon">✔</span> Đã đọc 0/6 ngày
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <span className="progress-percent">0%</span>
          </div>

          <button
            type="button"
            className="btn-start-reading"
            onClick={onSelectCourse}
          >
            Bắt đầu đọc
          </button>
        </div>
      </div>

      {/* Days Accordion List */}
      <div className="days-accordion-list">
        {daysList.map((day, idx) => (
          <div
            key={day.id}
            className="day-accordion-card"
            onClick={onSelectCourse}
          >
            <div className="day-circle-badge">
              <span className="badge-tag">DAY</span>
              <span className="badge-num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-accordion-info">
              <h3>{day.title}</h3>
              <p>{day.status} · {day.slides}</p>
            </div>

            <div className="day-chevron">
              ⌄
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
