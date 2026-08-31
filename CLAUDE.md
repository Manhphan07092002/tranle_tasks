# CLAUDE.md — CTC Task

Hướng dẫn lâu dài cho Claude Code khi làm việc với repository này. Chỉ chứa thông tin đã được xác minh từ source code. Mục nào chưa xác định được ghi rõ "Chưa xác định".

---

## 1. Project overview

**CTC Task** — nền tảng quản lý công việc & cộng tác nội bộ cho doanh nghiệp (CTC / ctcdn.vn). Kiến trúc **monorepo** (npm workspaces: `frontend`, `backend`). Bao gồm: quản lý công việc (Kanban/List/Calendar), hợp đồng, dự án đấu thầu, doanh thu, kho hàng, báo cáo, webmail IMAP/SMTP, phòng họp WebRTC, AI assistant (Gemini), thông báo realtime.

Domain production: `task.ctcdn.vn` / `tasks.ctcdn.vn`.

## 2. Technology stack

Đã xác minh từ `package.json` các workspace.

**Frontend** (`frontend/`):
- React 19 + React DOM 19
- Vite 6 (build + dev server)
- TypeScript ~5.8 (strict mode bật)
- TailwindCSS 4 (`@tailwindcss/vite`)
- React Router DOM 7
- `@tanstack/react-query` 5 (server state)
- `socket.io-client` 4 (realtime)
- `recharts` 3 (biểu đồ), `motion` 12 (animation), `lucide-react` (icons)
- `@hello-pangea/dnd` (Kanban drag & drop)
- `dompurify` (chống XSS), `flatpickr` (date picker), `react-to-print`
- `xlsx` + `xlsx-js-style` (export Excel)
- `@mediapipe/*` (camera / background blur cho phòng họp)
- `@google/genai` 1.29 (AI client — LƯU Ý: xem mục 19)

**Backend** (`backend/`):
- Node.js + Express 5
- TypeScript ~5.8, chạy runtime bằng `tsx` (KHÔNG build ra JS trước khi chạy dev/start)
- Database: MySQL 8 (`mysql2`) duy nhất (`backend/db_mysql.ts`)
- `jsonwebtoken` (JWT auth), `bcryptjs` (hash password)
- `socket.io` 4 (WebSocket server)
- `nodemailer` (SMTP), `imapflow` + `mailparser` (IMAP)
- `multer` (upload), `zod` (validation), `express-rate-limit`, `cors`, `dotenv`
- `@google/genai` 1.48 (Gemini backend)
- Test: `vitest` + `supertest`

**Package manager:** npm (có `package-lock.json`, dùng workspaces).

## 3. Project structure

```
ctc-task-main/
├── package.json              # Root — npm workspaces + scripts concurrently
├── docker-compose.yml        # app + poste.io mailserver
├── Dockerfile                # Multi-stage: build frontend → serve từ backend
├── ecosystem.config.cjs      # PM2 production config
├── .env.production.example    # Mẫu biến môi trường
├── frontend/                 # React 19 + Vite + Tailwind 4
│   ├── App.tsx               # Router + business logic (lớn)
│   ├── types.ts              # 20+ TS interfaces/enums
│   ├── vite.config.ts        # Proxy /api + /socket.io → backend :3500
│   ├── components/           # Component dùng chung
│   ├── pages/                # 19 trang (Dashboard, Tasks, Mail, Contracts...)
│   ├── contexts/             # AuthContext, DataContext, LanguageContext, NotificationContext
│   ├── services/             # 16 file service gọi API (api.ts là base wrapper)
│   ├── hooks/                # Custom hooks
│   └── utils/
├── backend/                  # Express 5 + TypeScript (tsx runtime)
│   ├── server.ts             # Entry point — Express setup + mount routes
│   ├── db_mysql.ts           # MySQL schema + migrations + seeds + SQL normalizer
│   ├── socket.ts             # Socket.io init
│   ├── mailer.ts             # Nodemailer transporter
│   ├── middleware/           # auth.ts (requireAuth/requireAdmin), validate.ts (zod)
│   ├── routes/               # 22 module route
│   ├── schedulers/           # 5 cron job
│   ├── utils/                # cryptoUtils.ts, notify.ts
│   └── tests/                # vitest (include: tests/**/*.test.ts) — gần như trống
├── uploads/                  # File upload lưu ở đây
└── scripts/
```

Chi tiết đầy đủ (danh sách 22 route, 27 bảng): xem [phan_tich.MD](phan_tich.MD).

## 4. Development commands

Chạy từ **thư mục root** trừ khi ghi chú khác.

