import { useEffect, useState } from "react";
import { generateScenarioQuestion, gradeAnswer, PATH } from "../services/aiService.js";

const VERDICT_LABEL = {
  correct: "Đúng",
  partial: "Đúng một phần",
  incorrect: "Chưa đúng",
};

export default function ComprehensionModal({ lesson, passage, onClose }) {
  // phase: loading-question | blocked | answering | grading | result | grade-error
  const [phase, setPhase] = useState("loading-question");
  const [question, setQuestion] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [grade, setGrade] = useState(null);
  const [regraded, setRegraded] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    setPhase("loading-question");
    generateScenarioQuestion({
      passageText: passage.passageText,
      segmentCodes: passage.segmentCodes,
      lessonTitle: lesson.title,
    }).then((res) => {
      if (cancelled) return;
      if (res.path === PATH.HAPPY) {
        setQuestion(res.question);
        setPhase("answering");
      } else {
        setBlockedMessage(res.message);
        setPhase("blocked");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = async (note) => {
    setPhase("grading");
    const res = await gradeAnswer({
      passageText: passage.passageText,
      segmentCodes: passage.segmentCodes,
      question,
      studentAnswer: answerText,
      correctionNote: note,
    });
    if (res.path === PATH.HAPPY) {
      setGrade(res);
      setPhase("result");
      if (note) setRegraded(true);
    } else {
      setBlockedMessage(res.message);
      setPhase("grade-error");
    }
  };

  const handleThumbsDown = () => setShowCorrectionForm(true);

  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    setShowCorrectionForm(false);
    submitAnswer(correctionNote || "Học viên cho rằng kết quả chấm chưa đúng.");
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <button type="button" className="modal__close" onClick={onClose}>
          ✕
        </button>

        <p className="modal__passage-label">
          Đoạn đã chọn ({passage.segmentCodes.join(", ")}):
        </p>
        <blockquote className="modal__passage">{passage.passageText}</blockquote>

        {phase === "loading-question" && <p>Đang tạo câu hỏi tình huống…</p>}

        {phase === "blocked" && (
          <div className="modal__blocked">
            <p>{blockedMessage}</p>
            <button type="button" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}

        {(phase === "answering" || phase === "grading") && (
          <>
            <p className="modal__question">{question}</p>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Nhập câu trả lời của bạn…"
              rows={4}
              disabled={phase === "grading"}
            />
            <button
              type="button"
              disabled={!answerText.trim() || phase === "grading"}
              onClick={() => submitAnswer()}
            >
              {phase === "grading" ? "Đang chấm…" : "Nộp câu trả lời"}
            </button>
          </>
        )}

        {phase === "grade-error" && (
          <div className="modal__blocked">
            <p>{blockedMessage}</p>
            <button type="button" onClick={() => submitAnswer()}>
              Thử lại
            </button>
          </div>
        )}

        {phase === "result" && grade && (
          <div className="modal__result">
            {regraded && <span className="badge badge--info">Đã chấm lại</span>}
            <p className="modal__question">{question}</p>
            <p className="modal__answer-echo">Bạn trả lời: {answerText}</p>

            <div className="modal__verdict">
              <span className={`badge badge--${grade.verdict}`}>
                {VERDICT_LABEL[grade.verdict] ?? grade.verdict}
              </span>
              <span className="badge badge--confidence">
                Độ tin cậy: {Math.round(grade.confidence)}%
              </span>
            </div>

            <p className="modal__explanation">{grade.explanation}</p>
            <p className="modal__citation">Trích dẫn: [{grade.citation}]</p>

            {!showCorrectionForm ? (
              <div className="modal__feedback">
                <button type="button" aria-label="Đồng ý với kết quả chấm">
                  👍
                </button>
                <button
                  type="button"
                  aria-label="Không đồng ý, yêu cầu chấm lại"
                  onClick={handleThumbsDown}
                >
                  👎 Chấm lại
                </button>
              </div>
            ) : (
              <form className="modal__correction-form" onSubmit={handleCorrectionSubmit}>
                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder="Bạn nghĩ chỗ nào bị chấm sai? (tuỳ chọn)"
                  rows={2}
                />
                <button type="submit">Gửi & chấm lại</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
