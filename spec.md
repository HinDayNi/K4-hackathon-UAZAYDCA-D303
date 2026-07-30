# AI SPEC — VLearn Mindmap Navigation (Tự động tóm tắt Slide thành Mindmap & Nhảy Slide) · Nhóm UADAYDCA
Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở
Loại: [ ] Tối ưu tính năng có sẵn  [x] Tính năng mới

## §1. User & Job
- **Job executor + workflow (đính kèm worksheet JTBD / ảnh sơ đồ):** Học viên khoá học AI Thực Chiến đang xem/ôn tập lại bộ slide bài giảng dài trên nền tảng VLearn trước buổi thực hành hoặc bài test quiz.
- **Core JTBD (không tên sản phẩm/AI trong câu):** Nắm bắt nhanh bức tranh tổng quan kiến thức bài học và định vị mối liên hệ giữa các khái niệm cốt lõi mà không phải tự lật đọc lại từng trang slide dài nhiều chữ.
- **Problem statement (KHÔNG chữ AI):** Học viên đang ôn tập bộ slide bài giảng dài vướng phải tình trạng slide chứa quá nhiều chữ và kiến thức bị chia nhỏ manh mún, dẫn đến tốn 30-45 phút tự ghi chép tóm tắt lại ra vở mà vẫn khó tổng hợp được hệ thống kiến thức cốt lõi.
- **Evidence (chuẩn A và/hoặc B — log đầy đủ trong repo):** Bằng chứng Chuẩn A từ Khảo sát n = 27 người ngoài nhóm (Log lưu tại `validation/survey_responses.csv`):
  - **Số liệu mining / kết quả khảo sát (n = 27 người, % xác nhận = 96.3%):**
    * **55.6% học viên (15/27 người)** xác nhận khó khăn lớn nhất là: *"Slide quá nhiều chữ, khó nắm bắt bức tranh tổng quan và mối liên hệ giữa các phần"*.
    * **37.0% học viên (10/27 người)** xác nhận: *"Tốn nhiều thời gian tự tóm tắt lại kiến thức ra vở hoặc file ghi chú"*.
    * **3.7% học viên (1/27 người)** phản ánh: *"Nội dung chia nhỏ qua quá nhiều trang slide gây manh mún, khó nhớ"*.
    * **Kỳ vọng giải pháp:** **37.0% học viên (10/27)** muốn tóm tắt dạng Cây thư mục kiến thức (Chương -> Bài -> Khái niệm), **55.6% học viên (15/27)** muốn tính năng tương tác hai chiều: Bấm nút trên sơ đồ -> Giao diện tự động nhảy/trượt ngay đến trang slide chứa câu trả lời tương ứng.
  - **≥5 quote/ví dụ nguyên văn + nguồn (từ Form khảo sát):**
    1. *Quote 1 (HV khảo sát lúc 16:20:06):* "Slide quá nhiều chữ, khó nắm bắt bức tranh tổng quan và mối liên hệ giữa các phần. Mình muốn bấm vào 1 nút trên Mindmap -> Giao diện tự nhảy đến đúng Slide đó."
    2. *Quote 2 (HV khảo sát lúc 16:32:21):* "Tốn nhiều thời gian tự tóm tắt lại kiến thức ra vở hoặc file ghi chú. Cần cho phép bấm vào từng nhánh trên Mindmap để mở nhanh đoạn slide tương ứng."
    3. *Quote 3 (HV khảo sát lúc 17:04:38):* "Nhiều lúc không hiểu slide nói gì. Rất cần slide tự động highlight (tô sáng) đúng đoạn văn bản/hình ảnh chứa đáp án."
    4. *Quote 4 (HV khảo sát lúc 17:06:26):* "Nội dung chia nhỏ qua quá nhiều trang slide gây manh mún, khó nhớ. Muốn màn hình bài học tự động trượt/nhảy ngay đến trang slide chứa câu trả lời."
    5. *Quote 5 (HV khảo sát lúc 16:44:11):* "Tốn thời gian tự tóm tắt kiến thức. Mong muốn hỏi AI một câu -> AI vừa trả lời, vừa nhảy slide, vừa vẽ nhánh Mindmap tương ứng."

## §2. Impact & quyết định chọn
- **Bảng impact ≥3 ứng viên (bao nhiêu người · tần suất · tốn gì mỗi lần · khả thi):**

