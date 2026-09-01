# CLAUDE.md — Tran Le Tasks

Hướng dẫn lâu dài cho Claude Code và các Agent AI khi làm việc với repository này. Chỉ chứa thông tin đã được xác minh từ source code thực tế.

---

## 1. Project Overview

**Tran Le Tasks** — Nền tảng điều hành sản xuất kinh doanh, quản trị dự án EPC Solar, bảo trì O&M, quản trị tài chính, nhân sự và cộng tác số toàn diện dành cho **Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê (Tran Le Electricity / tranlecorp.com)**.

Hệ thống xây dựng theo kiến trúc **Monorepo** (Workspaces: `frontend`, `backend`), bao gồm:
- **13 Không gian làm việc phòng ban chuyên biệt** (Sales, Engineering, EPC, O&M, Procurement, Warehouse, Finance, HR, IT, Legal, Marketing, Customer Care, Executive).
- **6 Tab quản trị chuẩn hóa** (Dashboard, Calendar, Docs, Approvals, Reports Excel, Audit Trail).
- Quản lý công việc Kanban/List/Gantt, Hợp đồng kinh tế, Dự án EPC & Đấu thầu, Kho hàng vật tư AIKO & SAJ, Webmail IMAP/SMTP, Họp trực tuyến WebRTC, AI Assistant Gemini, Thông báo realtime WebSocket.
- Database: **100% MySQL 8 thuần** kết nối qua `DATABASE_URL`. Không sử dụng mock data / hardcode.

Domain production: `task.tranlecorp.com.vn` / `tasks.tranlecorp.com.vn`.

---

## 2. Technology Stack

**Frontend** (`frontend/`):
- React 19.2 + React DOM 19
- Vite 6.4 (build + dev server)
- TypeScript ~5.8 (strict mode)
- TailwindCSS 4 (`@tailwindcss/vite`)
- React Router DOM 7
- `@tanstack/react-query` 5 (server state management)
- `socket.io-client` 4 (realtime notifications & chat)
- `recharts` 3 (biểu đồ), `motion` 12 (animation), `lucide-react` (icons)
- `@hello-pangea/dnd` (Kanban drag & drop)
- `xlsx` + `xlsx-js-style` (xuất báo cáo Excel chuyên nghiệp)
- `dompurify` (chống XSS), `flatpickr` (date picker), `react-to-print`
- `@mediapipe/*` (camera / background blur cho video meeting)

**Backend** (`backend/`):
- Node.js 22 + Express 5.2
- TypeScript ~5.8, chạy runtime trực tiếp bằng `tsx` (KHÔNG build ra JS)
- Cơ sở dữ liệu: **MySQL 8.0** (`mysql2` ^3.11.5) qua `db_mysql.ts`
- `jsonwebtoken` (JWT auth), `bcryptjs` (hash password)
- `socket.io` 4 (WebSocket server)
- `nodemailer` (SMTP), `imapflow` + `mailparser` (IMAP)
- `multer` (upload), `zod` (validation), `express-rate-limit`, `cors`, `dotenv`
- `@google/genai` 1.48 (Gemini AI backend)
- Test: `vitest` + `supertest`

**Package manager:** npm (workspaces: `frontend`, `backend`).

---

## 3. Project Structure

```
tranle_tasks/
├── package.json              # Root — npm workspaces + scripts concurrently
├── docker-compose.yml        # 5 services: App + MySQL 8 + Poste.io + Adminer + phpMyAdmin
├── Dockerfile                # Multi-stage: build frontend -> serve từ backend
├── ecosystem.config.cjs      # PM2 production config
├── CLAUDE.md                 # [Tài liệu này] Coding conventions & hướng dẫn AI
├── phan_tich.MD              # Báo cáo phân tích toàn diện 13 phòng ban & CSDL MySQL
├── .agent/ / .agents/        # ECC Skills, Workflows (/plan, /code-review, /feature-dev...) & Rules
├── frontend/                 # React 19 + Vite + Tailwind 4
│   ├── App.tsx               # Router + business logic trung tâm
│   ├── types.ts              # Toàn bộ TypeScript interfaces/enums
│   ├── vite.config.ts        # Proxy /api + /socket.io -> backend :3500 & manualChunks
│   ├── components/           # Components dùng chung & modal chuyên biệt:
│   │   ├── layout/           # Sidebar + TopHeader
│   │   ├── finance/          # MilestonePaymentModal, ArAgingDetailModal
│   │   ├── epc/              # DailySiteLogModal (Nhật ký công trường)
│   │   ├── om/               # SajRmaTicketModal, FlirThermalScanModal
│   │   ├── workflow/         # WorkQueue, DepartmentRequestPanel
│   │   └── meeting/          # WebRTC Video Room
│   ├── pages/                # 20 module trang:
│   │   ├── DepartmentWorkspace/ # 13 Workspaces phòng ban + 6 universal tabs
│   │   ├── Dashboard/        # Tổng quan toàn công ty
│   │   ├── Tasks/            # Kanban, List, Calendar
│   │   ├── Contracts/        # Quản lý Hợp đồng đầu vào/ra & Bán lẻ
│   │   ├── Projects/         # Quản lý Dự án EPC & Đấu thầu
│   │   ├── Revenue/          # Báo cáo Doanh thu & Dòng tiền
│   │   ├── Products/         # Kho hàng & Thiết bị Solar
│   │   ├── Mail/             # Webmail nội bộ IMAP/SMTP
│   │   ├── Meetings/         # Phòng họp trực tuyến
│   │   ├── Reports/          # Báo cáo công việc tuần
│   │   ├── DocumentAdmin/    # Quản lý tài liệu số
│   │   └── Admin/            # Quản trị hệ thống, RBAC & Backup/Restore JSON
│   ├── contexts/             # AuthContext, DataContext, LanguageContext, NotificationContext
│   └── services/             # 17 API service files (departmentWorkspaceService, taskService, etc.)
└── backend/                  # Express 5 + TypeScript (tsx runtime)
    ├── server.ts             # Entry point — Express setup + mount 23 routes
    ├── db_mysql.ts           # MySQL 8 adapter + DDL 40+ tables + seeds + SQL normalizer
    ├── socket.ts             # Socket.io realtime server
    ├── mailer.ts             # Nodemailer transporter
    ├── middleware/           # auth.ts (requireAuth/requireAdmin), validate.ts (zod)
    ├── routes/               # 23 route modules (departmentWorkspace.ts, tasks, contracts...)
    ├── schedulers/           # 5 cron jobs nhắc việc và báo cáo
    └── utils/                # cryptoUtils.ts, notify.ts
```

