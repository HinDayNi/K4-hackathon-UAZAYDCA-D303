import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header({ selectedLessonTitle, currentUser, onToggleUserRole }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isAdmin = currentUser?.role === "admin";

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
              Trang chủ
            </button>

            <button
              type="button"
              className={`vlearn-nav__item ${currentPath.startsWith("/courses") || currentPath.startsWith("/course-detail") ? "is-active" : ""}`}
              onClick={() => handleNavClick("/courses")}
            >
              <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Khóa học của tôi
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
                Tải bài giảng PDF (Admin)
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
          {/* User Profile & Role Switcher Pill */}
          <div
            className="user-profile-pill"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            title="Bấm để chuyển đổi tài khoản Học viên / Admin"
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
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '0.75rem',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                zIndex: 200,
                width: '260px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Đổi tài khoản đăng nhập
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
                  background: !isAdmin ? '#FEF2F2' : '#FFFFFF',
                  color: !isAdmin ? '#C5221F' : '#0F172A',
                  cursor: 'pointer',
                  fontWeight: '700',
                  marginBottom: '0.4rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ width: 22, height: 22, background: '#0369A1', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>H</div>
                <div>
                  <div>Thanh Hiền</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Tài khoản Học viên</div>
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
                  background: isAdmin ? '#FEF2F2' : '#FFFFFF',
                  color: isAdmin ? '#C5221F' : '#0F172A',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ width: 22, height: 22, background: '#C5221F', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>A</div>
                <div>
                  <div>Admin VinUni</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Quản trị viên (Phân quyền PDF)</div>
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
            Trang chủ
          </button>

          <button
            type="button"
            className={`mobile-menu-item ${currentPath.startsWith("/courses") || currentPath.startsWith("/course-detail") ? "is-active" : ""}`}
            onClick={() => handleNavClick("/courses")}
          >
            <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Khóa học của tôi
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
              Tải bài giảng PDF (Admin)
            </button>
          )}
        </div>
      )}
    </header>
  );
}
