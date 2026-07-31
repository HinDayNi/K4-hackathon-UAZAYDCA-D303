import { createContext, useContext, useState, useCallback, useMemo } from "react";

const translations = {
  vi: {
    navHome: "Trang chủ",
    navCourses: "Khóa học của tôi",
    navAdmin: "Tải bài giảng PDF (Admin)",
    switchAccount: "Đổi tài khoản đăng nhập",
    studentAccountName: "Thanh Hiền",
    studentAccountRole: "Tài khoản Học viên",
    adminAccountName: "Admin VinUni",
    adminAccountRole: "Quản trị viên (Phân quyền PDF)",
    notifTitle: "Thông báo",
    notifEmpty: "Chưa có thông báo nào.",
    themeToggleToDark: "Chuyển sang giao diện tối",
    themeToggleToLight: "Chuyển sang giao diện sáng",

    dashKicker: "VLEARN · VINUNI AI THỰC CHIẾN",
    dashTitle: "Không gian học tập VLearn",
    dashSub: "Theo dõi tiến độ, học liệu và phần kiến thức cần củng cố tại VinUni AI Thực Chiến.",
    dashCourseCounter: "1 khóa học đang theo học",
    dashHeroWelcome: (name) => `Chào mừng trở lại, ${name}!`,
    dashHeroDesc:
      "VLearn đang tổng hợp tiến độ đọc và các tín hiệu học tập. Mở Khóa học của tôi để tiếp tục ngày học hoặc trao đổi cùng VLearn Tutor.",
    dashCourseCode: "COMP2010",
    dashCourseTitle: "COMP2010 - AI Product Thinking",
    dashCourseDesc:
      "Mở khóa học của tôi để xem bài giảng slide, sơ đồ tư duy Mindmap và kiểm tra hiểu thật cùng VLearn Tutor.",
    dashViewClass: "Xem lớp học →",

    courseKicker: "VLEARN · VINUNI AI THỰC CHIẾN",
    courseTitle: "COMP2010 - Khoá 3 + 4 Phase 1",
    courseSub: "1074 học viên cùng lớp",
    readProgress: (done, total) => `Đã đọc ${done}/${total} ngày`,
    startReading: "Bắt đầu đọc",
    dayNotDone: "Chưa hoàn thành ngày học",
    slideCount: "1 slide",
  },
  en: {
    navHome: "Home",
    navCourses: "My Courses",
    navAdmin: "Upload Slides (Admin)",
    switchAccount: "Switch account",
    studentAccountName: "Thanh Hien",
    studentAccountRole: "Student account",
    adminAccountName: "Admin VinUni",
    adminAccountRole: "Admin (PDF permissions)",
    notifTitle: "Notifications",
    notifEmpty: "No notifications yet.",
    themeToggleToDark: "Switch to dark mode",
    themeToggleToLight: "Switch to light mode",

    dashKicker: "VLEARN · VINUNI AI IN ACTION",
    dashTitle: "VLearn Learning Space",
    dashSub: "Track your progress, materials, and knowledge gaps in VinUni AI In Action.",
    dashCourseCounter: "1 course in progress",
    dashHeroWelcome: (name) => `Welcome back, ${name}!`,
    dashHeroDesc:
      "VLearn is aggregating your reading progress and learning signals. Open My Courses to continue your lesson or chat with the VLearn Tutor.",
    dashCourseCode: "COMP2010",
    dashCourseTitle: "COMP2010 - AI Product Thinking",
    dashCourseDesc:
      "Open my course to view lecture slides, the Mindmap, and check your real understanding with the VLearn Tutor.",
    dashViewClass: "View class →",

    courseKicker: "VLEARN · VINUNI AI IN ACTION",
    courseTitle: "COMP2010 - Cohort 3 + 4 Phase 1",
    courseSub: "1074 students in this class",
    readProgress: (done, total) => `Read ${done}/${total} days`,
    startReading: "Start reading",
    dayNotDone: "Day not completed yet",
    slideCount: "1 slide",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("vlearn-lang") || "vi");

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "vi" ? "en" : "vi";
      localStorage.setItem("vlearn-lang", next);
      return next;
    });
  }, []);

  const t = useCallback((key, ...args) => {
    const entry = translations[lang]?.[key] ?? translations.vi[key];
    return typeof entry === "function" ? entry(...args) : entry;
  }, [lang]);

  const value = useMemo(() => ({ lang, toggleLang, t }), [lang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
