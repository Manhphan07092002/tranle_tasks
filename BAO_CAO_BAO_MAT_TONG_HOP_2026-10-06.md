# Báo cáo bảo mật tổng hợp — TranLe Tasks

**Ngày rà soát:** 2026-10-06
**Nhánh:** `security-hardening` (`c05374f` → `3574e02`)
**Phạm vi:** backend Node/Express + MySQL, frontend React/Vite, hạ tầng Docker/CI
**Trạng thái:** 6/6 đợt hoàn tất — tất cả mục Critical và High đã vá kèm test hồi quy

---

## 1. Tổng quan

Rà soát theo 4 nhánh: (1) xác thực / phân quyền / IDOR / socket, (2) sink XSS, (3) injection / kiểm tra input, (4) bí mật / crypto / dependency / CI-Docker.

Kết quả: **không tìm thấy** SQL injection, command injection, path traversal hay SSRF khai thác được.

| Mức | Số mục | Đã vá | Còn nợ |
|---|---|---|---|
| Critical | 2 | 2 | 0 |
| High | 17 | 17 | 0 |
| Medium | ~40 | ~14 | ~26 (rủi ro thấp / đã chấp nhận / cần hạ tầng) |
| Low | ~25 | ~6 | ~19 (ghi nhận) |

**Kiểm thử:** backend 101 → **231 test** (13 → 21 file), `tsc` 0 lỗi, `npm audit` 0 vulnerabilities.
Frontend `tsc -b` 0 lỗi, 10/10 test, `vite build` thành công, `npm audit` 0 vulnerabilities.

---

## 2. Đợt triển khai

| Đợt | Commit | Nội dung |
|---|---|---|
| Nền | `c05374f`, `4706f6c` | 2 pass hardening ban đầu, backdoor, auth/uploads/mail/secrets, 85 test |
| 0 | `3f6d93f` | Mail DOM-XSS, rò `e.message`, fail-closed thiếu `DATABASE_URL`, `proxy-addr`, xoá `VITE_GEMINI_API_KEY` |
| 1 | `2b27e12` | Allowlist tạo bản ghi, gate `/archive`, cấm tự duyệt, scope feedback |
| 2 | `0258999` | Mạo danh bình luận, leo thang task, clamp activity log, ẩn meeting link |
| 2b | `be7fcb2` | Chặn hợp đồng xoá / ghi bảng kho |
| Cấu hình | `902f46f` | Bind loopback MySQL/Postfix admin, `TRUST_PROXY_*` theo môi trường |
| 3 | `304c160` | Đóng băng bản ghi Approved, phân quyền lại phán quyết, khoá nhật ký kiểm toán |
| 4 | `c1e2a3b` | Clamp paging, chặn thư đầy attachment, giữ bằng chứng khi xoá dòng |
| 5 | `3574e02` | Email trùng, ghim thuật toán JWT, bcrypt 12, vá SheetJS |

---

## 3. Critical

### C1 — DOM-XSS qua nội dung email (`frontend/utils/mailHtml.ts`)

`ReadingPane` là sink `dangerouslySetInnerHTML` duy nhất của ứng dụng. Nội dung mail được render thẳng, nên một thư kích hoạt `<img onerror>` hay `<script>` chạy trong origin của ứng dụng với phiên đăng nhập hợp lệ.

- Thêm `sanitizeMailHtml` / `escapeHtml` / `purgeLegacyMailDraft`.
- Sanitize tại `ComposeModal.tsx:55`, lúc gửi, và lúc lưu draft — đóng được cả ba đường vào.
- `MAIL_DRAFT_VERSION='2'` để dọn draft cũ đã lưu từ trước khi bản vá.

### C2 — Dependency Critical (đã đóng ở Đợt 5)

`xlsx@0.18.5` + `xlsx-js-style@1.2.0` (prototype pollution, ReDoS). Chi tiết ở mục H-Đợt 5.

---

## 4. High