| Ứng viên Bài toán | Số người gặp (từ evidence) | Tần suất | Tốn gì mỗi lần | Khả thi trong hackathon | Đã loại / Chọn |
|---|:---:|:---:|:---:|:---:|:---:|
| **1. Mindmap Sync & Slide Navigation (Giao diện Mindmap liên kết Slide)** | 26/27 người (96.3%) | 2-3 lần/buổi học | 30-45 phút tự tóm tắt & lội slide | Rất cao (Dùng Mermaid.js + RAG Metadata) | **CHỌN** (Impact cao nhất + Evidence khảo sát 96.3%) |
| **2. AI Tutor Sinh Quiz Tự động cuối buổi** | 15/28 người (53.6%) | 1 lần/buổi học | 15 phút làm test thử | Cao (Prompting sinh JSON Quiz) | **LOẠI** (Tần suất và mức độ tốn thời gian thấp hơn) |
| **3. Tóm tắt Bài giảng thành Audio Podcast** | 5/28 người (17.9%) | 1 lần/tuần | 20 phút nghe lại | Thấp (Phải tích hợp TTS API, tốn latency) | **LOẠI** (Khả thi thấp trong thời gian hackathon) |

- **Ứng viên ĐÃ LOẠI + vì sao:** 
  * Loại ứng viên #2 vì nhu cầu luyện quiz chỉ phát sinh sát ngày thi, trong khi nhu cầu xem slide và tóm tắt diễn ra hàng ngày sau mỗi buổi học.
  * Loại ứng viên #3 vì khả năng xây dựng và kiểm thử voice/audio trong 1.5 ngày quá rủi ro về mặt kỹ thuật.
- **Ứng viên CHỌN + vì sao (bằng số):** Chọn **Mindmap Sync & Slide Navigation** vì có **92.9% học viên khảo sát xác nhận nỗi đau**, giúp giảm ngay 30 phút tự ghi chép mỗi buổi học cho ~1.000 học viên khoá học.

## §3. Giải pháp tương tự đã nghiên cứu
- **NotebookLM (Google):** 
  * *Flow:* Upload tài liệu -> Tự động tạo Study Guide & Mindmap tổng quan.
  * *Đáng học:* Luôn hiển thị Citation [N] nhấp vào được để xem trích dẫn gốc bên pane trái.
  * *Đáng né:* Mindmap chỉ dạng văn bản tĩnh, không tương tác nhảy giao diện hai chiều.
  * *Mình khác gì:* VLearn Mindmap cho phép bấm vào từng node trên Mindmap thì màn hình đọc slide tự trượt trôi (smooth scroll) ngay đến trang slide đó.
- **Khanmigo (Khan Academy):**
  * *Flow:* Chatbot hỗ trợ bên cạnh video/slide bài giảng.
  * *Đáng học:* Tự động gợi ý câu hỏi mở theo bối cảnh trang bài học hiện tại.
  * *Đáng né:* Không có hình họa tổng quan (visual map) làm học viên dễ lạc trong hội thoại chat dài.
  * *Mình khác gì:* Cung cấp luồng đôi (Dual-view): Nhánh sơ đồ cây ở bên cạnh giúp nắm tổng quan + Khung chat giải thích chi tiết khi bấm vào node.

## §4. Thiết kế
- **Lát cắt MỘT CÂU (1 user · 1 việc · 1 quyết định AI · 1 kết quả):**
  > `1 học viên xem slide bài giảng dài trên VLearn · 1 việc nắm bắt nhanh bức tranh tổng quan kiến thức bài học · 1 quyết định AI tự phân tích cấu trúc bài giảng để dựng cây sơ đồ tư duy (Mindmap) có trích dẫn số trang · 1 kết quả sơ đồ Mindmap trực quan cho phép bấm vào từng nhánh để tự động nhảy đến đúng trang slide tương ứng`
- **Non-goals (≥3 thứ KHÔNG build):**
  1. KHÔNG build tính năng chỉnh sửa sơ đồ Mindmap bằng tay (chỉ hiển thị sơ đồ AI sinh ra).
  2. KHÔNG build tính năng xuất file Mindmap ra PDF/PNG.
  3. KHÔNG tích hợp giọng nói (Voice/TTS) đọc bài tóm tắt.
