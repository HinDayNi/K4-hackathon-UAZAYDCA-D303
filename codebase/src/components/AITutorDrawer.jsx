import { useEffect, useState } from "react";
import { explainPassage } from "../services/aiService.js";

export default function AITutorDrawer({ 
  lesson, 
  selectedPassage, 
  onClose, 
  onOpenMindmap, 
  onJumpToSlide // Prop nhận hàm chuyển slide từ TranscriptReader
}) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: `Xin chào! Tôi là Trợ lý Học tập VLearn đồng hành cùng bài học ${lesson?.title ?? ""}. Bạn có thể bôi đen đoạn chữ bất kỳ trên slide bài giảng hoặc chọn các nút trợ giúp bên dưới để tôi hỗ trợ nhé!`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Effect khi người dùng bôi đen chữ trên Slide bài giảng
  useEffect(() => {
    if (selectedPassage && selectedPassage.text) {
      const { text, codes } = selectedPassage;
      const userMsg = `[Bôi đen trên Slide]: "${text}"`;

      setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
      setIsThinking(true);

      explainPassage({
        passageText: text,
        segmentCodes: codes,
        lessonTitle: lesson?.title ?? "Bài giảng VLearn VinUniversity",
        queryText: `Giải thích giúp mình đoạn này trên slide: "${text}"`,
        lessonId: lesson?.id || "lesson_01_agile"
      }).then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: res.answer,
            confidence: res.confidence || 95,
          },
        ]);
        setIsThinking(false);
      });
    }
  }, [selectedPassage, lesson]);

  // Hàm gửi câu hỏi (Hỗ trợ Chat Memory)
  const sendQuery = async (queryText) => {
    if (isThinking || !queryText.trim()) return;

    const newMessages = [...messages, { sender: "user", text: queryText }];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      const firstSegmentCode = lesson?.segments[0]?.code ?? "T01-001";
      const sampleText = lesson?.segments[0]?.text ?? "Nội dung bài giảng VLearn VinUniversity";

      const res = await explainPassage({
        passageText: sampleText,
        segmentCodes: [firstSegmentCode],
        lessonTitle: lesson?.title ?? "Bài giảng VLearn VinUniversity",
        queryText: queryText,
        lessonId: lesson?.id || "lesson_01_agile",
        history: newMessages.slice(-5) 
      });

      setMessages((prevHistory) => [
        ...prevHistory,
        {
          sender: "ai",
          text: res.answer,
          confidence: res.confidence || 93,
        },
      ]);
      setIsThinking(false);
    } catch (err) {
      console.error("Lỗi khi gửi câu hỏi:", err);
      setIsThinking(false);
    }
  };

  // 🔥 HÀM BÓC TÁCH CHUỖI: BIẾN CÁC THẺ [chk_xxx] THÀNH NÚT BẤM JUMP SLIDE INLINE
  const renderInteractiveText = (text) => {
    if (!text) return null;

    // Regex nhận diện tất cả các thẻ có dạng [chk_006] hoặc [chk_40] hoặc [chk_1]
    const regex = /\[(chk_\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const chunkTag = match[1]; // Ví dụ: "chk_006"
      const matchStart = match.index;

      // Thêm đoạn văn bản thường nằm trước thẻ [chk_xxx]
      if (matchStart > lastIndex) {
        parts.push(text.substring(lastIndex, matchStart));
      }

      // Trích xuất con số slide từ mã chunk (vd: "chk_006" -> 6, "chk_040" -> 40)
      const slideNumber = parseInt(chunkTag.replace("chk_", ""), 10);

      // Render thẻ [chk_xxx] thành Nút Bấm Inline
      parts.push(
        <button
          key={`cite-${matchStart}`}
          type="button"
          onClick={() => onJumpToSlide && onJumpToSlide(slideNumber)}
          title={`Bấm để chuyển ngay tới Slide ${slideNumber}`}
          style={{
            background: "#DBEAFE",
            color: "#1E40AF",
            border: "1px solid #93C5FD",
            borderRadius: "4px",
            padding: "1px 6px",
            margin: "0 3px",
            fontSize: "0.78rem",
            fontWeight: "700",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            verticalAlign: "baseline",
            transition: "all 0.15s ease-in-out"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2563EB";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#DBEAFE";
            e.currentTarget.style.color = "#1E40AF";
          }}
        >
          📍 Slide {slideNumber}
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    // Thêm đoạn văn bản còn lại sau thẻ trích dẫn cuối cùng
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    sendQuery(text);
  };

  const handleSuggestionClick = (type) => {
    if (type === "mindmap") {
      sendQuery("Hãy tạo cho mình sơ đồ tư duy Mindmap tổng quan và bản đồ lỗ hổng kiến thức cho khóa học này.");
      if (onOpenMindmap) onOpenMindmap();
    } else if (type === "explain") {
      sendQuery("Giải thích giúp mình tổng quan nội dung kiến thức cốt lõi của bài học này.");
    } else if (type === "quiz") {
      sendQuery("Hãy cho mình 1 câu hỏi tình huống thực tế để kiểm tra hiểu thật bài học này.");
    }
  };

  return (
    <aside className="ai-tutor-drawer">
      <div className="ai-tutor-drawer__header">
        <div className="ai-tutor-drawer__title">
          <div>
            <h3>Trợ lý Học tập VLearn</h3>
            <span className="status-online">● Đang kết nối bài giảng</span>
          </div>
        </div>
        <button type="button" className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="ai-tutor-drawer__body">
        {messages.map((msg, i) => (
          <div key={`msg-${i}`} className={`chat-bubble chat-bubble--${msg.sender}`}>
            {/* 🔥 VĂN BẢN ĐƯỢC PARSE TỰ ĐỘNG CHUYỂN CÁC THẺ [chk_xxx] THÀNH NÚT BẤM */}
            <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {msg.sender === "ai" ? renderInteractiveText(msg.text) : msg.text}
            </p>
          </div>
        ))}

        {isThinking && (
          <div className="chat-bubble chat-bubble--ai thinking">
            <span className="dot-flashing">Hệ thống đang phân tích slide bài giảng…</span>
          </div>
        )}
      </div>

      <div className="suggestion-chips-bar">
        <button
          type="button"
          className="chip-btn chip-btn--gold"
          onClick={() => handleSuggestionClick("mindmap")}
        >
          Sơ đồ Mindmap
        </button>
        <button
          type="button"
          className="chip-btn"
          onClick={() => handleSuggestionClick("explain")}
        >
          Giải thích cốt lõi
        </button>
        <button
          type="button"
          className="chip-btn"
          onClick={() => handleSuggestionClick("quiz")}
        >
          Kiểm tra bài học
        </button>
      </div>

      <form className="ai-tutor-drawer__footer" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Nhập câu hỏi thảo luận về bài học…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" disabled={!inputText.trim() || isThinking}>
          Gửi
        </button>
      </form>
    </aside>
  );
}