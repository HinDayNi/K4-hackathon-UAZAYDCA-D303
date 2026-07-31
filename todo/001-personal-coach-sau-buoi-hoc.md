# TODO 001 — Personal Coach sau buổi học

## 1. Bối cảnh

VLearn Tutor hiện tập trung chủ yếu vào trải nghiệm trong buổi học:

- giải thích nhanh đoạn học viên đang đọc;
- trả lời câu hỏi tại thời điểm học viên bị kẹt;
- gợi mở hoặc tạo một câu kiểm tra hiểu.

Sau khi buổi học kết thúc, các tín hiệu như câu hỏi đã hỏi, đoạn đã ghi chú và lỗi từng mắc chưa được tái sử dụng. Tutor vì thế chưa tạo được lý do đủ mạnh để học viên quay lại.

Vai trò mong muốn:

| Thời điểm | Vai trò Tutor | Nhiệm vụ |
|---|---|---|
| Trong buổi học | Trợ lý tức thời | Giải thích, gợi mở và hỗ trợ khi học viên bị kẹt |
| Sau buổi học | Huấn luyện viên cá nhân | Nhớ điểm hổng, hỏi lại, giúp sửa hiểu lầm và theo dõi phần cần ôn |

## 2. Painpoint

> Sau buổi học, học viên không biết phần nào mình chưa thực sự hiểu và phải tự ôn lại toàn bộ tài liệu, trong khi những câu hỏi, ghi chú và lỗi đã xuất hiện trong buổi học không được sử dụng để tạo một phiên ôn tập phù hợp.

Các biểu hiện:

- học viên không biết nên ôn lại phần nào;
- tương tác trong lớp bị mất giá trị sau khi cuộc trò chuyện kết thúc;
- AI giải thích nhưng không xác nhận học viên đã hiểu;
- học viên không nhìn thấy lỗi hiểu cụ thể của mình;
- Tutor thiếu tính liên tục và cá nhân hóa;
- không có lý do rõ ràng để học viên quay lại sau giờ học.

Lưu ý: “Học viên không hứng thú dùng Tutor sau buổi học” là triệu chứng. Nguyên nhân sâu hơn là Tutor chưa tạo được giá trị tiếp nối từ dữ liệu phát sinh trong lớp.

## 3. Giải pháp đề xuất

Xây dựng **VLearn Personal Coach — Phiên ôn tập sau buổi học**.

Sau mỗi bài học, Tutor sử dụng tín hiệu của chính học viên để chọn tối đa ba kiến thức cần kiểm tra lại và tạo một phiên ôn tập khoảng năm phút.

Thông điệp kích hoạt gợi ý:

> Hôm nay bạn đã hỏi về 3 khái niệm. Mình đã chuẩn bị một phiên kiểm tra 5 phút để xem những chỗ đó đã thực sự rõ chưa.

### Lát cắt một câu

> Sau buổi học, VLearn chọn tối đa ba Knowledge Components cần ôn dựa trên câu hỏi và ghi chú của một học viên, sau đó tạo một phiên kiểm tra 5 phút có tiêu chí chấm rõ ràng, gợi ý khi sai và xác nhận lại mức hiểu.

### Một user · một việc · một quyết định AI · một kết quả

- **User:** học viên vừa kết thúc một bài học.
- **Công việc:** xác định và ôn đúng phần mình chưa vững.
- **Quyết định AI:** chọn Knowledge Component cần kiểm tra dựa trên tín hiệu trong lớp.
- **Kết quả:** học viên biết phần nào đã hiểu và phần nào cần ôn tiếp.

## 4. Tiếp cận bottom-up

Không để AI nhận một đoạn bất kỳ rồi tự tạo quiz không có mục tiêu đo lường rõ ràng.

Nhóm đóng vai trò giảng viên và định nghĩa trước một tập Knowledge Components nhỏ. Mỗi quiz phải truy ngược được theo chuỗi:

```text
Quiz → Learning objective → Knowledge Component → Đoạn bài giảng
```

Mỗi Knowledge Component phải có:

- một kiến thức chính;
- một learning objective;
- một mức độ nhận thức;
- một rubric chấm rõ ràng;
- một hoặc hai misconception thường gặp;
- các đoạn bài giảng làm nguồn sự thật.

Ví dụ:

```yaml
knowledge_component: Product–Market Fit
learning_objective: Phân biệt Product–Market Fit với chất lượng sản phẩm
cognitive_level: Apply
assessment_criteria:
  - Đề cập nhu cầu của thị trường
  - Đề cập mức độ sản phẩm đáp ứng nhu cầu
  - Không đồng nhất PMF với số lượng tính năng
common_misconceptions:
  - Sản phẩm có nhiều tính năng tốt nghĩa là đã có PMF
source_segments:
  - T01-017
  - T01-019
  - T01-020
```

## 5. Luồng trải nghiệm

### Trong buổi học

Ghi nhận các tín hiệu:

- khái niệm học viên từng hỏi;
- đoạn học viên đã đánh dấu hoặc ghi chú;
- câu trả lời sai hoặc chưa đầy đủ;
- số lần học viên phải hỏi lại;
- Knowledge Component liên quan;
- mức độ chắc chắn của việc ánh xạ tín hiệu vào Knowledge Component.

### Sau buổi học

1. Tutor chọn tối đa ba Knowledge Components có tín hiệu mạnh nhất.
2. Tutor tạo một câu hỏi cho từng Knowledge Component dựa trên learning objective và rubric đã định nghĩa.
3. Học viên tự trả lời trước khi nhận lời giải.
4. Tutor chấm thành `Đã hiểu`, `Hiểu một phần` hoặc `Chưa hiểu`.
5. Nếu chưa đạt, Tutor xác định đúng một misconception hoặc tiêu chí còn thiếu.
6. Tutor đưa một gợi ý nhỏ, có trích dẫn, chưa tiết lộ đáp án hoàn chỉnh.
7. Học viên thử lại bằng một câu hỏi biến thể.
8. Tutor cập nhật trạng thái Knowledge Component thành `Đã hiểu` hoặc `Cần ôn`.
9. Kết thúc phiên bằng bản tóm tắt ngắn:
   - số kiến thức đã vững;
   - số kiến thức cần ôn;
   - đoạn bài giảng liên quan cho từng phần cần ôn.

## 6. Peer insight

Ý tưởng:

> Hai bạn khác trong lớp cũng bị kẹt đúng chỗ bạn hỏi hôm nay. Bạn muốn xem một cách hiểu khác không?

Giá trị:

- giảm cảm giác “chỉ mình không hiểu”;
- tăng tính xã hội;
- cung cấp thêm cách diễn đạt;
- tạo thêm lý do tương tác với Tutor.

Rủi ro:

- câu trả lời của học viên khác có thể sai;
- chia sẻ nguyên văn cần consent và cơ chế bảo vệ riêng tư;
- cần moderation và đánh giá chất lượng;
- dữ liệu hackathon không được dùng như dữ liệu công khai;
- clustering câu hỏi và câu trả lời là một bài toán riêng.

Quyết định cho hackathon:

- không hiển thị nguyên văn câu trả lời của học viên khác;
- chỉ hiển thị số lượng bằng dữ liệu giả và ghi rõ là mock;
- nếu người dùng muốn xem, AI tạo một cách giải thích tổng hợp đã được grounding vào bài giảng;
- peer insight chỉ là chi tiết phụ, không phải lõi của feature.

## 7. Scope hackathon

### Bắt buộc

- một bài học;
- ba Knowledge Components được định nghĩa thủ công;
- mỗi Knowledge Component có learning objective, rubric, misconception và nguồn;
- tín hiệu giả lập hoặc lấy từ tương tác trong phiên hiện tại;
- AI chọn Knowledge Component cần ôn;
- một vòng `trả lời → phát hiện lỗi → gợi ý → thử lại`;
- kết quả cuối phiên gồm `Đã hiểu` và `Cần ôn`;
- ít nhất một lời gọi AI chạy thật.

### Không làm

- sinh lại slide;
- tự động trích xuất toàn bộ Knowledge Components của khóa học;
- bản đồ kiến thức toàn khóa;
- spaced repetition kéo dài nhiều ngày;
- dashboard dành cho giảng viên;
- chia sẻ câu trả lời thật giữa học viên;
- peer-answer marketplace;
- gamification, streak hoặc bảng xếp hạng;
- phân tích toàn bộ lịch sử hội thoại của mọi bài học.

## 8. Kịch bản demo 5 phút