- **Mức prototype nhắm tới:** [ ] Sketch [ ] Mock [x] Working — phần nào mock, phần nào thật: phần mock: giao diện LMS giả lập; phần thật: Lời gọi AI API sinh cấu trúc Mindmap JSON & RAG trích dẫn trang thật 100%.
- **Automation:** [ ] augment [x] conditional [ ] automate — lý do theo cost-of-error: AI tự động vẽ Mindmap cho các bài học có transcript/slide chuẩn; nếu bài học bị thiếu metadata trang, hệ thống cảnh báo và yêu cầu chọn chế độ tóm tắt thủ công.
- **§4b. Nguyên tắc đã áp dụng (≥4 — HAX/PAIR, xem guide):**

| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **G1 — Làm rõ hệ thống làm được gì** | Header cửa sổ Mindmap ghi rõ: *"Sơ đồ cây kiến thức được AI tự động tổng hợp từ Slide bài giảng Ngày X. Bấm vào từng nhánh để mở trang Slide gốc."* |
| **G2 — Làm rõ nó làm tốt đến đâu** | Cạnh mỗi node trên Mindmap đều gắn nhãn `[Trang N]`. Khi di chuột vào node, hiển thị tooltip câu trích dẫn nguyên văn từ slide để user đánh giá độ tin cậy. |
| **G10 — Thu hẹp phạm vi khi nghi ngờ** | Khi AI không chắc chắn về mối liên hệ giữa 2 khái niệm (confidence score < 70%), node trên Mindmap sẽ hiển thị nét đứt kèm nút *"Hỏi AI làm rõ mối liên hệ này"*. |
| **G9 — Sửa dễ dàng (PAIR Feedback)** | Bên dưới sơ đồ Mindmap có nút *"Báo sai trích dẫn"* và nút *"Tải lại sơ đồ"*, cho phép học viên bỏ qua sơ đồ lỗi và xem danh sách tóm tắt dạng bullet chuẩn. |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản (≥8) [bảng theo guide §2.5]

| STT | Tình huống cụ thể | Lớp chỗ khó | Hành vi mong muốn của sản phẩm | Nguyên tắc áp dụng |
|:---:|---|:---:|---|:---:|
| 1 | AI tự bịa ra node kiến thức không có trong Slide | ① Nguồn sự thật | Kiểm tra RAG metadata; nếu node không map được số trang slide cụ thể -> Tự động loại bỏ node đó khỏi Mindmap. | G2 |
| 2 | Slide bài giảng toàn hình ảnh/sơ đồ không có text | ① Nguồn sự thật | AI phát hiện thiếu text -> Hiển thị thông báo: *"Bài giảng dạng hình ảnh, sơ đồ được tạo dựa trên Transcript lời giảng."* | G1 |
| 3 | Học viên yêu cầu vẽ Mindmap cho bài giảng 100 trang quá dài | ② Mơ hồ/Thiếu thông tin | AI chủ động hỏi lại: *"Bạn muốn tạo Mindmap tổng quan toàn bài hay chỉ tóm tắt Phần 1 / Phần 2?"* | G10 |
| 4 | Slide dùng từ ngữ viết tắt hoặc thuật ngữ chuyên ngành khó | ④ Đặc thù domain | AI giữ nguyên thuật ngữ chuẩn của khoá học (vd: RAG, Fine-tuning, Agentic) kèm chú thích ngắn, không tự dịch thô sang tiếng Việt làm sai nghĩa. | PAIR Mental Model |
| 5 | Học viên gõ hỏi deadline nộp bài tập ngay trong khung Mindmap | ③ Ngoài phạm vi | AI phản hồi: *"Mindmap chỉ hỗ trợ tóm tắt kiến thức slide. Để xem deadline nộp bài, vui lòng kiểm tra kênh Announcement trên Discord."* | G10 |
| 6 | Kết nối API bị ngắt giữa chừng khi đang vẽ sơ đồ | Trục trặc kỹ thuật | Khung Mindmap hiển thị Skeleton Loading và nút *"Thử lại"*, giữ nguyên bản tóm tắt text đã tạo trước đó. | PAIR Errors |
| 7 | Nhánh Mindmap có quá nhiều node nhỏ gây rối mắt | 💡 Trải nghiệm UX | Giới hạn tối đa 3 cấp độ nhánh (Chương -> Bài -> Khái niệm). Nút `+` mở rộng các node phụ khi cần. | G8 |
| 8 | Học viên bấm vào node nhưng trang slide tương ứng đã bị xoá | ① Nguồn sự thật | Giao diện không trượt vô định, hiển thị thông báo nhẹ: *"Trang slide này đã được cập nhật, hiển thị đoạn trích dẫn văn bản tương ứng."* | G9 |