| # | Vấn đề | Vị trí | Cách vá |
|---|---|---|---|
| H1 | Tạo bản ghi ngay ở `Approved` | `reports.ts`, `revenue.ts` | `CREATE_STATUS_ALLOWLIST` cho INSERT + chặn notification |
| H2 | `/archive` đọc toàn bảng, không giới hạn phạm vi | `reports.ts`, `revenue.ts` | Lọc theo phòng ban/quyền + `LIMIT 500` |
| H3 | `/archive` không có giới hạn | như trên | như trên |
| H4 | Tự phê duyệt báo cáo của chính mình | `reports.ts`, `revenue.ts`, 3 route `contracts.ts` | Chỉ chặn **verdict** (`Approved`/`Rejected`), **không** chặn `Pending*` — nộp duyệt là hành động của tác giả |
| H5 | `me?.role !== 'Manager'` không kiểm tra phòng ban | `reports.ts`, `revenue.ts` | Thay bằng `isManagerOfDept` |
| H6 | `directorFeedback` / `managerFeedback` ghi bởi bất kỳ ai | `reports.ts`, `revenue.ts` | Mỗi cột chỉ ghi được bởi đúng vai trò thực hiện bước đó; tách `wantsApprove` khỏi feedback để không phá luồng "Trả lại → sửa → gửi lại" |
| H7 | Hợp đồng xoá và ghi bảng kho không kiểm tra quyền kho | `contracts.ts` | `hasWarehouseAccess` đọc JWT permissions + `roles.permissions` + admin/director. Role không đọc được ⇒ fail closed |
| H8 | `app.set('trust proxy', 1)` hard-code | `server.ts` | `utils/trustProxy.ts`: `TRUST_PROXY_CIDRS` (ưu tiên) → `TRUST_PROXY` → `TRUST_PROXY_HOPS` → mặc định 1 |
| H9 | `X-Forwarded-For` giả được ⇒ vô hiệu hoá khoá đăng nhập | `server.ts` | Như H8. KHÔNG fail-closed: `loginLimiter` chỉ 10 lần/15 phút nên dùng `false` sau proxy sẽ gộp cả công ty vào một bucket |
| H10 | Giao task vượt phòng ban / vượt tổ chức | `tasks.ts` | `canAssignAcrossOrg` chuyển sang `PUT` (không nhận qua `POST`) |
| H11 | Đổi phòng ban của task khi tự sửa | `tasks.ts` | Giữ phòng ban hiện tại trừ khi có `manage_dept_tasks`; đồng thời sửa `t.department ?? null` âm thầm xoá phòng ban |
| H12 | Giả tác giả bình luận | `tasks.ts` | Tác giả + `createdAt` do server quyết định, giữ bản gốc khi sửa |
| H13 | Bản ghi `Approved` vẫn sửa được nội dung | `reports.ts`, `revenue.ts` | `utils/workflowPolicy.ts` |
| H14 | `Approved` chỉ là giá trị trong payload ⇒ đóng dấu lại `approvedAt`/`approvedBy` | `reports.ts`, `revenue.ts` | `isVerdictChange` — phán quyết là **chuyển trạng thái**, không phải giá trị |
| H15 | Trường không gửi lên bị ghi thành `null`/`0` | `reports.ts`, `revenue.ts` | Trường vắng mặt = giữ nguyên |
| H16 | `?limit` không clamp ⇒ rút cả bảng | `admin.ts`, `mail.ts` | `utils/paging.ts` |
| H17 | Thư nhiều attachment ⇒ response ~320MB | `mail.ts` | `utils/mailAttachments.ts`: ngân sách cả số lượng lẫn tổng byte |

### Hai lỗ hổng phát hiện ở Đợt 5

