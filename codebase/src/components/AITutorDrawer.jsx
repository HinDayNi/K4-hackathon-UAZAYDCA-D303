import { useEffect, useState } from "react";
import { explainPassage } from "../services/aiService.js";

export default function AITutorDrawer({ lesson, selectedPassage, onClose, onOpenMindmap, onJumpToSlide }) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: `Xin chào! Tôi là Trợ lý Học tập VLearn đồng hành cùng bài học ${lesson?.title ?? ""}. Bạn có thể bôi đen đoạn chữ bất kỳ trên slide bài giảng hoặc chọn các nút trợ giúp bên dưới để tôi hỗ trợ nhé!`,
      citation: null,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

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
        deckId: lesson?.id,
      }).then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: res.answer,
            citation: res.citation || codes[0],
            confidence: res.confidence || 95,
          },
        ]);
        setIsThinking(false);
      });
    }
  }, [selectedPassage]);

  const sendQuery = async (queryText) => {
    if (isThinking) return;

    setMessages((prev) => [...prev, { sender: "user", text: queryText }]);
    setIsThinking(true);

    try {
      const firstSegmentCode = lesson?.segments?.[0]?.code ?? "T01-001";
      const sampleText = lesson?.segments?.[0]?.text ?? "Nội dung bài giảng VLearn VinUniversity";

      const res = await explainPassage({
        passageText: sampleText,
        segmentCodes: [firstSegmentCode],
        lessonTitle: lesson?.title ?? "Bài giảng VLearn VinUniversity",
        queryText: queryText,
        deckId: lesson?.id,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.answer,
          citation: res.citation || firstSegmentCode,
          confidence: res.confidence || 93,
        },
      ]);
      setIsThinking(false);
    } catch (err) {
      setIsThinking(false);
    }
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
          <div key={i} className={`chat-bubble chat-bubble--${msg.sender}`}>
            <p>{msg.text}</p>
            {msg.citation && (
              <div className="chat-bubble__citation">
                <span
                  className="badge-cite"
                  style={{ cursor: onJumpToSlide ? "pointer" : "default" }}
                  onClick={() => onJumpToSlide && onJumpToSlide(msg.citation)}
                  title="Bấm để nhảy đến trang slide này"
                >
                  Trích dẫn: [{msg.citation}] 🔗
                </span>
                {msg.confidence && (
                  <span className="badge-conf">Độ tin cậy: {msg.confidence}%</span>
                )}
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="chat-bubble chat-bubble--ai thinking">
            <span className="dot-flashing">Hệ thống đang phân tích slide bài giảng…</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips Bar */}
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