```bash
npm install            # Cài tất cả (root + frontend + backend qua workspaces)
npm run dev            # Dev: backend :3500 + frontend :5173 song song (concurrently)
npm run build          # Build frontend (tsc -b && vite build)
npm run start:prod     # Production: NODE_ENV=production PORT=3500, chạy backend serve cả SPA

cd backend && npm test         # vitest run (chỉ backend/tests/**/*.test.ts)
cd backend && npm run test:watch

docker-compose up -d --build   # Docker (app + mysql + mailserver)
```

**Typecheck:**
- Frontend: `cd frontend && npx tsc -b` (hoặc chạy `npm run build`)
- Backend: `cd backend && npx tsc --noEmit` — LƯU Ý: `backend/tsconfig.json` chỉ `include: ["server.ts"]`, không cover toàn bộ. Backend chạy trực tiếp bằng `tsx`, không compile.

**Lint/Format:** Chưa xác định — không tìm thấy cấu hình ESLint/Prettier trong repo.

## 5. Frontend architecture

- **Entry:** `main.tsx` → `App.tsx`. `App.tsx` chứa router + phần lớn business logic (permission, modal, notification, task handling) và truyền nhiều props xuống pages.
- **Routing:** React Router DOM 7. 19 page module trong `pages/`.
- **Server state:** `@tanstack/react-query` qua `DataContext` — fetch tasks/notes/users/reports/roles/departments/contracts/revenue/clients/projects. Mutations gọi `invalidateQueries` khi thành công.
- **Contexts:** `AuthContext` (JWT login/logout), `DataContext` (react-query), `LanguageContext` (i18n vi/en), `NotificationContext` (Socket.io + local).
- **API layer:** mọi service trong `services/` gọi qua `services/api.ts` (base fetch wrapper + gắn `Authorization: Bearer <token>`).
- **Realtime:** `socket.io-client`, dev proxy `/socket.io` → backend.
- **Code splitting:** `React.lazy()` cho component nặng (Meeting).

## 6. Backend architecture

- **Entry:** `server.ts` — tạo Express app, `trust proxy = 1`, CORS, body limit 50mb, rate limit (global 5000/15min, login 10/15min), mount 22 route, init socket + 5 scheduler, serve `/uploads` static + SPA fallback từ `frontend/dist`.
- **Route pattern:** mỗi file export một factory `xxxRoutes(db)` trả về `express.Router()`. Mount trong `server.ts` với middleware `requireAuth` (và `requireAdmin` cho `/api/admin`).
- **DB injection:** đối tượng `db` được tạo trong `server.ts` thông qua `initDbMysql()` (`db_mysql.ts`) và truyền vào mọi route factory.
- **Auth-free routes:** chỉ `/api/auth/*` (login, register, forgot/reset password) và `/health` không cần token.

## 7. Database architecture

- **Database:** MySQL 8 (`mysql2`), kết nối qua `DATABASE_URL=mysql://user:pass@host:port/dbname`. Adapter `backend/db_mysql.ts` khớp interface `db` (`get`/`all`/`run`/`exec`/`close`). Dùng MỘT connection sống lâu (không pool) để giữ đúng ngữ nghĩa transaction đa lệnh (`BEGIN TRANSACTION`... của routes).
- **Khác biệt dialect với MySQL** được gom trong `normalizeSql()` của `db_mysql.ts` (KHÔNG sửa route): `BEGIN TRANSACTION`→`START TRANSACTION`, `INSERT OR IGNORE`→`INSERT IGNORE`, `ON CONFLICT...DO UPDATE`→`ON DUPLICATE KEY UPDATE`, `"to"/"from"/"key"/"value"`→backtick, `sqlite_master`→`information_schema`.
- **DDL MySQL** kiểu: `TEXT PK/UNIQUE`→`VARCHAR`, `REAL`→`DOUBLE`, boolean-`INTEGER`→`TINYINT`, date/JSON giữ dạng chuỗi. Charset `utf8mb4_unicode_ci`.
- **27 bảng** — danh sách chi tiết trong [phan_tich.MD](phan_tich.MD) mục 4.
- **Partial unique index của `products`** KHÔNG tồn tại trên MySQL — dựa vào kiểm tra trùng ở tầng app trong `products.ts`.

## 8. Authentication

- **Cơ chế:** JWT (`jsonwebtoken`), hết hạn `7d`. Payload gồm `id, name, email, role, department, avatar, permissions`.
- **Login:** `POST /api/auth/login` → `bcrypt.compare` → `jwt.sign(payload, JWT_SECRET)`.
- **Client:** lưu token + user trong `localStorage` (`ctc_token`, `ctc_user`), gắn header `Authorization: Bearer <token>` mọi request.
- **Middleware:** `requireAuth` (verify token → `req.user`) trong `backend/middleware/auth.ts`.
- **Bảo vệ tài khoản:** account locking sau nhiều lần login sai (`failedLogins`, `lockedUntil`, `isLocked`).
- **Reset password:** qua email link, có token hết hạn (bảng `password_reset_tokens`).

