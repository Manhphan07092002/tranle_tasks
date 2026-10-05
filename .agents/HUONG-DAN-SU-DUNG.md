# Hướng dẫn sử dụng Antigravity cho TranLe Tasks

## 1. Cài đặt

Giữ thư mục này ở Git root:

E:\web_tranle_new\.agents\

Mở Antigravity và tạo/mở Project trỏ vào:

E:\web_tranle_new

Antigravity sẽ nhận workspace Rules và Skills từ `.agents/`.

## 2. Quy tắc quan trọng

- Rules = luật nền áp dụng theo cấu hình activation.
- Workflows = quy trình nhiều bước gọi bằng `/ten-workflow`.
- Skills = kiến thức/workflow chuyên biệt mà Agent có thể tự kích hoạt khi phù hợp.
- Không đưa API key Mirai/Gemini/SMTP/JWT vào `.agents/`.
- Không dùng `.agents` để thay thế `.env`.
- Không cho Agent tự reset database để "sửa" test.
- Không cho Agent tuyên bố hoàn thành nếu chưa verify.

## 3. Workflow chuẩn

### Việc nhỏ
Prompt trực tiếp → inspect → edit → verify.

### Việc vừa/lớn
/tranle-plan → /tranle-feature → /tranle-review → /tranle-verify

### Bug
/tranle-debug → /tranle-review → /tranle-verify

### Security
/tranle-security

### RBAC
/tranle-rbac

### Database
/tranle-db

### API
/tranle-api

### Realtime
/tranle-realtime

### Mail
/tranle-mail

### AI
/tranle-ai

## 4. Dùng /plan và /grill-me của Antigravity

Với yêu cầu chưa rõ:
`/grill-me <yêu cầu>`

Với yêu cầu cần kế hoạch:
`/plan <yêu cầu>`

Sau khi duyệt plan, dùng workflow TranLe để triển khai.

## 5. Dùng /goal

`/goal` phù hợp khi yêu cầu đã rõ và bạn muốn Agent chạy đến khi hoàn tất.

Ví dụ:
`/goal Fix all failing backend tests without changing public API behavior.`

Không dùng `/goal` cho migration, security hoặc thay đổi kiến trúc lớn nếu bạn chưa xem plan.

## 6. Browser

Với UI/browser debugging, dùng `/browser` khi cần. Agent nên kiểm tra browser flow sau khi backend/API đã ổn định.

## 7. Local Mode và New Worktree

- Local Mode: thay đổi trực tiếp thư mục hiện tại.
- New Worktree Mode: phù hợp task lớn/đồng thời, giúp cô lập thay đổi.

Với refactor lớn hoặc nhiều agent song song, ưu tiên New Worktree Mode.

## 8. Cách yêu cầu Agent

Luôn nêu:
- mục tiêu
- phạm vi
- điều không được làm
- tiêu chí hoàn thành
- test/verification mong muốn

Ví dụ:

"Thêm tính năng X. Chỉ sửa frontend/backend liên quan. Không refactor ngoài scope. Trước khi code hãy đọc implementation hiện tại và lập plan. Sau khi code chạy test/build phù hợp và báo cáo chính xác."

## 9. Khi Agent làm sai hướng

Dùng:

"STOP. Chưa sửa thêm. Hãy revert về ý định của task hiện tại, đọc lại các file liên quan và đưa ra plan ngắn. Không refactor ngoài scope."

## 10. Sau mỗi task

Kiểm tra:
- diff
- tests
- build
- migration/config
- secrets
- RBAC
- realtime/cache nếu có

Sau đó mới commit.