| # | Vấn đề | Vị trí | Cách vá |
|---|---|---|---|
| H18 | `users.email` không có kiểm tra trùng lặp nào, schema không có `UNIQUE` | `users.ts` | `utils/uniqueness.ts`. Login tra `lower(email) = lower(?)` và lấy dòng đầu tiên ⇒ hai tài khoản chung email nghĩa là **đăng nhập vào tài khoản nào là ngẫu nhiên** |
| H19 | Số hợp đồng trùng chỉ khác hoa thường | `contracts.ts:440,678` | `LOWER()` + đổi mã lỗi 400 → 409 |

### Medium đáng kể

| # | Vấn đề | Cách vá |
|---|---|---|
| M1 | Activity log đọc toàn công ty, không giới hạn | `requireAuditAccess` + clamp 200 + `?page=` |
| M2 | `meetingLink` lộ cho người ngoài cuộc họp | Ẩn link, thêm `GET /api/meetings/by-code/:code` |
| M3 | `documents.updatedAt` ghi sai mỗi lần PUT | Bỏ khỏi `UPDATE` |
| M4 | DB browser cho xoá dòng `activity_logs` | Chặn (nhật ký là append-only) + lưu nội dung dòng bị xoá vào metadata audit |
| M5 | Sửa `contracts.contractNumber` không chặn trùng | Đã xử lý ở H19 |
| M9 | `xlsx-js-style` giữ mã lỗi mà `npm audit` không thấy | Gỡ hẳn — app không dùng style của nó |
| M10 | JWT không ghim thuật toán | `algorithms: ['HS256']` ở `auth.ts` + `socket.ts`, `algorithm: 'HS256'` khi sign |
| — | bcrypt cost 10 | Nâng 12. Hash cũ vẫn verify (`compare` đọc cost từ chuỗi hash) |

---

## 5. Hạ tầng

| # | Vấn đề | Cách vá |
|---|---|---|
| CD1 | `.env.example` chứa `VITE_GEMINI_API_KEY` | Xoá — biến `VITE_*` được bundle vào JS và ai cũng đọc được |
| CD2 | MySQL publish `0.0.0.0:3306` | `docker-compose.yml:43` → `127.0.0.1`. App vẫn nối qua mạng compose (`mysql:3306`) |
| CD3 | Giao diện quản trị Postfix publish `0.0.0.0:8080` | `docker-compose.yml:64` → `127.0.0.1`. Đã kiểm tra `mail-server-config/nginx.conf:6` proxy tới `127.0.0.1:8080` và nginx chạy trên host |
| — | Thiếu biến môi trường cho proxy | Thêm `TRUST_PROXY_*` vào `.env.production.example` + passthrough trong `docker-compose.yml` |
| — | Thiếu `DATABASE_URL` ở production | `db_mysql.ts:368-380` throw |

Các cổng SMTP/IMAP (25, 465, 587, 110, 143, 993, 995) giữ nguyên `0.0.0.0` — đây là dịch vụ mail công cộng.

---

## 6. Đã kiểm chứng là an toàn (không cần vá)

- **socket.io** chỉ dùng JWT đã xác minh, có kiểm tra tươi (locked/deleted/demoted).
- **Refresh token** cookie-only + rotation + phát hiện tái sử dụng.
- **SQL** tham số hoá ở mọi nơi; identifier động chỉ admin-only qua allowlist + regex.
- **`/uploads`** có auth. **`upload.ts`** kiểm cả extension lẫn mimetype, tên file random hex, giới hạn 10MB / 5 file.
- **`ReadingPane`** là sink `dangerouslySetInnerHTML` duy nhất.
- **Không có token trong URL hay console.**
- **`resolveFolder()`** chỉ nhận tên thư mục từ allowlist, fallback `INBOX`.
- **`parseAddressList()`** chặn header injection, ≤50 địa chỉ mỗi trường, kèm `mailSendLimiter` 50 lần/giờ.
- **`cryptoUtils.ts`**: salt hard-code trong `scrypt` là bình thường (salt không cần bí mật). `legacyDecryptCbc` trả `null` cho cả sai khoá lẫn sai padding ⇒ **không** tạo padding oracle.
- **`activity_logs`** không có route nào `UPDATE`/`DELETE` — append-only thật.
- **Không có bảng `role_permissions`** trong codebase ⇒ mục M7 (JOIN bảng này) không tồn tại như tài liệu cũ ghi.
- **`xlsx` advisory gốc**: app chỉ **ghi** workbook (`json_to_sheet` + `writeFile`), không gọi `XLSX.read`/`sheet_to_json` ⇒ mã lỗi không reachable. Đã vá dependency bất kể.

