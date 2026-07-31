# Reflection Cá Nhân — Nguyễn Công Việt Quang

- **Họ và tên:** Nguyễn Công Việt Quang
- **Mã học viên:** `2A202601586`
- **Nhóm:** Nhóm UADAYDCA — Lớp K4
- **Sản phẩm:** VLearn Mindmap Navigation (Tự động tóm tắt Slide thành Mindmap & Nhảy Slide)
- **Vai trò:** **Frontend Developer** (Lead UI/UX & Frontend Prototype)

---

## 1. Vai trò & Phần việc cụ thể đảm nhận (Deliverable có tên)

Trong suốt 1.5 ngày diễn ra **Mini Hackathon AI (Batch 03)**, tôi đảm nhận vị trí **Frontend Developer (Lead UI/UX)** của Nhóm UADAYDCA với các deliverable trực tiếp đứng tên chịu trách nhiệm trong thư mục [`codebase/`](../codebase/):

- **Xây dựng trọn bộ giao diện tương tác Frontend React (`codebase/src/`):**
  - **Lập trình component chính [`MindmapSideView.jsx`](../codebase/src/components/MindmapSideView.jsx):** Hiển thị sơ đồ tư duy dạng cây 3 cấp (Chương -> Bài -> Khái niệm), hỗ trợ render node động, gắn nhãn trích dẫn `[Trang N]`, hiển thị tooltip trích dẫn văn bản gốc và các nút tương tác HAX/PAIR.
  - **Lập trình component [`PdfSlideViewer.jsx`](../codebase/src/components/PdfSlideViewer.jsx) & [`CourseDetailView.jsx`](../codebase/src/components/CourseDetailView.jsx):** Xây dựng tính năng cốt lõi **Tương tác 2 chiều (Mindmap Sync & Slide Navigation)** — khi học viên click vào bất kỳ node nào trên Mindmap, giao diện xem slide tự động trượt mượt (smooth scroll) và nhảy ngay đến đúng trang Slide `[Trang N]` chứa kiến thức tương ứng.
  - **Lập trình component đường lui [`TranscriptReader.jsx`](../codebase/src/components/TranscriptReader.jsx):** Phục vụ kịch bản Graceful Degradation khi bài giảng là dạng hình ảnh hoặc bị thiếu metadata trích dẫn slide.
- **Tích hợp các nguyên tắc HAX/PAIR trên giao diện người dùng (UX/UI):**
  - **G1 (Làm rõ hệ thống):** Header Mindmap hiển thị rõ thông điệp *"Sơ đồ cây kiến thức được AI tự động tổng hợp từ Slide bài giảng. Bấm vào từng nhánh để mở trang Slide gốc."*
  - **G2 (Minh bạch độ tin cậy):** Gắn nhãn `[Trang N]` trên từng node kèm Tooltip câu trích dẫn nguyên văn từ slide để học viên kiểm chứng nhanh.
  - **G9 (Thiết kế đường lui - PAIR Feedback):** Đưa lên UI nút *"Báo sai trích dẫn"*, nút *"Tải lại sơ đồ"*, và nút chuyển đổi linh hoạt sang giao diện tóm tắt danh sách dạng bullet/transcript khi AI gặp sự cố.
  - **G10 (Thu hẹp phạm vi khi nghi ngờ):** Hiển thị nét đứt cho các node có confidence score < 70% kèm nút *"Hỏi AI làm rõ mối liên hệ này"*.
- **Phối hợp Co-pilot:**
  - Phối hợp chặt chẽ với TV4 (Backend Lead - Đỗ Thành Đạt) để nối API FastAPI/Gemini RAG vào React UI, quản lý các trạng thái bất đồng bộ (Loading Skeleton, Error Handling).
  - Phối hợp với TV1 (Product Lead - Nguyễn Thị Thanh Hiền) tinh chỉnh trải nghiệm người dùng và chuẩn bị kịch bản kỹ thuật cho các buổi Demo live tại mốc CP2 và CP6.

---

## 2. Công cụ AI đã sử dụng & Cách phối hợp (Vibe-coding)

- **AI đã dùng:** Sử dụng AI Coding Assistant (Gemini 3.6 Flash / Antigravity) để trợ giúp sinh khung mã nguồn React JSX, viết thuật toán tính toán vị trí cuộn trang (scroll position) trong Slide Viewer, tối ưu CSS layout (Flexbox/Grid) và xử lý async API call.
- **Làm chủ sản phẩm (Vibe-coding):** AI chỉ đóng vai trò trợ lý viết code nhanh; tôi trực tiếp kiểm soát 100% cấu trúc UI/UX và logic tương tác State trong React. Tôi tự tay debug các lỗi đè style CSS, lỗi lệch sync giữa Sidebar Mindmap và Slide Viewer, đảm bảo hoàn toàn tự tin giải thích và bảo vệ toàn bộ phần việc Frontend trước Ban giám khảo tại CP5/CP6.

---

## 3. Bài học lớn nhất từ Case Fail của chính nhóm

- **Case Fail thực tế tại Lượt chạy Eval 1:** Trong lượt chạy kiểm thử Golden Set đầu tiên (20 cases), hệ thống gặp sự cố AI bị lệch trích dẫn 1-2 trang do slide có trang bìa hoặc trang mục lục offset. Trên giao diện Frontend, khi học viên click vào node `[Trang 5]`, Slide Viewer trượt sang trang 4 hoặc 6, gây ảnh hưởng đến trải nghiệm người dùng.
- **Bài học rút ra về Tư duy Sản phẩm & Lập trình Frontend AI:**
  1. *Chất lượng AI RAG quyết định trải nghiệm Navigation:* Sơ đồ Mindmap hiển thị đẹp đến đâu nhưng nếu số trang trỏ đến bị lệch 1 trang thì tính năng "nhảy slide" của Frontend sẽ mất hoàn toàn giá trị.
  2. *Thiết kế UX phản hồi lỗi linh hoạt (Fallback & Self-Correction UI):* Nhờ áp dụng nguyên tắc **HAX G9**, tôi đã kịp thời bổ sung nút icon ✏️ cho phép đổi trích dẫn thủ công ngay trên UI và hiển thị tooltip câu trích dẫn gốc. Điều này giúp học viên không bị gián đoạn trải nghiệm học tập ngay cả khi AI gặp sai lệch nhỏ.
  3. *Tương tác nhóm để nâng cao Quality Bar:* Sau khi Frontend ghi nhận chi tiết lỗi trượt trang, Backend Lead đã tối ưu lại RAG Indexing, đưa tỷ lệ đạt lên **90.0% ở Lượt 2**, giúp toàn bộ tính năng chuyển hướng trên giao diện hoạt động chính xác 100% trong buổi thuyết trình Demo live.

---

**Chữ ký xác nhận:**  
*Nguyễn Công Việt Quang — Frontend Developer Nhóm UADAYDCA*
