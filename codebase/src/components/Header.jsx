export default function Header({ activeTab, onTabChange, selectedLessonTitle }) {
  return (
    <header className="vlearn-navbar">
      <div className="vlearn-navbar__container">
        <div className="vlearn-navbar__left">
          <div className="vlearn-logo" onClick={() => onTabChange("dashboard")}>
            <img src="/vinuni_logo.png" alt="VinUniversity VLearn" className="vinuni-logo-img" />
          </div>

          <nav className="vlearn-nav">
            <button
              type="button"
              className={`vlearn-nav__item ${activeTab === "dashboard" ? "is-active" : ""}`}
              onClick={() => onTabChange("dashboard")}
            >
              🏠 Home
            </button>
            <button
              type="button"
              className={`vlearn-nav__item ${activeTab === "courses" || activeTab === "course-detail" ? "is-active" : ""}`}
              onClick={() => onTabChange("courses")}
            >
              📖 Courses
            </button>
            <button
              type="button"
              className="vlearn-nav__item"
              onClick={() => onTabChange("dashboard")}
            >
              👤 Profile
            </button>

            {activeTab === "reader" && (
              <span className="vlearn-nav__current-doc">
                / {selectedLessonTitle}
              </span>
            )}
          </nav>
        </div>

        <div className="vlearn-navbar__right">
          <span className="lang-picker">VI</span>
          <button type="button" className="icon-btn" aria-label="Toggle theme">
            🌙
          </button>
          <div className="user-profile-pill">
            <span>User profile</span>
            <span className="user-avatar">A</span>
            <span className="user-chevron">▾</span>
          </div>
        </div>
      </div>
    </header>
  );
}
