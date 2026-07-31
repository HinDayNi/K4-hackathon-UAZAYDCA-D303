import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function Header({ selectedLessonTitle, currentUser, onToggleUserRole }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("vlearn-theme") || "light");
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, t } = useLanguage();

  const currentPath = location.pathname;
  const isAdmin = currentUser?.role === "admin";
  const isDark = theme === "dark";
  const surface = isDark ? "#16213A" : "#FFFFFF";
  const surfaceBorder = isDark ? "#1F2A3C" : "#E2E8F0";
  const textColor = isDark ? "#E5E9F0" : "#0F172A";
  const mutedColor = isDark ? "#98A2B3" : "#64748B";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vlearn-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="vlearn-navbar">
      <div className="vlearn-navbar__container">
        <div className="vlearn-navbar__left">
          {/* Mobile 3-Bar Hamburger Toggle Button */}
          <button
            type="button"
            className="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>

          <div className="vlearn-logo" onClick={() => handleNavClick("/")}>
            <img src="/vinuni_logo.png" alt="VinUniversity VLearn" className="vinuni-logo-img" />
          </div>

          {/* Desktop Navigation Items */}
          <nav className="vlearn-nav desktop-only-nav">
            <button
              type="button"
              className={`vlearn-nav__item ${currentPath === "/" ? "is-active" : ""}`}
              onClick={() => handleNavClick("/")}
            >
              <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              {t("navHome")}
            </button>

            <button
              type="button"
              className={`vlearn-nav__item ${currentPath.startsWith("/course-detail") ? "is-active" : ""}`}
              onClick={() => handleNavClick("/course-detail")}
            >
              <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              {t("navCourses")}
            </button>

            {/* Admin Upload Tab ONLY visible to Admin accounts */}
            {isAdmin && (
              <button
                type="button"
                className={`vlearn-nav__item ${currentPath === "/admin" ? "is-active" : ""}`}
                onClick={() => handleNavClick("/admin")}
              >
                <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {t("navAdmin")}
              </button>
            )}

            {currentPath.startsWith("/reader") && (
              <span className="vlearn-nav__current-doc">
                / {selectedLessonTitle || "COMP2010 AI Product Thinking"}
              </span>
            )}
          </nav>
        </div>

        <div className="vlearn-navbar__right" style={{ position: 'relative' }}>
          {/* Language Toggle Pill (VI / EN) */}
          <button
            type="button"
            onClick={toggleLang}
            title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            style={{
              border: `1px solid ${surfaceBorder}`,
              background: surface,
              color: textColor,
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '0.35rem 0.7rem',
              borderRadius: '999px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {lang.toUpperCase()}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("themeToggleToLight") : t("themeToggleToDark")}
            title={theme === "dark" ? t("themeToggleToLight") : t("themeToggleToDark")}
            style={{
              border: `1px solid ${surfaceBorder}`,
              background: surface,
              color: textColor,
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {theme === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowRoleDropdown(false);
            }}
            aria-label={t("notifTitle")}
            title={t("notifTitle")}
            style={{
              border: `1px solid ${surfaceBorder}`,
              background: surface,
              color: textColor,
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>

          {/* Notification Dropdown */}
          {showNotifDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '120px',
                background: surface,
                border: `1px solid ${surfaceBorder}`,
                borderRadius: '12px',
                padding: '0.85rem',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                zIndex: 200,
                width: '240px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: mutedColor, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {t("notifTitle")}
              </div>
              <div style={{ fontSize: '0.85rem', color: mutedColor, padding: '0.5rem 0' }}>
                {t("notifEmpty")}
              </div>
            </div>
          )}

          {/* User Profile & Role Switcher Pill */}
          <div
            className="user-profile-pill"
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowNotifDropdown(false);
            }}
            title={t("switchAccount")}
          >
            <div className={`user-avatar-badge ${isAdmin ? "admin-avatar" : ""}`}>
              {isAdmin ? "A" : "H"}
            </div>
            <span className="user-name">
              {currentUser.name} {isAdmin ? "(Admin)" : ""}
            </span>
            <span className="user-chevron">▾</span>
          </div>

          {/* Account Role Switcher Dropdown */}
          {showRoleDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                background: surface,
                border: `1px solid ${surfaceBorder}`,
                borderRadius: '12px',
                padding: '0.75rem',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                zIndex: 200,
                width: '260px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: mutedColor, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {t("switchAccount")}
              </div>

              <div
                onClick={() => {
                  onToggleUserRole("student");
                  setShowRoleDropdown(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '8px',
                  background: !isAdmin ? (isDark ? 'rgba(197, 34, 31, 0.15)' : '#FEF2F2') : surface,
                  color: !isAdmin ? (isDark ? '#FCA5A5' : '#C5221F') : textColor,
                  cursor: 'pointer',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ width: 22, height: 22, background: '#0369A1', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>H</div>
                <div>
                  <div>{t("studentAccountName")}</div>
                  <div style={{ fontSize: '0.72rem', color: mutedColor, fontWeight: 500 }}>{t("studentAccountRole")}</div>
                </div>
              </div>

              <div
                onClick={() => {
                  onToggleUserRole("admin");
                  setShowRoleDropdown(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '8px',
                  background: isAdmin ? (isDark ? 'rgba(197, 34, 31, 0.15)' : '#FEF2F2') : surface,
                  color: isAdmin ? (isDark ? '#FCA5A5' : '#C5221F') : textColor,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ width: 22, height: 22, background: '#C5221F', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>A</div>
                <div>
                  <div>{t("adminAccountName")}</div>
                  <div style={{ fontSize: '0.72rem', color: mutedColor, fontWeight: 500 }}>{t("adminAccountRole")}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="vlearn-mobile-menu-drawer">
          <button
            type="button"
            className={`mobile-menu-item ${currentPath === "/" ? "is-active" : ""}`}
            onClick={() => handleNavClick("/")}
          >
            <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {t("navHome")}
          </button>

          <button
            type="button"
            className={`mobile-menu-item ${currentPath.startsWith("/course-detail") ? "is-active" : ""}`}
            onClick={() => handleNavClick("/course-detail")}
          >
            <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            {t("navCourses")}
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`mobile-menu-item ${currentPath === "/admin" ? "is-active" : ""}`}
              onClick={() => handleNavClick("/admin")}
            >
              <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {t("navAdmin")}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
