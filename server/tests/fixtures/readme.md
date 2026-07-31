# Kế hoạch nghiên cứu và xây dựng 20 test case Chat Tutor Pháp luật đại cương

## Tóm tắt

- Mục tiêu: thay bộ golden set giả lập bằng 20 case kiểm thử Chat Tutor/RAG dựa trực tiếp trên deck 199 slide “Pháp luật đại cương”.
- Cơ cấu đã chọn: **14 core + 6 niche**.
- Để khớp rubric: 20 case gồm **10 case thường, 6 case khó theo 4 lớp rủi ro và 4 case hiếm**; mỗi lớp rủi ro có ít nhất 2 case.
- Tối thiểu 10 case sẽ mô phỏng cách hỏi từ chatlog thật như câu ngắn, thiếu chủ ngữ, follow-up, bôi đen rồi hỏi và dùng từ đời thường; nội dung và đáp án vẫn lấy từ slide pháp luật.

## Danh mục 20 case dự kiến

| # | Nhóm | Lớp | Nội dung kiểm thử | Trang căn cứ/kỳ vọng |
|---|---|---|---|---|
| 1 | Core | ① Nguồn sự thật | Bôi đen đoạn và hỏi quan hệ giữa Nhà nước với pháp luật | 4 |
| 2 | Core | ① | Hỏi tự do về 5 đặc điểm cơ bản của Nhà nước | 18 |
| 3 | Core | ① | Giải thích chức năng đối nội và đối ngoại | 28 |
| 4 | Core | ④ Domain | Phân biệt Nhà nước đơn nhất và liên bang | 41–42 |
| 5 | Core | ① | Nêu khái niệm pháp luật theo slide | 55 |
| 6 | Core | ④ | Phân biệt pháp luật với đạo đức | 69–70 |
| 7 | Core | ④ | Phân biệt văn bản quy phạm pháp luật và văn bản áp dụng pháp luật | 94–96 |
| 8 | Core | ① | Phân biệt quan hệ pháp luật với quan hệ xã hội | 104 |
| 9 | Core | ④ | Phân biệt tuân thủ, sử dụng và áp dụng pháp luật | 125–128 |
| 10 | Core | ④ | Nêu các dấu hiệu của vi phạm pháp luật | 138–139 |
| 11 | Core | ④ | Trình bày bốn yếu tố cấu thành vi phạm pháp luật | 140–144 |
| 12 | Core | ① | Phân loại trách nhiệm pháp lý tương ứng với vi phạm | 146–148 |
| 13 | Core | ② Mơ hồ | Follow-up “Khi nào áp dụng hình thức thứ hai?” sau câu hỏi về hai hình thức thừa kế | 188–190, trọng tâm 189 |
| 14 | Core | ④ | Phân biệt Common Law và Civil Law | 170 |
| 15 | Niche | ② | Bôi đen một đoạn rồi hỏi ngắn “ý này nghĩa là gì?”; phải ưu tiên selection thay vì tìm toàn deck | Trang/block được chọn |
| 16 | Niche | ② | Câu follow-up dùng đại từ “nó/loại thứ hai/đặc điểm đó” nhưng history không đủ rõ; không được tự chọn sai khái niệm | Không trả lời võ đoán; chỉ trả lời nếu nguồn hỗ trợ rõ |
| 17 | Niche | ① | Hỏi một chủ đề hoàn toàn không có trong deck, ví dụ Kubernetes autoscaling | `no_basis`, không citation |
| 18 | Niche | ③ Ngoài phạm vi | Hỏi deadline/link nộp bài trên Discord | `no_basis`, không suy đoán |
| 19 | Niche | ③ | Yêu cầu tư vấn pháp lý cá nhân hoặc kết luận một người “chắc chắn phạm tội” từ dữ kiện không có trong deck | Từ chối kết luận/`no_basis`, không biến kiến thức bài giảng thành tư vấn |
| 20 | Niche | ① + ④ | Hỏi “pháp luật hiện hành năm 2026” đối với dữ liệu có dấu hiệu cũ trong slide | Không khẳng định tính cập nhật; chỉ nêu nội dung deck kèm đúng citation hoặc `no_basis` |

## Cách viết và chấm từng case

- Mỗi case có: `id`, `tier`, `rarity`, `taxonomy_layer`, `description`, `provenance`, `request`, `expected`.
- `request` giữ đúng schema API hiện tại: `question`, tùy chọn `selection`, `current_slide_id`, `history`.
- `expected` gồm:
  - HTTP status và `answered`/`no_basis`.
  - `grounded`.
  - Danh sách trang bắt buộc; cho phép citation phụ chỉ khi thực sự hỗ trợ câu trả lời.
  - Các ý bắt buộc phải có và các kết luận bị cấm.
  - Quy tắc confidence: `no_basis = 0`; case trả lời phải vượt ngưỡng cấu hình.
- PASS chỉ khi đồng thời đúng trạng thái, đúng căn cứ, không bịa kiến thức ngoài deck và citation chứa đủ trang bắt buộc.
- Citation accuracy là điều kiện cứng 100%; mục tiêu tổng thể giữ ở mức **≥85%**, tương đương ít nhất 17/20 case PASS.

## Thay đổi artifact và quy trình kiểm chứng

- Thay nội dung giả lập trong `eval/golden_set.json` bằng golden set pháp luật thật; đồng bộ hoặc mở rộng fixture `legal_deck_chat_cases.json`.
- Nâng runner để chấm thêm tier/lớp rủi ro, required concepts, forbidden claims và xuất kết quả từng case thay vì chỉ kiểm tra số trang.
- Kiểm chứng thủ công toàn bộ trang kỳ vọng trên deck; hai người chấm độc lập ít nhất 5 case khó/niche.
- Chạy đủ 20 case, lưu cả PASS lẫn FAIL, tính tỷ lệ chung và theo `core/niche` तथा theo bốn lớp rủi ro.
- Chọn một core case và một niche case ổn định cho demo live; giữ một case ngoài bộ làm “thẻ giám khảo”.

## Giả định đã chốt

- Golden set đánh giá **Chat Tutor + RAG + trích dẫn**, không đánh giá việc sinh Mindmap.
- “Core” là hành vi học viên thường dùng; “niche” là case biên có xác suất thấp nhưng hậu quả bịa nguồn hoặc sai kiến thức cao.
- Deck là nguồn sự thật duy nhất. Không dùng kiến thức pháp luật bên ngoài để sửa hoặc bổ sung nội dung slide.
- Chatlog thật chỉ dùng để lấy mẫu hành vi/cách diễn đạt; không đưa dữ liệu nhận dạng hoặc sao chép hội thoại dài vào golden set.
