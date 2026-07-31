import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import DashboardView from "./components/DashboardView.jsx";
import MyCoursesView from "./components/MyCoursesView.jsx";
import CourseDetailView from "./components/CourseDetailView.jsx";
import TranscriptReader from "./components/TranscriptReader.jsx";
import AdminUploadView from "./components/AdminUploadView.jsx";
import ComprehensionModal from "./components/ComprehensionModal.jsx";
import { lessons as fallbackLessons } from "./data/lessons.js";
import { fetchDecks } from "./services/apiClient.js";

const DEFAULT_USERS = {
  student: { name: "Thanh Hiền", email: "hien.ntt@vinuni.edu.vn", role: "student" },
  admin: { name: "Admin VinUni", email: "admin@vinuni.edu.vn", role: "admin" },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(DEFAULT_USERS.student);
  const [lessonsList, setLessonsList] = useState(fallbackLessons);
  const [selectedLessonId, setSelectedLessonId] = useState(fallbackLessons[0]?.id ?? null);
  const [activePassage, setActivePassage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchDecks().then((backendDecks) => {
      if (backendDecks && backendDecks.length > 0) {
        const mapped = backendDecks.map((deck) => ({
          id: deck.id,
          title: deck.filename,
          fileType: deck.file_type || (deck.filename.toLowerCase().endsWith(".pdf") ? "pdf" : "pptx"),
          fileUrl: `http://127.0.0.1:8000/api/v1/decks/${deck.id}/file`,
          slideCount: deck.slide_count,
          status: deck.processing_status,
        }));
        setLessonsList(mapped);
        setSelectedLessonId(mapped[0].id);
      }
    });
  }, []);

  const selectedLesson = lessonsList.find((l) => l.id === selectedLessonId) ?? lessonsList[0];

  const handleToggleUserRole = (roleKey) => {
    if (DEFAULT_USERS[roleKey]) {
      setCurrentUser(DEFAULT_USERS[roleKey]);
      if (roleKey === "admin") {
        navigate("/admin");
      } else if (location.pathname === "/admin") {
        navigate("/");
      }
    }
  };

  const handleOpenCourse = () => {
    navigate("/course-detail");
  };

  const handleOpenLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    navigate("/reader");
  };

  const handleUploadSuccess = (newDeckId) => {
    fetchDecks().then((backendDecks) => {
      if (backendDecks && backendDecks.length > 0) {
        const mapped = backendDecks.map((deck) => ({
          id: deck.id,
          title: deck.filename,
          fileType: deck.file_type || (deck.filename.toLowerCase().endsWith(".pdf") ? "pdf" : "pptx"),
          fileUrl: `http://127.0.0.1:8000/api/v1/decks/${deck.id}/file`,
          slideCount: deck.slide_count,
          status: deck.processing_status,
        }));
        setLessonsList(mapped);
        if (newDeckId) {
          setSelectedLessonId(newDeckId);
        } else {
          setSelectedLessonId(mapped[0].id);
        }
      }
      navigate("/reader");
    });
  };

  return (
    <div className="vlearn-app">
      {/* Top Navbar Header */}
      <Header
        selectedLessonTitle={selectedLesson?.title}
        currentUser={currentUser}
        onToggleUserRole={handleToggleUserRole}
      />

      {/* Main Routes Management */}
      <main className="vlearn-main-content">
        <Routes>
          <Route
            path="/"
            element={<DashboardView onOpenCourse={() => navigate("/courses")} />}
          />

          <Route
            path="/courses"
            element={<MyCoursesView lessons={lessonsList} onSelectCourse={handleOpenLesson} />}
          />

          <Route
            path="/course-detail"
            element={<CourseDetailView lessons={lessonsList} onOpenLesson={handleOpenLesson} />}
          />

          {/* Admin Upload Route (Protected for Admin accounts only) */}
          <Route
            path="/admin"
            element={
              currentUser.role === "admin" ? (
                <AdminUploadView onUploadSuccess={handleUploadSuccess} />
              ) : (
                <div className="vlearn-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                  <div className="glass-card" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                      Trang Tải Slide PDF dành riêng cho Admin
                    </h2>
                    <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: '1.55', marginBottom: '1.5rem' }}>
                      Bạn đang ở tài khoản <strong>Học viên (Thanh Hiền)</strong>. Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập trang tải bài giảng PDF này.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleToggleUserRole("admin")}
                      style={{
                        background: 'var(--vlearn-red)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '999px',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '800',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                      }}
                    >
                      Đăng nhập tài khoản Admin mặc định →
                    </button>
                  </div>
                </div>
              )
            }
          />

          <Route
            path="/reader"
            element={
              <TranscriptReader
                lessons={lessonsList}
                currentLesson={selectedLesson}
                onSelectLesson={setSelectedLessonId}
                onCheckComprehension={setActivePassage}
                onBack={() => navigate("/course-detail")}
              />
            }
          />
        </Routes>
      </main>

      {/* Interactive Comprehension Check Modal */}
      {activePassage && (
        <ComprehensionModal
          lesson={selectedLesson}
          passage={activePassage}
          onClose={() => setActivePassage(null)}
        />
      )}
    </div>
  );
}
