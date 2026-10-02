# AGENTS.md — Tran Le Tasks (OpenCode V2 entrypoint)

> OpenCode V2 chỉ đọc `AGENTS.md`, không dùng `CLAUDE.md` làm fallback.
> Chi tiết đầy đủ: xem `CLAUDE.md` (quy chuẩn code), `phan_tich.MD` (kiến trúc + 77 bảng MySQL), `TRANLE_TASKS_MASTER_REBUILD.md` §44 (Definition of Done).

## Project

Monorepo npm workspaces (`frontend` React 19 + Vite 6 + Tailwind 4, `backend` Express 5 + tsx + MySQL 8 qua `mysql2`).
Chạy dev từ root: `npm run dev` (backend `:3500` + frontend `:5173`).
Kiểm tra: `npm run typecheck`, `npm run test --workspace=backend`, `npm run test --workspace=frontend`, `npm run build`.
Deploy: `docker compose up -d --build`, domain `task.tranlecorp.com.vn`.

## Rules (từ CLAUDE.md)

1. Zero-Hardcode: mọi KPI/chart/hoa hồng/vật tư lấy từ MySQL qua API service hoặc Context. Form khởi tạo `''`/`0` + `placeholder`.
2. RBAC: Employee chỉ tạo tờ trình/xem task mình, không duyệt tài chính/hợp đồng. Manager duyệt trong `departmentId` mình. Director/Admin toàn quyền.
3. Backend: parameterized queries chống SQL injection. Import nội bộ giữ đuôi `.js` (ESM).
4. Frontend: Tailwind 4, React Query `invalidateQueries` sau mutation, sanitize bằng `dompurify`, thông báo qua Toast/NotificationContext (không `alert()`).
5. DepartmentWorkspace: URL là nguồn trạng thái (`/department-workspace/:departmentId/:section`, 11 sections trong `frontend/pages/DepartmentWorkspace/deptSections.ts`). GET dùng `requireDepartmentMember`, ghi dùng `requireDepartmentManager` (`backend/middleware/auth.ts`).

## Skills (ECC, auto-discovery)

11 skills trong `.opencode/skills/`: `tdd-workflow`, `security-review`, `coding-standards`, `frontend-patterns`, `frontend-slides`, `backend-patterns`, `e2e-testing`, `verification-loop`, `api-design`, `strategic-compact`, `eval-harness`.