Chi tiết đầy đủ (danh sách 23 route, 40+ bảng): xem [phan_tich.MD](phan_tich.MD).

---

## 4. Development Commands

Chạy từ **thư mục root** trừ khi ghi chú khác:

```bash
# Cài đặt toàn bộ dependencies
npm install

# Khởi chạy môi trường phát triển (Backend :3500 + Frontend :5173 song song)
npm run dev

# Build kiểm tra kiểu và đóng gói frontend
npm run build

# Khởi chạy Production
npm run start:prod

# Triển khai Docker toàn bộ hệ thống
docker compose up -d --build

# Kiểm tra log ứng dụng
docker logs -f tranle_task_app
```

---

## 5. Quy Chuẩn Phát Triển & Zero-Hardcode

1. **TUYỆT ĐỐI KHÔNG DÙNG DỮ LIỆU CỨNG (ZERO-HARDCODE):**
   - Mọi KPI, biểu đồ, bảng tính toán hoa hồng, danh sách vật tư, tiến độ thi công phải lấy động từ MySQL qua API service hoặc React Context.
   - Trạng thái khởi tạo của form nhập liệu (`useState`) phải để chuỗi/số rỗng (`''` hoặc `0` / `''`) kèm thuộc tính `placeholder` trên thẻ HTML input.
2. **Quy chuẩn Phân quyền RBAC:**
   - **Nhân viên (Employee):** Chỉ tạo tờ trình, xem task của mình, nộp báo cáo; **KHÔNG** được quyền phê duyệt tài chính, hợp đồng hay tờ trình.
   - **Trưởng/Phó Phòng (Manager):** Phê duyệt trong phạm vi phòng ban mình quản lý (`departmentId`).
   - **Giám Đốc (Director) / Quản trị viên (Admin):** Phê duyệt cấp cao nhất toàn công ty.
3. **Quy chuẩn Backend:**
   - Sử dụng Parameterized Queries (`db.run('... VALUES (?, ?)', [a, b])`) chống SQL Injection.
   - Import file nội bộ trong backend giữ đuôi `.js` theo chuẩn ES Modules (`import { x } from './y.js'`).
4. **Quy chuẩn Frontend:**
   - Dùng TailwindCSS 4, tối ưu render qua React Query mutations (`invalidateQueries`).
   - Sanitize HTML người dùng bằng `dompurify`.
   - Thông báo qua hệ thống Toast / NotificationContext, không dùng hàm `alert()` đồng bộ.

---

## 6. ECC Slash Commands Sẵn Có Trong Workspace

- **`/plan`**: Lập kế hoạch kiến trúc chi tiết trước khi code tính năng.
- **`/feature-dev`**: Phát triển tính năng theo chuẩn TDD & Zero-Hardcode.
- **`/code-review`**: Đánh giá độc lập chất lượng code, bảo mật, RBAC.
- **`/react-review`**: Rà soát hiệu năng React 19, hooks, component re-render.
- **`/security-scan`**: Quét lỗ hổng bảo mật và phân quyền API.
- **`/update-docs`**: Tự động cập nhật tài liệu kiến trúc dự án.

---

> **Lưu ý:** Tài liệu được đồng bộ tự động từ source code dự án ngày 01/09/2026. Mọi thay đổi về kiến trúc, bảng database hoặc API endpoints cần được cập nhật đồng thời tại [CLAUDE.md](CLAUDE.md) và [phan_tich.MD](phan_tich.MD).