## 9. Authorization / RBAC

- **Model:** `roles` (permissions lưu JSON), `users.role` là tên role. Middleware `requireAdmin` kiểm tra `req.user.role === 'Admin'`.
- **4 role seed:** Admin (16 perms), Director (7), Manager (9), Employee (4). Ma trận quyền đầy đủ: [phan_tich.MD](phan_tich.MD) mục 5.
- **Permission list** nằm trong JWT payload (`permissions[]`), frontend đọc để ẩn/hiện UI.
- **Logic task (frontend App.tsx):** Admin/Director xem tất cả, Manager xem phòng ban, Employee xem task được giao/tự tạo. Sửa: chỉ `createdBy` hoặc assignee. Xoá: chỉ `createdBy` hoặc Admin.
- ⚠️ **QUAN TRỌNG:** authorization ở tầng route backend hiện KHÔNG đồng đều — nhiều route chỉ có `requireAuth` mà chưa kiểm tra resource-level ownership/permission (ví dụ `routes/tasks.ts` không verify người gọi có quyền sửa/xoá task đó không). Khi thêm/sửa endpoint, PHẢI kiểm tra quyền ở backend, không chỉ dựa vào frontend.


## 10. Coding conventions

- **Ngôn ngữ:** TypeScript cả FE và BE. FE strict mode bật; `noUnusedLocals`/`noUnusedParameters` tắt.
- **ES Modules:** cả FE và BE dùng `"type": "module"`. Backend import kèm đuôi `.js` (do Node16 module resolution + tsx), ví dụ `import { taskRoutes } from './routes/tasks.js'` dù file là `.ts`. GIỮ NGUYÊN convention `.js` này khi thêm import backend.
- **Route factory:** mỗi route file export `export function xxxRoutes(db: any) { const router = Router(); ...; return router; }`.
- **`db` typed là `any`** trong route hiện tại — nhiều chỗ dùng `any`. Không cần đổi toàn bộ, nhưng code mới nên type chặt hơn nếu khả thi.
- **ID:** dùng `randomUUID()` từ `crypto` cho khoá chính khi tạo mới ở backend.
- **Query:** dùng parameterized query (`db.run('... VALUES (?, ?)', [a, b])`) — GIỮ pattern này, KHÔNG nối chuỗi SQL.

## 11. API conventions

- Base path `/api/<resource>`. REST: `GET /` (list), `POST /` (create), `PUT /:id` (update), `DELETE /:id` (delete).
- Response JSON. Tạo mới thường trả `{ id }`, update/delete trả `{ success: true }`.
- Lỗi trả `res.status(<code>).json({ error: '<message>' })`. Validation lỗi: `400` với `{ error: 'Validation failed', details: [...] }` (xem `middleware/validate.ts`).
- Frontend gọi qua `services/api.ts`, tự gắn Bearer token.

## 12. Error handling conventions

- Route hiện dùng `try/catch` trả `res.status(500).json({ error: '...' })`. Message lỗi ngắn, tiếng Việt hoặc tiếng Anh tuỳ file.
- **Chưa có** structured logging — chỉ `console.log/error`. Chưa có React Error Boundary.
- Khi thêm code: giữ try/catch quanh thao tác DB/IO, trả status code phù hợp (400 client, 401/403 auth, 404 not found, 500 server).

## 13. Validation conventions

- Backend: `zod` qua `middleware/validate.ts` — `validate(schema)` parse `req.body`, trả 400 kèm `details`. LƯU Ý: nhiều route hiện CHƯA gắn `validate` (ví dụ `routes/tasks.ts` nhận `req.body` trực tiếp). Endpoint mới nên định nghĩa zod schema + gắn `validate`.
- Frontend: validation form hiển thị trong UI (chưa có thư viện form chuẩn hoá — xác minh theo từng page).

## 14. UI/UX conventions

- TailwindCSS 4 utility-first. Icons: `lucide-react`. Animation: `motion`.
- Theme: Dark/Light/System. Đa ngôn ngữ vi/en qua `LanguageContext` — text người dùng nên đi qua i18n, không hardcode.
- Notifications: dùng hệ thống notification/toast + Socket.io realtime, KHÔNG dùng `alert()`.
- Kanban: `@hello-pangea/dnd`. Charts: `recharts`. Date: `flatpickr`.
- Sanitize HTML người dùng bằng `dompurify` trước khi render.
- Component mới: kiểm tra `components/` trước để tái sử dụng, tránh trùng lặp. Giữ responsive (mobile + desktop). Có loading/empty/error state.

## 15. Rules khi sửa code

