

# Tran Le Tasks — Tran Le Electricity Management & Collaboration Platform

Hệ thống **Tran Le Tasks** là giải pháp quản trị công việc, dự án năng lượng tái tạo, hợp đồng và cộng tác nội bộ toàn diện cho **Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê (Tran Le Electricity)**. Hệ thống tích hợp các module từ quản lý tiến độ, dự án điện mặt trời, kho hàng, hợp đồng, đặt phòng họp, lịch biểu, đến quản lý email nội bộ và Trợ lý ảo AI.

## ✨ Tính năng nổi bật

- **Quản lý công việc (Task Management):** Hỗ trợ Kanban Board, List View, Calendar View. Tính năng giao việc, gắn thẻ, cập nhật tiến độ (Todo, In Progress, Review, Done).
- **Lịch & Phòng họp (Calendar & Meetings):** Đặt lịch họp, quản lý phòng họp theo thời gian thực (Socket.io).
- **Danh bạ Đội ngũ (Team Directory):** Hiển thị hồ sơ chi tiết nhân sự bao gồm Email, Số điện thoại, Ngày sinh, Quê quán, CCCD và Giới tính. Tích hợp Click-to-Call và Click-to-Email.
- **Hệ thống Mail (IMAP/SMTP):** Đọc, soạn thảo và gửi email nội bộ/ngoại bộ trực tiếp từ nền tảng. Hỗ trợ chữ ký tự động, lưu nháp, đính kèm tệp.
- **Báo cáo & Phân tích (Reports & Dashboard):** Theo dõi hiệu suất cá nhân và phòng ban thông qua các biểu đồ trực quan.
- **Quản trị viên (Admin Panel):** Quản lý người dùng, phân quyền (Roles & Permissions), thiết lập hệ thống.
- **Trợ lý AI (Gemini Assistant):** Hỗ trợ tư vấn, tạo mẫu task tự động, gợi ý công việc tích hợp ngay trong hệ thống.
- **Real-time Collaboration:** Đồng bộ hóa dữ liệu thời gian thực cho mọi thay đổi thông qua Socket.io.

## 💻 Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Lucide React, React Router 7.
- **Backend:** Node.js 22, Express 5, MySQL 8 qua `mysql2`.
- **Real-time:** Socket.io (Hỗ trợ chat, meeting room, cập nhật dữ liệu realtime).
- **Khác:** Nodemailer, `imapflow` + `mailparser` (Hệ thống Mail), Google Gemini API (AI).

---

## 🚀 Hướng dẫn cài đặt (Run Locally)

**Yêu cầu hệ thống (Prerequisites):** 
- [Node.js](https://nodejs.org/en/) 22 trở lên
- npm
- MySQL 8, hoặc Docker Desktop để chạy toàn bộ stack

### Bước 1: Cài đặt Dependencies

Hệ thống được thiết kế theo dạng **Monorepo** (gồm cả frontend và backend). Từ thư mục gốc (root directory), hãy chạy lệnh sau để cài đặt toàn bộ gói thư viện cần thiết:

```bash
npm install
```

### Bước 2: Thiết lập biến môi trường (Environment Variables)

Sao chép `backend/.env.example` thành `backend/.env` (hoặc cấu hình `.env` ở thư mục gốc khi chạy Docker), sau đó đặt ít nhất `DATABASE_URL`, `JWT_SECRET`, `MAIL_ENCRYPTION_KEY` và `ADMIN_DEFAULT_PASSWORD`.

- **Frontend:** `frontend/.env.example` chỉ cấu hình Vite/proxy phát triển.
- **Backend:** Cơ sở dữ liệu duy nhất là MySQL 8; không dùng SQLite, PostgreSQL hay Prisma.
- **Docker:** Adminer và phpMyAdmin chỉ có profile `debug` và chỉ bind `localhost`; không được mở chúng ra Internet.

### Bước 3: Khởi chạy hệ thống

Chạy lệnh sau tại thư mục gốc. Lệnh này sẽ tự động khởi động đồng thời cả Backend (Port 3500) và Frontend (Port 5173).

```bash
npm run dev
```

### Bước 4: Đăng nhập

Mở trình duyệt và truy cập `http://localhost:5173`. 
Hệ thống đã được tự động tạo dữ liệu mẫu (Seed Data). Bạn có thể đăng nhập bằng tài khoản quản trị viên:



---

## 🛠 Cấu trúc thư mục

- `/frontend`: Chứa toàn bộ mã nguồn React, Components, Contexts, Pages.
- `/backend`: Mã nguồn Node.js Server, API Routes (users, tasks, mail, auth, reports), Database Schema & Migrations.
- `package.json`: Chứa các script `concurrently` để chạy hệ thống.

## 🤝 Hỗ trợ

Nếu gặp bất kỳ khó khăn nào trong quá trình cài đặt và vận hành, vui lòng kiểm tra logs terminal hoặc liên hệ với đội ngũ phát triển. Chúc bạn có trải nghiệm tuyệt vời với CTC Task!
"# tranle_tasks" 