## §6. Bốn đường đi của trải nghiệm
- **Happy path:** Học viên mở bài học -> Hệ thống hiển thị sơ đồ Mindmap ở sidebar -> Học viên bấm vào node "Few-shot Prompting" -> Giao diện đọc bài học trượt mượt (smooth scroll) ngay đến Trang 14 Slide và tô sáng (highlight) đoạn định nghĩa Few-shot.
- **Low-confidence (②):** Học viên chọn tóm tắt một bài đọc tham khảo ngoài slide -> AI phát hiện độ tin cậy trích dẫn < 70% -> Hiển thị Mindmap với các node màu vàng kèm thông báo: *"Dữ liệu từ tài liệu ngoài, vui lòng kiểm tra trích dẫn đính kèm."*
- **Failure/không căn cứ (①):** Khi slide chứa thông tin mâu thuẫn -> AI không vẽ node bừa bãi mà hiển thị khung cảnh báo: *"Có 2 khái niệm trái chiều ở Trang 5 và Trang 12, bấm vào đây để so sánh hai trang."*
- **Correction (user sửa):** Học viên thấy node gán sai trang slide -> Bấm vào icon ✏️ cạnh node -> Chọn "Đổi trích dẫn sang Trang N" -> AI cập nhật ngay liên kết mới.
- **Khi bị đòi ngoài phạm vi (③):** Học viên yêu cầu giải bài tập nộp điểm -> AI từ chối giải hộ, chỉ hiển thị nhánh Mindmap chứa kiến thức nền tảng tương ứng trong slide để học viên tự làm.
- **Case đặc thù domain (④):** Tránh tuyệt đối dịch sai thuật ngữ AI (vd: "Prompt" dịch thành "Lời nhắc nhở", "Token" dịch thành "Thẻ bài") -> Giữ nguyên thuật ngữ chuẩn ngành.

## §7. Kiểm thử
- **Chiều chất lượng + định nghĩa kiểm chứng được:**
  1. *Tính chính xác trích dẫn (Citation Accuracy):* 100% các node trên Mindmap phải trỏ đúng số trang slide chứa thông tin đó (Người ngoài kiểm tra bấm node -> Slide hiện ra đúng kiến thức = PASS).
  2. *Độ đầy đủ kiến thức (Completeness):* Sơ đồ phủ đủ ≥80% các khái niệm chính trong slide bài giảng.
  3. *Tốc độ phản hồi (Latency):* Thời gian sinh sơ đồ Mindmap < 3.0 giây.
- **Golden set (≥20 case theo cơ cấu trong guide §2.6, file trong eval/):** 20 cases lưu tại `eval/golden_set.json`:
  * 8 cases bài giảng chuẩn (Slide 15-40 trang trong `data/vlearn-pack`).
  * 4 cases bài giảng ngắn (<10 trang) và bài giảng dài (>50 trang).
  * 4 cases bài giảng chứa nhiều code/công thức toán.
  * 4 cases bẫy (Slide không text, slide chứa thông tin thiếu/mơ hồ).
- **Quality bar (chốt từ 23:59, giữ nguyên sau đó):** "Đạt khi ≥ 85% qua bộ Golden Set, 100% node trên Mindmap trỏ đúng số trang slide thật, và Latency < 3.5s."
- **Kết quả các lượt chạy (bảng % — cập nhật đến trước CP6):**

| Lượt chạy | Ngày/Giờ | Số case | Pass/Fail | % Đạt | Nguyên nhân chính của case lỗi | Đã sửa gì |
|:---:|:---:|:---:|:---:|:---:|---|---|
| Lượt 1 | 30/07 18:00 | 20 | 14 Pass / 6 Fail | 70.0% | AI trích dẫn sai số trang khi slide có trang bìa | Tối ưu lại RAG Metadata Indexing |
| Lượt 2 | 31/07 10:00 | 20 | 18 Pass / 2 Fail | 90.0% | 2 case slide chứa hình vẽ không trích văn bản được | Thêm đường lui hiển thị transcript |