- Chỉ sửa file cần thiết cho task; không refactor/mở rộng scope ngoài yêu cầu.
- KHÔNG đổi framework, database, ORM, cơ chế auth khi chưa được yêu cầu.
- KHÔNG cài package mới nếu chưa cần; nếu cần, DỪNG và hỏi trước.
- KHÔNG xoá code/component khi chưa chắc chắn không còn dùng.
- Tái sử dụng code hiện có, tuân thủ kiến trúc hiện tại (route factory, service layer, context).
- Giữ parameterized query; không nối chuỗi SQL.
- Backend import giữ đuôi `.js`.
- Sau khi sửa: chạy typecheck/build/test phù hợp (mục 4) trước khi báo hoàn thành.

## 16. Những file/thư mục KHÔNG được tự ý sửa
 
- Thư mục `data/`, `uploads/` — dữ liệu runtime, đã gitignore. Không commit, không sửa tay.
- `package-lock.json` — chỉ thay đổi qua npm, không sửa tay.
- `node_modules/` — không đụng.
- `phan_tich.MD` — tài liệu phân tích tham khảo; cập nhật chỉ khi được yêu cầu.
- File chứa secret thực (`.env`, `backend/.env`, `frontend/.env`) — đã gitignore, không đọc/echo giá trị secret, không commit.

## 17. Testing conventions

- Framework: `vitest` (backend). Config `backend/vitest.config.ts` — chỉ chạy `tests/**/*.test.ts`, environment `node`, pool `forks`.
- HTTP test: `supertest`.
- Hiện `backend/tests/` gần như trống — coverage rất thấp. Khi thêm feature/bug fix: viết test cho logic auth, permission, tính toán (contract/revenue).
- Frontend: chưa có test runner cấu hình. (Chưa xác định.)
- Có file `test_api.js` ở root để test thủ công API.

## 18. Git conventions

- Branch chính: `main`. Commit message: quan sát lịch sử — dùng tiếng Việt hoặc tiếng Anh, mô tả ngắn thay đổi (VD "Chuyển cổng backend...", "Migrate sang MySQL 8..."). Ưu tiên format `<type>: <mô tả>` (feat/fix/chore) cho commit mới.
- Chỉ commit khi được yêu cầu rõ ràng. Không push khi chưa được yêu cầu.
- KHÔNG commit: secret (`.env`), `node_modules`, `dist`, `data/`, `uploads/`, file log/debug/tmp.
- Stage file cụ thể theo tên, không `git add .` mù.

## 19. Nguyên tắc bảo mật

- **KHÔNG hardcode secret** trong source/Docker/README/log. Hiện có các vấn đề đã biết cần lưu ý (không tự sửa nếu ngoài scope, chỉ cảnh báo):
  - JWT secret hardcode trong `docker-compose.yml` và fallback tĩnh trong `server.ts:57`.
  - `MAIL_ENCRYPTION_KEY` hardcode trong `docker-compose.yml`.
  - MySQL database credentials trong `docker-compose.yml`.
  - Mật khẩu admin mặc định trong seed (`db_mysql.ts`), qua env `ADMIN_DEFAULT_PASSWORD`.
  - `@google/genai` ở frontend → nguy cơ lộ API key qua browser; nên gọi AI qua backend `/api/ai/*`.
- Mọi endpoint mới PHẢI kiểm tra authorization ở backend (không chỉ frontend). Chú ý IDOR — verify người dùng có quyền trên resource `:id`.
- Giữ parameterized query (chống SQL injection). Sanitize HTML (`dompurify`) chống XSS.
- Validate file upload (type/size) — hiện `multer` chưa whitelist chặt.
- Nếu phát hiện secret trong repo: che bằng `****`, báo vị trí file, đề xuất chuyển sang env var, KHÔNG in secret đầy đủ, KHÔNG commit.

## 20. Những quyết định kiến trúc quan trọng

- **Monorepo npm workspaces** — FE + BE cùng repo, cài chung từ root.
- **Backend chạy bằng `tsx`** (không build ra JS) cho cả dev và production start — deploy = chạy TS trực tiếp.
- **Database: MySQL 8 (`mysql2`) duy nhất** — kết nối qua `DATABASE_URL`. Khi sửa schema, cập nhật trực tiếp tại `db_mysql.ts`.
- **Backend serve luôn frontend** — production, Express serve `frontend/dist` (SPA fallback) + `/uploads`. Không có web server riêng cho FE ở production (Nginx đứng trước reverse-proxy).
- **Port:** backend 3500, frontend dev 5173 (proxy `/api` + `/socket.io` → 3500).
- **react-query** là nguồn server state duy nhất phía FE — mutation phải `invalidateQueries` để đồng bộ.
- **Realtime qua Socket.io** cho notification/meeting.

---

> Tài liệu này xác minh từ source code ngày 2026-08-31. Cập nhật khi kiến trúc/tech stack thay đổi. Chi tiết bảng DB, route, migration: xem [phan_tich.MD](phan_tich.MD).
