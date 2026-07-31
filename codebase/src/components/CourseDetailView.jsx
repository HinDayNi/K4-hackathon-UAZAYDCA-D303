import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function CourseDetailView({ lessons, onOpenLesson }) {
  const { t } = useLanguage();

  return (
    <div className="vlearn-page">
      {/* Sub-Header Section */}
      <div className="vlearn-sec-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="vlearn-kicker">{t("courseKicker")}</span>
          <h1 className="vlearn-page-title" style={{ fontSize: '2rem' }}>{t("courseTitle")}</h1>
          <p className="vlearn-page-sub">{t("courseSub")}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div className="reading-progress-pill">
            <span className="check-icon">✔</span> {t("readProgress", 0, lessons.length)}
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <span className="progress-percent">0%</span>
          </div>

          <button
            type="button"
            className="btn-start-reading"
            onClick={() => onOpenLesson(lessons[0]?.id)}
          >
            {t("startReading")}
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
              <span className="badge-tag">{t("dayBadgeLabel")}</span>
              <span className="badge-num">{String(idx + 1).padStart(2, "0")}</span>
            </div>

            <div className="day-accordion-info">
              <h3>{lesson.id}</h3>
              <p>{t("dayNotDone")} · {t("slideCount")}</p>
            </div>

            <div className="day-chevron">⌄</div>
          </div>
        ))}
      </div>
    </div>
  );
}
