# Reflection Cá Nhân — Vũ Ngọc Hùng

- **Họ và tên:** Vũ Ngọc Hùng
- **Mã học viên:** `2A202601722`
- **Nhóm:** Nhóm UADAYDCA — Lớp K4
- **Sản phẩm:** VLearn Mindmap Navigation (Tự động tóm tắt Slide thành Mindmap & Nhảy Slide)
- **Vai trò:** **AI Prompt & Eval Lead**

---

## 1. Vai trò & Phần việc cụ thể đảm nhận (Deliverable có tên)

Trong suốt 1.5 ngày diễn ra **Mini Hackathon AI (Batch 03)**, tôi đảm nhận vị trí **AI Prompt & Eval Lead** của Nhóm UADAYDCA với các deliverable trực tiếp đứng tên trách nhiệm:

- **Chủ trì Tích hợp toàn bộ Module Hệ thống & Đấu nối API (Frontend + Backend):**
  - Trực tiếp **chủ trì việc ghép nối và tích hợp trọn bộ các module** của hệ thống từ Frontend React ([`codebase/`](../codebase/)) tới Backend AI FastAPI ([`server/`](../server/)).
  - Trực tiếp đấu nối API RESTful xử lý các luồng gọi AI API thật, truyền nhận dữ liệu cấu trúc Mindmap JSON và RAG Citations giữa server và giao diện UI.
  - Tiến hành kiểm thử toàn bộ hệ thống (End-to-End Testing), rà soát và **fix sạch các lỗi tiềm ẩn/lỗi phát sinh** liên quan đến việc đồng bộ hai chiều (bấm node Mindmap -> UI tự động nhảy/trượt slide) và xử lý ngoại lệ khi API phản hồi chậm/lỗi.
- **Chủ trì Lên ý tưởng & Đề xuất Phân chia công việc:**
  - Lên ý tưởng cốt lõi cho sản phẩm (Mindmap Sync & Slide Navigation), chủ trì đề xuất ma trận phân công nhiệm vụ (RACI) chi tiết cho các thành viên trong nhóm tại [`spec.md`](../spec.md) §8 và [`README.md`](../README.md).
- **Chủ trì thiết kế System Prompt & RAG Context cho hệ thống:**
  - Xây dựng bộ **System Prompt ngặt nghèo** định hướng AI tự động trích xuất cấu trúc Mindmap dưới dạng JSON có gắn nhãn trích dẫn số trang chính xác (`[Trang N]`).
  - Phối hợp trực tiếp với TV4 (AI Backend Dev — Đỗ Thành Đạt) để nhúng System Prompt và RAG Context vào server FastAPI (`server/`), xử lý triệt để logic lọc lỗi và giữ nguyên thuật ngữ chuyên ngành AI (theo kịch bản chỗ khó lớp ④ trong [`spec.md`](../spec.md)).
- **Chủ trì xây dựng bộ Golden Set 20 cases kiểm thử ([`eval/golden_set.json`](../eval/golden_set.json)):**
  - Xây dựng 20 test cases bao phủ đủ **4 lớp chỗ khó**: ① Nguồn sự thật (10 cases), ② Mơ hồ / Thiếu thông tin (4 cases), ③ Ngoài phạm vi (2 cases), và ④ Đặc thù domain AI (4 cases).
  - Đưa vào các kịch bản bẫy thực tế như: Slide chứa hình vẽ không text (`CASE17`), Slide có trang bìa offset số trang (`CASE18`), câu hỏi đòi giải hộ bài tập hoặc ngoài phạm vi (`CASE19`, `CASE20`).
- **Xây dựng Script đo đạc kiểm thử tự động & Quản lý Quality Bar ([`eval/run_eval_verification.py`](../eval/run_eval_verification.py)):**
  - Trực tiếp viết script Python tự động hóa việc xác minh dữ liệu khảo sát từ `validation/survey_responses.csv` và tính toán tỷ lệ Pass/Fail của Golden Set.
  - Chủ trì thực thi 2 lượt chạy Eval:
    - **Lượt 1 (30/07 18:00):** Đạt **70.0% (14/20 Pass)** — Thấp hơn Quality Bar (85.0%), phát hiện lỗi trích dẫn sai trang do trang bìa offset.
    - **Lượt 2 (31/07 10:00):** Đạt **90.0% (18/20 Pass)** — Chính thức vượt **Quality Bar (≥ 85%)** chốt tại Spec N1 sau khi tối ưu RAG Indexing và bổ sung fallback transcript.

---

## 2. Công cụ AI đã sử dụng & Cách phối hợp (Vibe-coding)

- **AI đã dùng:** Dùng Gemini 3.6 Flash trợ giúp brainstorm các case bẫy cho Golden Set, tối ưu hóa cấu trúc System Prompt ngặt nghèo, hỗ trợ sinh script Python `run_eval_verification.py` và debug lỗi trượt event giữa Frontend - Backend.
- **Làm chủ sản phẩm (Vibe-coding):** AI chỉ hỗ trợ sinh dữ liệu mẫu và gợi ý script; tôi trực tiếp kiểm soát 100% cấu trúc `golden_set.json`, tự tay tinh chỉnh logic System Prompt, trực tiếp thực thi script đo eval và giải trình minh bạch toàn bộ số liệu tại mốc CP5/CP6.

---

## 3. Bài học lớn nhất từ Case Fail của chính nhóm

- **Case Fail thực tế tại Lượt chạy Eval 1:** Bộ Golden Set 20 cases ở lượt chạy đầu chỉ đạt **70.0% (14/20 Pass)**. Hai nguyên nhân lớn nhất đến từ:
  1. *Lỗi Offset số trang (`CASE18`):* Slide có 2 trang bìa/mục lục khiến RAG trích dẫn lệch 2 trang so với thực tế.
  2. *Slide toàn hình ảnh không text (`CASE17`):* AI không thể đọc được nội dung chữ để tạo trích dẫn trang.
- **Bài học rút ra về Tư duy AI Eval & Hệ thống:**
  1. *Eval-driven Development là kim chỉ nam:* Nhờ có bộ Golden Set 20 cases thiết kế đa dạng theo 4 lớp chỗ khó từ sớm, nhóm mới phát hiện ra lỗi offset số trang trước khi đem demo cho người dùng thực tế.
  2. *System Prompt ngặt nghèo cần đi kèm RAG Metadata chuẩn:* Phối hợp với AI Backend Dev để sửa lại logic Indexing metadata trang slide là chìa khóa quyết định giúp nâng tỷ lệ đạt lên **90.0% tại Lượt 2**.
  3. *Tầm quan trọng của Đường lui (Fallback):* Với bài giảng toàn hình ảnh, việc thêm luồng fallback đọc transcript lời giảng giúp hệ thống không bị crash mà vẫn cung cấp giá trị cho học viên.

---

**Chữ ký xác nhận:**  
*Vũ Ngọc Hùng — AI Prompt & Eval Lead Nhóm UADAYDCA*
