import { useEffect, useState } from "react";
import { explainPassage } from "../services/aiService.js";

export default function AITutorDrawer({ lesson, selectedPassage, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: `Xin chào! Tôi là VLearn AI Tutor đồng hành cùng khóa học ${lesson?.title ?? ""}. Bạn có thể bôi đen bất kỳ đoạn bài giảng nào và bấm "Hỏi VLearn Tutor" để tôi giải thích chi tiết nhé!`,
      citation: null,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Trigger AI explanation automatically when student highlights text and clicks "Hỏi VLearn Tutor"
  useEffect(() => {
    if (selectedPassage && selectedPassage.text) {
      const { text, codes } = selectedPassage;
      const userMsg = `[Bôi đen đoạn ${codes.join(", ")}]: "${text}"`;

      setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
      setIsThinking(true);

      explainPassage({
        passageText: text,
        segmentCodes: codes,
        lessonTitle: lesson?.title ?? "Bài giảng VLearn",
        queryText: "Giải thích giúp mình đoạn này",
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
  }, [selectedPassage, lesson]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;

    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInputText("");
    setIsThinking(true);

    try {
      const firstSegmentCode = lesson?.segments[0]?.code ?? "T01-001";
      const sampleText = lesson?.segments[0]?.text ?? "Nội dung bài giảng VLearn";

      const res = await explainPassage({
        passageText: sampleText,
        segmentCodes: [firstSegmentCode],
        lessonTitle: lesson?.title ?? "Bài giảng VLearn",
        queryText: userMsg,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.answer,
          citation: res.citation || firstSegmentCode,
          confidence: res.confidence || 92,
        },
      ]);
      setIsThinking(false);
    } catch (err) {
      setIsThinking(false);
    }
  };

  return (
    <aside className="ai-tutor-drawer">
      <div className="ai-tutor-drawer__header">
        <div className="ai-tutor-drawer__title">
          <span className="robot-icon">🤖</span>
          <div>
            <h3>VLearn Tutor AI</h3>
            <span className="status-online">● Đang hoạt động (Gemini 2.5)</span>
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
                <span className="badge-cite">Trích dẫn: [{msg.citation}]</span>
                {msg.confidence && (
                  <span className="badge-conf">Độ tin cậy: {msg.confidence}%</span>
                )}
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="chat-bubble chat-bubble--ai thinking">
            <span className="dot-flashing">VLearn Tutor đang phân tích bài giảng…</span>
          </div>
        )}
      </div>

      <form className="ai-tutor-drawer__footer" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Hỏi VLearn Tutor về bài học…"
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
