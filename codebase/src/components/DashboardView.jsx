import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function DashboardView({ onOpenCourse }) {
  const { t } = useLanguage();

  return (
    <div className="vlearn-page vlearn-page--dashboard">
      {/* Top Academic Sub-Header Section */}
      <div className="vlearn-sec-header">
        <div>
          <span className="vlearn-kicker">{t("dashKicker")}</span>
          <h1 className="vlearn-page-title">{t("dashTitle")}</h1>
          <p className="vlearn-page-sub">{t("dashSub")}</p>
        </div>
        <div className="course-counter-pill">
          {t("dashCourseCounter")}
        </div>
      </div>

      {/* Hero Welcome Card with Slanted Red Accent Banner */}
      <div className="vlearn-hero-card">
        <div className="vlearn-hero-card__content">
          <span className="vlearn-kicker">{t("dashKicker")}</span>
          <h2 className="vlearn-welcome-heading">
            {t("dashHeroWelcome", "NGUYỄN THỊ THANH HIỀN")}
          </h2>
          <p className="vlearn-welcome-desc">
            {t("dashHeroDesc")}
          </p>
        </div>

        {/* Signature Slanted Red Right Edge Accent */}
        <div className="vlearn-hero-card__red-accent"></div>
      </div>

      {/* Course Main Banner Row */}
      <div className="vlearn-academic-sec">
        <div className="glass-card course-main-banner" onClick={onOpenCourse}>
          <div className="course-main-banner__left">
            <div className="course-badge-tag">{t("dashCourseCode")}</div>
            <div>
              <h3>{t("dashCourseTitle")}</h3>
              <p>{t("dashCourseDesc")}</p>
            </div>
          </div>
          <button type="button" className="btn-feature-link">
            {t("dashViewClass")}
          </button>
        </div>
      </div>
    </div>
  );
}
