# Reflection Cá Nhân — Đỗ Thành Đạt

- **Họ và tên:** Đỗ Thành Đạt
- **Mã học viên:** `2A202601278`
- **Nhóm:** Nhóm UADAYDCA — Lớp K4
- **Sản phẩm:** VLearn Mindmap Navigation (Tự động tóm tắt Slide thành Mindmap & Nhảy Slide)
- **Vai trò:** **AI Backend Developer**

---

## 1. Vai trò và phần việc cụ thể đảm nhận

Trong Mini Hackathon AI (Batch 03), tôi phụ trách xây dựng phần backend và các luồng AI cốt lõi của sản phẩm. Những deliverable chính của tôi gồm:

- **Khởi tạo backend FastAPI:** Tôi thiết kế cấu trúc theo các lớp API, schema, service, repository và core; cấu hình SQLite, Docker, biến môi trường, health check và dữ liệu demo. Cấu trúc này tạo nền tảng để frontend có thể tích hợp qua REST API và giúp nhóm tiếp tục phát triển các tính năng độc lập.
- **Xây dựng pipeline nhập và xử lý bài giảng:** Tôi triển khai API upload deck, job theo dõi trạng thái, trích xuất nội dung từ PPTX theo slide và block, lưu dữ liệu vào SQLite, đồng thời hỗ trợ retry khi quá trình ingest thất bại.
- **Phát triển AI Tutor có RAG và citation:** Tôi xây dựng retrieval, query expansion, reranking, sinh câu trả lời có căn cứ và trả citation về đúng slide/block. Hệ thống có thể từ chối trả lời khi tài liệu không có cơ sở, thay vì cố tạo ra một câu trả lời nghe có vẻ hợp lý.
- **Phát triển dịch vụ tóm tắt và mindmap:** Tôi triển khai tóm tắt ở cấp block/slide, tạo mindmap từ toàn bộ deck, lưu artifact để API `GET` không phải gọi lại AI, đồng thời bổ sung endpoint và script tạo lại mindmap khi cần.
- **Thiết kế cơ chế importance scoring:** Tôi tách phần AI nhận diện tín hiệu như tính nền tảng, mức độ nhấn mạnh, khả năng áp dụng và quan hệ prerequisite; phần backend tính điểm cuối bằng rubric cố định. Tôi cũng giới hạn tối đa 30% topic được gắn nhãn `important` để tránh tình trạng “mọi thứ đều quan trọng”.
- **Kiểm soát chi phí và lỗi AI:** Tôi đặt token budget, timeout, giới hạn kích thước payload, kiểm tra `finish_reason`, xử lý response JSON bị cắt và không tự retry mù quáng. Với mindmap, tôi chỉ gửi alias, title và summary rút gọn thay vì ID thật hoặc toàn bộ nội dung block, sau đó ánh xạ kết quả về nguồn ở backend.
- **Viết kiểm thử:** Tôi xây dựng test cho API, deck ingestion, retrieval, tutor, summary, mindmap, AI profiles và importance scoring; đồng thời tạo bộ test chat theo golden set để đánh giá grounded answer và citation.

Qua lịch sử Git, phần backend của tôi được thể hiện trong bốn commit kỹ thuật chính: khởi tạo nền tảng server, hoàn thiện pipeline RAG/Tutor, xây dựng Mindmap Service và bổ sung Importance Service. Tổng cộng các thay đổi này bao phủ hơn 4.500 dòng bổ sung, chưa tính các file nhị phân phục vụ demo.

---

## 2. Cách tôi sử dụng AI và làm chủ quá trình vibe-coding

Tôi sử dụng AI như một công cụ tăng tốc cho việc dựng cấu trúc, hoàn thiện code lặp lại, đề xuất test case và rà soát các tình huống biên. Ở cấp sản phẩm, backend kết nối các mô hình qua OpenAI-compatible API; DeepSeek được sử dụng cho một số tác vụ phân tích có cấu trúc như nhận diện tín hiệu importance.

Tuy nhiên, tôi không giao toàn bộ quyết định cho mô hình. Tôi trực tiếp:

- chia hệ thống thành API, repository và service để code có thể kiểm thử;
- quyết định dữ liệu nào được phép gửi cho mô hình và dữ liệu nào phải ánh xạ ở backend;
- đặt schema JSON, timeout, token budget và điều kiện từ chối;
- kiểm tra citation dựa trên `slide_id` và `block_id`;
- viết test để xác minh hành vi thay vì chỉ dựa vào một vài lần demo thành công.