## §8. Phân công & kế hoạch
- **Phân công có tên: spec / evidence / prompt / code / demo:**

| STT | Vai trò | Trách nhiệm CHỦ TRÌ (Deliverable chính) | Trách nhiệm PHỐI HỢP (Co-pilot) | Kiến thức nhận được |
|:---:|---|---|---|---|
| **1** | **Product, Spec & Demo Presenter**<br>Nguyễn Thị Thanh Hiền (`2A202601150`) | • Viết trọn bộ `spec.md` từ §1 đến §9<br>• Soạn `demo-slides.pdf` (Slide thuyết trình)<br>• Dẫn dắt buổi Demo thuyết trình live | • Cùng TV2 đọc log khảo sát/mining<br>• Cùng TV5 ghép kịch bản thuyết trình Demo | Nắm chắc **Tư duy sản phẩm, Thiết kế HAX/PAIR & Kỹ năng Demo Pitching** |
| **2** | **Data & Validation Lead**<br>Trần Thị Hường (`2A202601648`) | • Quản lý dữ liệu Mining / Khảo sát<br>• Tạo `validation/` (Feedback log ≥5 người)<br>• Bảng Impact 3 ứng viên & HAX/PAIR | • Cùng TV1 làm rõ Evidence chuẩn A/B<br>• Hỗ trợ làm Slide thuyết trình | Nắm chắc **Bằng chứng thị trường & Validation với User thật** |
| **3** | **AI Prompt & Eval Lead**<br>Vũ Ngọc Hùng (`2A202601722`) | • Thiết kế System Prompt & RAG Context<br>• Xây dựng `eval/` (Golden Set ≥20 case)<br>• Đo % Quality Bar & Phân tích lỗi | • Cùng TV4 nhúng Prompt vào Code<br>• Cùng TV1 chốt 4 lớp chỗ khó (①②③④) | Nắm chắc **Kỹ thuật Prompting, System Prompt & Đo đạc Evals** |
| **4** | **AI Backend Developer**<br>Đỗ Thành Đạt (`2A202601278`) | • Viết code `codebase/` xử lý logic & gọi AI API thật (Gemini/OpenAI)<br>• Xử lý RAG / Citations / Logic lọc lỗi | • Cùng TV3 tối ưu latency & token<br>• Cùng TV5 nối API vào giao diện UI | Nắm chắc **Kiến trúc Kỹ thuật AI, API, RAG & Logic xử lý** |
| **5** | **Frontend Developer**<br>Nguyễn Công Việt Quang (`2A202601586`) | • Xây dựng giao diện `codebase/` (UI bấm được, hiển thị trích dẫn [trang N]) | • Cùng TV4 ghép API vào giao diện<br>• Cùng TV1 chuẩn bị bài thuyết trình | Nắm chắc **Trải nghiệm Người dùng (UX/UI) & Kết nối Frontend UI** |

- **Willing users (≥3 tên) + kế hoạch vòng validation CP5 (3 câu hỏi, ai log):**
  * **Willing users (3 học viên ngoài nhóm):** Nguyễn Văn Hùng (`@hung_k4`), Lê Thị Mai (`@mai_le`), Trần Hoàng Nam (`@nam_th`).
  * **3 câu hỏi phỏng vấn user (Trần Thị Hường log feedback vào `validation/`):**
    1. *"Sơ đồ Mindmap này có giúp bạn nắm bài nhanh hơn việc lội slide không?"*
    2. *"Khi bấm vào nhánh Mindmap, slide nhảy đến có chính xác đoạn bạn cần tìm không?"*
    3. *"Bạn có phát hiện node nào AI tự vẽ ra mà trong slide không có không?"*
- **Multi-prototype (nếu làm):** Không áp dụng (tập trung tối ưu 1 phương án duy nhất là Mindmap Sync & Slide Navigation).

## §9. Changelog
| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|:---:|---|---|
| 30/07 17:10 | Khởi tạo Spec v1.0 | Chốt Lát cắt từ kết quả khảo sát 20 học viên thực tế |
| 30/07 21:00 | Thêm quy tắc HAX G10 & Đường lui cho slide toàn hình ảnh | Theo góp ý tại mốc CP2 |