1. Trong lớp, học viên hỏi về Product–Market Fit và đánh dấu một đoạn liên quan.
2. Sau lớp, Personal Coach thông báo đã phát hiện đây là kiến thức cần kiểm tra lại.
3. Tutor đặt một câu hỏi dựa trên Knowledge Component và learning objective đã định nghĩa.
4. Học viên trả lời theo một misconception đã biết trước.
5. Tutor chỉ ra lỗi, trích dẫn nguồn và đưa một gợi ý.
6. Học viên trả lời câu kiểm tra lại.
7. Trạng thái chuyển từ `Cần ôn` thành `Đã hiểu`.
8. Hiển thị peer insight dạng mock: “Hai học viên khác cũng gặp khó ở phần này”.
9. Kết thúc bằng tổng kết: `2/3 kiến thức đã vững · 1 kiến thức cần ôn`.

## 9. Tiêu chí nghiệm thu

- Mỗi quiz ánh xạ tới đúng một Knowledge Component.
- Mỗi quiz có đúng một learning objective và một mức độ nhận thức.
- Rubric có các tiêu chí chấm kiểm tra được, không chấm theo cảm tính.
- Tutor không dùng kiến thức ngoài các đoạn nguồn được khai báo.
- Khi học viên trả lời sai, Tutor chỉ ra được tiêu chí còn thiếu hoặc một misconception đã định nghĩa.
- Tutor đưa gợi ý trước, không lộ đáp án hoàn chỉnh ngay.
- Câu kiểm tra lại khác câu đầu nhưng đo cùng learning objective.
- Kết quả cuối cho học viên biết rõ phần đã hiểu và phần cần ôn.
- Peer insight không tiết lộ câu trả lời hoặc danh tính học viên thật.
- Toàn bộ happy path demo được trong tối đa năm phút.

## 10. Việc cần thực hiện tiếp

- [ ] Chọn một bài học dùng cho demo.
- [ ] Định nghĩa ba Knowledge Components quan trọng nhất.
- [ ] Viết learning objective, cognitive level và rubric cho từng Knowledge Component.
- [ ] Liệt kê một đến hai misconception cho từng Knowledge Component.
- [ ] Gắn mỗi Knowledge Component với các đoạn bài giảng nguồn.
- [ ] Chuẩn bị ba tín hiệu trong lớp tương ứng với ba Knowledge Components.
- [ ] Thiết kế logic xếp hạng và chọn tối đa ba Knowledge Components cần ôn.
- [ ] Thiết kế prompt sinh câu hỏi theo cấu trúc đã định nghĩa.
- [ ] Thiết kế prompt chấm theo rubric và phát hiện misconception.
- [ ] Thiết kế vòng gợi ý và câu kiểm tra lại.
- [ ] Chuẩn bị dữ liệu mock cho peer insight.
- [ ] Tạo golden set tối thiểu 20 case theo rubric hackathon.
- [ ] Validation với ít nhất ba học viên ngoài nhóm.

## 11. Câu hỏi validation

- Sau một buổi học, bạn thường xác định phần cần ôn bằng cách nào?
- Bạn có từng hỏi AI trong lớp nhưng sau đó quên ôn lại đúng phần đó không?
- Một phiên ôn tập năm phút dựa trên chính câu hỏi của bạn có khiến bạn quay lại không? Vì sao?
- Khi trả lời sai, bạn muốn nhận đáp án ngay hay nhận gợi ý rồi thử lại?
- Việc biết những người khác cũng bị kẹt tại cùng khái niệm có hữu ích không?
- Bạn có đồng ý cho hệ thống dùng câu trả lời đã ẩn danh của mình để giúp học viên khác không?

## 12. Giả thuyết cần kiểm chứng

> Nếu VLearn sử dụng câu hỏi và ghi chú trong buổi học để tạo một phiên ôn tập cá nhân hóa sau giờ học, học viên sẽ xác định được lỗ hổng nhanh hơn và có lý do rõ ràng hơn để quay lại sử dụng Tutor.

Chỉ số gợi ý:

- tỷ lệ học viên bắt đầu phiên ôn tập;
- tỷ lệ hoàn thành phiên;
- tỷ lệ trả lời đúng sau một vòng gợi ý;
- thời gian để xác định phần cần ôn;
- tỷ lệ học viên cho rằng phiên ôn “đúng phần mình chưa hiểu”;
- ý định quay lại sử dụng trong buổi học tiếp theo.
