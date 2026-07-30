import { useState } from "react";
import Header from "./components/Header.jsx";
import DashboardView from "./components/DashboardView.jsx";
import MyCoursesView from "./components/MyCoursesView.jsx";
import CourseDetailView from "./components/CourseDetailView.jsx";
import TranscriptReader from "./components/TranscriptReader.jsx";
import ComprehensionModal from "./components/ComprehensionModal.jsx";
import { lessons } from "./data/lessons.js";
import { downloadAiLog } from "./utils/aiLog.js";

export default function App() {
  // activeTab: "dashboard" | "courses" | "course-detail" | "reader"
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? null);
  const [activePassage, setActivePassage] = useState(null);

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];

  const handleOpenCourse = () => {
    setActiveTab("course-detail");
  };

  const handleOpenLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    setActiveTab("reader");
  };

  return (
    <div className="vlearn-app">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedLessonTitle={selectedLesson?.title}
      />

      {/* Main View Switching */}
      <main className="vlearn-main-content">
        {activeTab === "dashboard" && (
          <DashboardView onOpenCourse={() => setActiveTab("courses")} />
        )}

        {activeTab === "courses" && (
          <MyCoursesView onSelectCourse={handleOpenCourse} />
        )}

        {activeTab === "course-detail" && (
          <CourseDetailView lessons={lessons} onOpenLesson={handleOpenLesson} />
        )}

        {activeTab === "reader" && (
          <TranscriptReader
            lessons={lessons}
            currentLesson={selectedLesson}
            onSelectLesson={setSelectedLessonId}
            onCheckComprehension={setActivePassage}
            onBack={() => setActiveTab("course-detail")}
          />
        )}
      </main>

      {/* Interactive Comprehension Check Modal */}
      {activePassage && (
        <ComprehensionModal
          lesson={selectedLesson}
          passage={activePassage}
          onClose={() => setActivePassage(null)}
        />
      )}

      {/* Global Hackathon Evidence Export Bar */}
      <footer className="vlearn-global-footer">
        <div className="footer-container">
          <span>🎯 VLearn AI Product Hackathon — Prototype CP2/CP3 Ready</span>
          <button type="button" className="btn-log-download" onClick={downloadAiLog}>
            📥 Tải log lời gọi AI (JSON Minh Chứng R5)
          </button>
        </div>
      </footer>
    </div>
  );
}
