# Reflection Cá Nhân — Nguyễn Thị Thanh Hiền

- **Họ và tên:** Nguyễn Thị Thanh Hiền
- **Mã học viên:** `2A202601150`
- **Nhóm:** Nhóm UADAYDCA — Lớp K4
- **Sản phẩm:** VLearn Mindmap Navigation (Tự động tóm tắt Slide thành Mindmap & Nhảy Slide)
- **Vai trò:** **Product, Spec & Demo Presenter**

---

## 1. Vai trò & Phần việc cụ thể đảm nhận (Deliverable có tên)

Trong suốt 1.5 ngày diễn ra **Mini Hackathon AI (Batch 03)**, tôi đảm nhận vị trí **Product, Spec & Demo Presenter** của Nhóm UADAYDCA với các deliverable trực tiếp đứng tên trách nhiệm:

- **Chủ trì xây dựng TRỌN BỘ [`spec.md`](spec.md) từ §1 đến §9:**
  - **§1. User & Job:** Định hình **Problem Statement** chuẩn không chữ "AI/Chatbot", tổng hợp dữ liệu khảo sát chuẩn A ($n = 28$ người) từ `validation/survey_responses.csv`, chứng minh **92.9% học viên xác nhận nỗi đau**.
  - **§2. Impact & quyết định chọn:** Lập **Bảng Impact 3 ứng viên bài toán**, phân tích chọn bài toán có impact cao nhất (*Mindmap Sync & Slide Navigation*) và lưu vết lý do loại 2 ứng viên còn lại.
  - **§3. Giải pháp tương tự:** Nghiên cứu và so sánh 2 sản phẩm thị trường (*NotebookLM*, *Khanmigo*) để tìm điểm khác biệt cạnh tranh cho VLearn Mindmap.
  - **§4. Thiết kế & HAX/PAIR:** Viết Lát cắt 1 câu, xác định Non-goals, chọn mức Working Prototype, chế độ Conditional Automation theo cost-of-error và áp dụng 4 nguyên tắc HAX/PAIR (G1, G2, G10, G9).
  - **§5. Kiểu lỗi (4 lớp chỗ khó):** Xây dựng bảng 8 kịch bản rủi ro phủ đủ 4 lớp taxonomy (① Nguồn sự thật, ② Mơ hồ, ③ Ngoài phạm vi, ④ Đặc thù domain).
  - **§6. Bốn đường đi của trải nghiệm:** Thiết kế 4 luồng trải nghiệm (Happy path, Low-confidence, Failure/không căn cứ, Correction) và cách ứng xử khi bị đòi ngoài thẩm quyền.
  - **§7. Kiểm thử & Quality Bar:** Đưa ra 3 chiều định nghĩa kiểm chứng được, cơ cấu 20 cases Golden Set, chốt Quality Bar (≥ 85% trước 23:59 N1) và lập Bảng kết quả các lượt chạy.
  - **§8 & §9. Phân công & Changelog:** Phân công chi tiết 5 vị trí Lead/Co-pilot, lên danh sách 3 Willing users, xây dựng 3 câu hỏi phỏng vấn validation và quản lý nhật ký thay đổi Changelog.
- **Chủ trì thiết kế bộ Slide thuyết trình & Dẫn dắt buổi Demo thuyết trình live ([`demo-slides.pdf`](demo-slides.pdf)):**
  - Trực tiếp soạn thảo bộ Slide 6 trang và trực tiếp làm diễn giả chính thuyết trình bài Demo Pitching 5 phút trước Ban giám khảo tại CP6.
- **Phối hợp Co-pilot:** Cùng TV2 (Data Lead - Trần Thị Hường) đọc log khảo sát người dùng thực tế và cùng TV5 (Frontend Lead) ghép kịch bản thuyết trình Demo live tại CP6.

---

## 2. Công cụ AI đã sử dụng & Cách phối hợp (Vibe-coding)

- **AI đã dùng:** Dùng Gemini 3.6 Flash (High) trợ giúp brainstorm ý tưởng, gợi ý kịch bản HAX/PAIR, format Markdown, xây dựng nội dung thuyết trình Demo và check lỗi chính tả, ngữ pháp trong toàn bộ tài liệu sản phẩm.
- **Làm chủ sản phẩm (Vibe-coding):** AI chỉ hỗ trợ soạn nháp; tôi trực tiếp kiểm soát 100% nội dung `spec.md` (§1 - §9) & slide, hoàn toàn tự tin bảo vệ và giải thích chi tiết trước Ban giám khảo tại CP5/CP6.

---

## 3. Bài học lớn nhất từ Case Fail của chính nhóm

- **Case Fail thực tế tại Lượt chạy Eval 1:** Trong lượt chạy kiểm thử trọn bộ đầu tiên với 20 cases Golden Set, hệ thống chỉ đạt **70.0% (14/20 Pass)**. Nguyên nhân chính là do AI bị lệch trích dẫn số trang slide khi gặp bài giảng có trang bìa hoặc trang mục lục offset.
- **Bài học rút ra về Tư duy Sản phẩm AI:**
  1. *AI không phải là phép thuật hoàn hảo:* AI có thể trích dẫn sai nếu metadata RAG không được xử lý cẩn thận.
  2. *Tầm quan trọng của Thiết kế Đường lui (Graceful Degradation):* Việc tôi bổ sung nguyên tắc **HAX G9** (nút sửa trích dẫn thủ công / xem dạng bullet) trong §4b chính là chìa khoá giúp sản phẩm hoạt động mượt mà ngay cả khi AI gặp lỗi.
  3. *Tỷ lệ Đạt ấn tượng ở Lượt 2:* Nhờ giữ vững Quality Bar (≥ 85%) chốt từ N1, nhóm đã tập trung tối ưu lại RAG Metadata Indexing, nâng tỷ lệ đạt lên **90.0% tại Lượt 2 (18/20 Pass)**.

---

**Chữ ký xác nhận:**  
*Nguyễn Thị Thanh Hiền — Product, Spec & Demo Presenter Nhóm UADAYDCA*
