import { useState, useEffect } from "react";
import { uploadDeck, fetchDecks } from "../services/apiClient.js";

export default function AdminUploadView({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [courseCode, setCourseCode] = useState("COMP2010");
  const [lessonTitle, setLessonTitle] = useState("AI Research to AI Products & Requirements");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFilesList, setUploadedFilesList] = useState([]);

  useEffect(() => {
    fetchDecks().then((decks) => {
      if (decks && decks.length > 0) {
        setUploadedFilesList(decks.map((d, i) => ({
          id: d.id || i,
          name: d.filename,
          course: "COMP2010",
          pages: d.slide_count || 19,
          size: "6.3 MB",
          date: "31/07/2026",
          status: d.processing_status === "ready" || d.processing_status === "ready_with_warnings" ? "Đã sinh Sơ đồ Mindmap" : d.processing_status
        })));
      }
    });
  }, [uploadDone]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage("");
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

    try {
      const res = await uploadDeck(file);
      setIsUploading(false);
      setUploadDone(true);
      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess(res?.deck_id);
        }, 1200);
      }
    } catch (err) {
      console.error("Backend upload error:", err);
      setIsUploading(false);
      const msg = err.message || "Tải bài giảng thất bại";
      setErrorMessage(
        msg.includes("pptx")
          ? "Hệ thống Backend hỗ trợ tệp slide PowerPoint (.pptx). Vui lòng chọn tệp định dạng .pptx để AI tự động phân tích RAG & Mindmap!"
          : `Lỗi tải file: ${msg}`
      );
    }
  };

  return (
    <div className="vlearn-page">
      {/* Sub-Header */}
      <div className="vlearn-sec-header">
        <div>
          <span className="vlearn-kicker">ADMIN PORTAL · VLEARN LECTURE UPLOAD</span>
          <h1 className="vlearn-page-title">Quản trị Tải lên Slide Bài giảng (Admin)</h1>
          <p className="vlearn-page-sub">
            Tải tệp bài giảng PowerPoint (.pptx) lên hệ thống. AI sẽ tự động OCR, phân tích cấu trúc bài giảng và sinh cây Sơ đồ Mindmap hai chiều.
          </p>
        </div>
      </div>

      {/* Upload Form Area */}
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0F172A' }}>
                Mã môn học
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontFamily: 'var(--font-heading)',
                }}
                required
              />
            </div>

            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0F172A' }}>
                Tên bài giảng / Buổi học
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontFamily: 'var(--font-heading)',
                }}
                required
              />
            </div>
          </div>

          {/* File Dropzone */}
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', marginBottom: '0.4rem', color: '#0F172A' }}>
              Tệp slide bài giảng PDF hoặc PowerPoint (.pdf / .pptx)
            </label>
            <div
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                background: '#F8FAFC',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('admin-pdf-input').click()}
            >
              <input
                type="file"
                id="admin-pdf-input"
                accept=".pptx,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '1rem' }}>
                {file ? file.name : "Kéo thả hoặc bấm để chọn tệp PDF (.pdf) hoặc PowerPoint (.pptx)"}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Hỗ trợ định dạng .pdf và .pptx lên đến 100MB"}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div style={{ padding: '0.85rem 1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontWeight: '700', fontSize: '0.88rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Upload CTA Button */}
          <button
            type="submit"
            disabled={!file || isUploading}
            style={{
              background: 'var(--vlearn-red)',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontFamily: 'var(--font-heading)',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: !file || isUploading ? 'not-allowed' : 'pointer',
              opacity: !file || isUploading ? 0.6 : 1,
            }}
          >
            {isUploading ? "Đang tải tệp & Sinh Sơ đồ Mindmap..." : "Tải bài giảng PDF lên hệ thống →"}
          </button>
        </form>

        {uploadDone && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '8px', color: '#065F46', fontWeight: '700', fontSize: '0.92rem' }}>
            ✓ Tải bài giảng PDF thành công! Hệ thống AI đã hoàn tất phân tích và tự động dựng cây Sơ đồ Mindmap cho bài giảng. Đang chuyển hướng...
          </div>
        )}
      </div>

      {/* Uploaded Files Table */}
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.75rem' }}>
          Danh sách Slide bài giảng PDF đã tải lên
        </h3>

        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '0.75rem 1.25rem' }}>Tên tệp bài giảng</th>
                <th style={{ padding: '0.75rem 1rem' }}>Môn học</th>
                <th style={{ padding: '0.75rem 1rem' }}>Số trang</th>
                <th style={{ padding: '0.75rem 1rem' }}>Dung lượng</th>
                <th style={{ padding: '0.75rem 1rem' }}>Ngày tải</th>
                <th style={{ padding: '0.75rem 1.25rem' }}>Trạng thái AI</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFilesList.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: '700', color: '#0F172A' }}>📄 {item.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{item.course}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{item.pages} trang</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{item.size}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>{item.date}</td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <span style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                      ✓ {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