Điều tôi nhận ra là vibe-coding hiệu quả không nằm ở tốc độ sinh code, mà ở khả năng đưa cho AI một hợp đồng rõ ràng rồi kiểm chứng đầu ra. Khi schema, nguồn sự thật và quality bar không rõ, AI có thể tạo ra code chạy được nhưng sản phẩm vẫn không đáng tin cậy.

---

## 3. Case fail lớn nhất và bài học rút ra

Case fail rõ nhất của phần tôi phụ trách xuất hiện ở bộ golden set 20 câu hỏi cho AI Tutor. Baseline chỉ đạt **12/20 case (60%)**, với **citation accuracy 70%**. Sau khi sửa lại expectation của một case và đánh giá lại cùng raw response, kết quả là **13/20 case (65%)**, citation accuracy **75%** — vẫn chưa đạt quality bar **≥ 17/20 case và 100% citation accuracy**.

Phân tích lỗi cho thấy hệ thống không chỉ gặp một vấn đề “prompt chưa tốt”, mà có nhiều lớp lỗi khác nhau:

- câu trả lời thiếu ý dù retrieval đã tìm đúng slide;
- thiếu citation hoặc gắn thêm citation không cần thiết;
- retrieval không lấy đủ dữ liệu của bảng trên cùng một slide;
- hệ thống vẫn suy đoán khi câu hỏi follow-up thiếu ngữ cảnh;
- một số trường hợp cần người đánh giá vì expected answer hoặc citation chưa đủ rõ.

Một ví dụ cụ thể là câu hỏi dùng cụm “loại thứ hai” nhưng không cung cấp ngữ cảnh. Hệ thống đã nhận ra sự mơ hồ, song vẫn tự giả định đó là “nhà nước liên bang”, trả lời và đưa citation với confidence 95. Hành vi đúng phải là yêu cầu làm rõ hoặc trả về `no_basis`. Case này giúp tôi hiểu rằng một câu trả lời có citation chưa chắc đã an toàn; citation chỉ chứng minh nguồn có tồn tại, không chứng minh mô hình đã hiểu đúng ý định người dùng.

Từ thất bại này, tôi rút ra ba bài học:

1. **Groundedness phải được kiểm tra ở nhiều tầng.** Retrieval đúng, nội dung đầy đủ, citation đúng và quyết định “có nên trả lời hay không” là bốn tiêu chí khác nhau.
2. **Đường lui là một tính năng cốt lõi của sản phẩm AI.** Khi thiếu căn cứ hoặc thiếu ngữ cảnh, từ chối có kiểm soát tốt hơn một câu trả lời tự tin nhưng dựa trên giả định.
3. **Eval phải dẫn dắt vòng lặp phát triển.** Demo đẹp chỉ chứng minh happy path. Golden set mới làm lộ ra lỗi ở bảng nhiều block, câu hỏi nhiều phần, citation thừa và follow-up mơ hồ.

Nếu có thêm thời gian, tôi sẽ ưu tiên gom đầy đủ các block thuộc cùng bảng trước khi sinh câu trả lời, thêm bộ kiểm tra độ đầy đủ theo từng ý, siết điều kiện `no_basis` cho follow-up thiếu ngữ cảnh và dùng reranker/citation validator riêng để giảm citation thừa.

---

## 4. Điều tôi tự hào và hướng cải thiện

Điều tôi tự hào nhất là đã biến ý tưởng “mindmap đồng bộ với slide” thành một backend có luồng dữ liệu tương đối hoàn chỉnh: từ upload bài giảng, trích xuất, lưu trữ, tóm tắt, tạo mindmap, chấm importance đến hỏi đáp có citation. Tôi cũng chủ động đưa các giới hạn kỹ thuật như cache, token budget, timeout, schema validation và test vào ngay trong prototype, thay vì coi chúng là việc chỉ cần làm sau hackathon.

Điểm tôi cần cải thiện là phân bổ thời gian sớm hơn cho eval end-to-end. Tôi đã đầu tư nhiều vào độ rộng của backend, nhưng quality bar của Tutor vẫn chưa đạt. Trong lần tiếp theo, tôi sẽ tạo golden set nhỏ ngay từ khi hoàn thành retrieval đầu tiên, chạy eval sau từng thay đổi quan trọng và dành một khoảng thời gian riêng cho việc phân loại lỗi trước khi mở rộng thêm tính năng.

---

**Chữ ký xác nhận:**  
*Đỗ Thành Đạt — AI Backend Developer, Nhóm UADAYDCA*