---

## 7. Còn nợ

### 7.1 Cần thông tin môi trường — chặn

| Việc | Cần gì |
|---|---|
| Đặt `TRUST_PROXY_CIDRS` đúng | **IP/CIDR của nginx/CDN** đứng trước app ở production |
| Bind `docker-compose.yml:7` (`${PORT:-3500}:3500`) sang `127.0.0.1` | Cùng câu hỏi: nếu proxy ở máy khác thì bind loopback sẽ hỏng |

Không chặn việc ship env plumbing — đã hoàn tất, chỉ còn điền giá trị.

### 7.2 Cần hạ tầng (migration)

| Việc | Lý do chưa làm |
|---|---|
| `UNIQUE(users.email)`, `UNIQUE(contracts.contractNumber)` | Bảng `_migrations` chỉ được tạo, **không có runner**. Đã thay bằng kiểm tra ở tầng server |
| Xoá fallback `legacyDecryptCbc` | Cần re-encrypt toàn bộ dữ liệu mail cũ sang GCM trước |

### 7.3 Đã chấp nhận rủi ro

- **`generationMode`** của báo cáo doanh thu: **false positive**. Scheduler chỉ chuyển `Draft → Pending Manager` (vẫn qua duyệt TP), hệ thống tự tạo báo cáo `automatic` (`contracts.ts:148-152`), auto-fill chỉ đọc hợp đồng đúng phòng ban (`:104 AND department = ?`). Ép server-owned sẽ phá UI (`Revenue/index.tsx:2094`, `RevenueReportModal.tsx:322` có `<select>` chọn Tự động/Thủ công). Đã revert toàn bộ.
- **`documents.updatedAt`**: bỏ khỏi `UPDATE` thay vì thêm migration; không màn hình nào đọc trường này.
- **`markNotificationRead`** không cần modal xác nhận.
- **Medium còn lại (~26)**: đã ghi nhận, rủi ro thấp. Nhiều mục liên quan tới hiển thị dữ liệu hợp lệ hơn là hàng rào bảo mật.

---

## 8. Ghi chú kỹ thuật để người sau

**So sánh nội dung đã duyệt** (`utils/workflowPolicy.ts`):
- Bỏ qua `attachments` — server tự chèn lại từ bảng `documents` mỗi lần lưu, khác nhau giữa hai payload giống nhau không phải là sửa nội dung.
- Tiền so bằng **giá trị**: `1000` / `"1000"` / `1000.00` / `"1.000,00"` đều bằng nhau — chặn nhầm một thay đổi chỉ là định dạng sẽ hỏng luồng duyệt.
- Khoá JSON sắp xếp lại trước khi so sánh; phân biệt "thiếu trường" với "trường bị đổi".

**Về `trust proxy`:** mặc định giữ `1` hop, **không** đổi thành fail-closed. `loginLimiter` cho 10 lần / 15 phút theo IP — đặt `false` khi có proxy nghĩa là mọi nhân viên dùng chung bucket IP của proxy, và 10 lần gõ sai là khoá cả công ty. Muốn strict thì phải set `TRUST_PROXY_CIDRS` cho đúng địa chỉ proxy, và proxy phải ghi đè `X-Forwarded-For` bằng `$remote_addr`.

**Về mock trong test:** phải **id-aware**. Nhiều lần test đỏ chỉ vì mock trả cùng một row cho mọi id. Khi thêm điều kiện mới vào hành vi, test cũ có thể cần cập nhật.

---

## 9. PR

https://github.com/Manhphan07092002/tranle_tasks/pull/new/security-hardening
