# 🔍 Phân Tích Toàn Diện Dự Án Tran Le Tasks

> **Ngày cập nhật:** 13/09/2026 (Phiên bản 6.0 — Hệ thống 13 Không gian làm việc Phòng ban & 100% MySQL 8 Dynamic, đồng bộ từ source code thực tế)  
> **Mục đích:** Tài liệu kỹ thuật chi tiết về cấu trúc mã nguồn, kiến trúc hệ thống, cơ sở dữ liệu MySQL, quy trình nghiệp vụ 13 phòng ban và quy chuẩn phát triển dành cho kỹ sư & Agent AI.  
> **Tham khảo thêm:** [CLAUDE.md](CLAUDE.md), `.agent/workflows/tranle-*.md`.

---

## 1. Tổng Quan Dự Án

**Tran Le Tasks** là nền tảng điều hành sản xuất kinh doanh, quản lý dự án EPC Solar, bảo trì O&M, quản trị tài chính, nhân sự và cộng tác số toàn diện dành cho **Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê (Tran Le Electricity — tranlecorp.com)**.

Hệ thống được thiết kế theo mô hình **Monorepo** chuẩn mực, kết hợp giữa giao diện người dùng tương tác cao (React 19, TailwindCSS 4, Vite 6), máy chủ ứng dụng phi đồng bộ (Express 5, Node.js 22, Socket.io 4) và cơ sở dữ liệu quan hệ **100% MySQL 8** không sử dụng dữ liệu tĩnh hay mock data.

| Thuộc tính | Giá trị kỹ thuật |
|---|---|
| **Mô hình kiến trúc** | Monorepo (Workspaces: `frontend`, `backend`) |
| **Frontend Framework** | React 19.2 + Vite 6.4 + TailwindCSS 4 + TypeScript 5.8 |
| **Backend Framework** | Express 5.2 + TypeScript 5.8 (Runtime qua `tsx`) |
| **Cơ sở dữ liệu** | **MySQL 8.0** thuần (`mysql2` connection pool & async/await) |
| **Giao thức Thời gian thực** | Socket.io 4.8 (Notifications, Realtime Chat & Status Sync) |
| **Hội họp Trực tuyến** | WebRTC Peer-to-Peer + Signaling server + MediaPipe Vision |
| **Trí tuệ nhân tạo (AI)** | Google Gemini API (`@google/genai` trên backend) |
| **Dịch vụ Thư điện tử** | Nodemailer (SMTP) + IMAPFlow (IMAP) + Poste.io Mail Server |
| **Triển khai Đóng gói** | Docker Compose đa dịch vụ (App, MySQL 8, Poste.io, Adminer, phpMyAdmin) |
| **Port dịch vụ** | Backend App: `3500` \| MySQL: `3306` \| Poste.io: `8080/465/993` \| Adminer: `8081` |

---

## 2. Cấu Trúc Mã Nguồn Monorepo

```
tranle_tasks/
├── package.json                      # Workspaces config (frontend, backend)
├── docker-compose.yml                # 5 Docker services (App, MySQL, Mail, Adminer, phpMyAdmin)
├── Dockerfile                        # Multi-stage Dockerfile (Vite build -> Node.js Express serve)
├── ecosystem.config.cjs              # PM2 cluster configuration
├── CLAUDE.md                         # Quy chuẩn coding conventions
├── phan_tich.MD                      # [Tài liệu này] Báo cáo phân tích toàn diện
├── .env                              # Biến môi trường hệ thống
├── .agent/                           # ECC Agentic Skills & Workflows
│   ├── skills/                       # Kỹ năng phát triển (code-review, tdd, security, verification)
│   └── workflows/                    # Lệnh thao tác (/tranle-feature, /tranle-plan, /tranle-db, ...)
│
├── frontend/                         # Giao diện người dùng React 19
│   ├── App.tsx                       # Bộ định tuyến trung tâm (App Routing & Guards)
│   ├── main.tsx                      # Entry point React (QueryClient, ThemeProvider, ToastProvider)
│   ├── types.ts                      # Toàn bộ Typescript interfaces & enums
│   ├── vite.config.ts                # Cấu hình Vite, build chunks splitting & proxy /api
│   │
│   ├── components/                   # Khối thành phần tái sử dụng
│   │   ├── layout/                   # Sidebar Navigation & TopHeader Notification
│   │   ├── finance/                  # MilestonePaymentModal, ArAgingDetailModal
│   │   ├── epc/                      # DailySiteLogModal (Nhật ký thi công)
│   │   ├── om/                       # SajRmaTicketModal, FlirThermalScanModal
│   │   ├── solar/                    # Components năng lượng mặt trời dùng chung
│   │   ├── workflow/                 # WorkQueue, DepartmentRequestPanel
│   │   ├── meeting/                  # WebRTC Video Room, Screen Sharing, Background Blur
│   │   ├── AIAssistant.tsx           # Trợ lý ảo AI Gemini Chatbot
│   │   ├── TaskModal.tsx             # Modal tạo và phân công công việc
│   │   └── UI.tsx                    # Button, Badge, Modal, Input primitives
│   │
│   ├── pages/                        # 22 Module màn hình chính
│   │   ├── Dashboard/                # Tổng quan KPI công ty, biểu đồ tiến độ
│   │   ├── Tasks/                    # Quản trị task: Kanban board, List view, Gantt/Calendar
│   │   ├── Calendar/Notes/Team/Settings/Notifications/Organization # Lịch, Ghi chú, Nhân sự, Cài đặt, Thông báo, Sơ đồ tổ chức
│   │   ├── DepartmentWorkspace/      # Không gian làm việc 13 phòng ban chuyên biệt
│   │   │   ├── index.tsx             # Bộ điều hướng phòng ban
│   │   │   ├── DepartmentDomainView.tsx # View nghiệp vụ theo domain phòng ban
│   │   │   ├── tabs/                 # 6 Tab mở rộng toàn diện:
│   │   │   │   ├── DepartmentDashboardTab.tsx   # Dashboard KPI phòng ban & Biểu đồ phân bổ
│   │   │   │   ├── DepartmentCalendarTab.tsx    # Lịch biểu deadline & Sự kiện phòng ban
│   │   │   │   ├── DepartmentDocsTab.tsx        # Kho tài liệu, biểu mẫu ISO & kỹ thuật
│   │   │   │   ├── DepartmentApprovalsTab.tsx   # Trung tâm phê duyệt tờ trình số
│   │   │   │   ├── DepartmentReportsTab.tsx     # Báo cáo hiệu suất & Xuất Excel XLSX
│   │   │   │   ├── DepartmentAuditTab.tsx       # Dòng thời gian nhật ký kiểm toán (Audit Trail)
│   │   │   │   └── index.ts                     # Barrel export tabs
│   │   │   └── departments/          # 13 Workspace nghiệp vụ đặc thù:
│   │   │       ├── SalesWorkspace.tsx           # Kinh doanh Solar: CRM Pipeline, Commission Calculator
│   │   │       ├── EngineeringWorkspace.tsx     # Kỹ thuật Solar: Khảo sát, PV Sizing, SLD Design
│   │   │       ├── EpcWorkspace.tsx             # Thi công EPC: Nhật ký site, Thầu phụ, HSE
│   │   │       ├── OmWorkspace.tsx              # O&M SAJ: SCADA Alarms, RMA Ticket, Lịch vệ sinh pin
│   │   │       ├── ProcurementWorkspace.tsx     # Mua hàng SCM: Phiếu PR, Đơn PO, Chuỗi cung ứng
│   │   │       ├── WarehouseWorkspace.tsx       # Kho vận: Tồn kho SKU, Phiếu Inbound/Outbound
│   │   │       ├── FinanceWorkspace.tsx         # Kế toán: Lệnh chi AP, Công nợ AR, Dòng tiền
│   │   │       ├── HrWorkspace.tsx              # Nhân sự: Tuyển dụng, Chấm công, Nghỉ phép PTO
│   │   │       ├── ItWorkspace.tsx              # IT số hóa: Helpdesk tickets, Cấp phát thiết bị
│   │   │       ├── LegalWorkspace.tsx           # Pháp chế: Sổ hợp đồng, Thẩm định rủi ro
│   │   │       ├── MarketingWorkspace.tsx       # Marketing: Chiến dịch PR, Nguồn leads
│   │   │       ├── CustomerCareWorkspace.tsx    # CSKH: Hotline/Zalo tickets, HĐ Tái ký O&M
│   │   │       └── ExecutiveWorkspace.tsx       # Ban Giám Đốc: Cockpit chiến lược, OKRs, Giao ban
│   │   ├── Contracts/                # Quản lý Hợp đồng đầu vào/ra & Bán lẻ
│   │   ├── Projects/ + ProjectReports/ # Danh mục dự án đấu thầu & EPC + Báo cáo dự án
│   │   ├── Revenue/                  # Báo cáo doanh thu & Dòng tiền thực thu
│   │   ├── Products/                 # Quản lý danh mục thiết bị Solar (AIKO, SAJ, v.v.)
│   │   ├── Meetings/                 # Phòng họp trực tuyến WebRTC
│   │   ├── Mail/                     # Hòm thư Webmail nội bộ (IMAP/SMTP)
│   │   ├── Reports/                  # Báo cáo công việc định kỳ
│   │   ├── Approvals/                # Trung tâm phê duyệt tờ trình số
│   │   ├── DocumentAdmin/            # Kho lưu trữ tài liệu số
│   │   └── Admin/                    # Quản trị hệ thống, RBAC & Backup/Restore JSON
│   │
│   ├── contexts/                     # Quản lý trạng thái ứng dụng (4 contexts)
│   │   ├── AuthContext.tsx           # Xác thực JWT & phân quyền người dùng
│   │   ├── DataContext.tsx           # Server State Management qua React Query
│   │   ├── LanguageContext.tsx       # Đa ngôn ngữ (Tiếng Việt / English)
│   │   └── NotificationContext.tsx   # Thông báo thời gian thực qua WebSocket
│   │
│   └── services/                     # Lớp giao tiếp API Backend (23 files)
│       ├── api.ts                    # Axios/Fetch client kèm JWT Interceptor
│       ├── departmentWorkspaceService.ts # API CRUD nghiệp vụ 13 phòng ban
│       ├── taskService.ts / noteService.ts / reportService.ts # Công việc, Ghi chú, Báo cáo
│       ├── contractService.ts + contractLinkService.ts # Hợp đồng + Liên kết HĐ
│       ├── projectService.ts / productService.ts / revenueService.ts # Dự án, Kho, Doanh thu
│       ├── userService.ts / roleService.ts / departmentService.ts / teamService.ts # Tổ chức
│       ├── organizationService.ts / positionService.ts / approvalService.ts # Orgchart, Chức danh, Phê duyệt
│       ├── departmentRequestService.ts / documentService.ts / taskTemplateService.ts # Liên phòng ban, Tài liệu, Mẫu việc
│       ├── clientService.ts / meetingService.ts # Khách hàng, Họp
│       └── aiService.ts              # Trí tuệ nhân tạo Gemini
│
└── backend/                          # Máy chủ ứng dụng Express 5 & MySQL 8
    ├── server.ts                     # Khởi tạo HTTP server, socket.io & 29 routes (server.ts:108-137)
    ├── db_mysql.ts                   # MySQL 8 adapter + DDL 68 tables + seeds + SQL normalizer (~1285 dòng)
    ├── socket.ts                     # Cấu hình Realtime WebSocket Server
    ├── mailer.ts                     # Trình gửi Email SMTP Transporter
    ├── middleware/                   # 2 middlewares
    │   ├── auth.ts                   # requireAuth / requireAdmin (JWT)
    │   └── validate.ts               # Kiểm tra tính hợp lệ dữ liệu (Zod)
    ├── schedulers/                   # 5 cron jobs: fridayReminder, noteReminder, dailyTaskReminder, mailScheduler, revenueAutoSubmit
    └── routes/                       # 29 Router API Express:
        ├── departmentWorkspace.ts    # [TRUNG TÂM] API records & KPIs cho 13 phòng ban
        ├── auth.ts                   # Xác thực, Đăng nhập, Reset mật khẩu
        ├── users.ts / roles.ts / departments.ts / teams.ts / positions.ts / organization.ts # Tổ chức & RBAC
        ├── tasks.ts + taskTemplates.ts # CRUD công việc, subtasks & Mẫu công việc
        ├── contracts.ts + contractLinks.ts # CRUD hợp đồng & Liên kết HĐ đầu vào/ra
        ├── projects.ts / products.ts / revenue.ts / clients.ts # Dự án, Vật tư, Doanh thu, Khách hàng
        ├── approvals.ts + departmentRequests.ts # Phê duyệt số + Yêu cầu liên phòng ban
        ├── notes.ts / reports.ts / events.ts / activity.ts / notifications.ts # Ghi chú, Báo cáo, Sự kiện, Audit, Thông báo
        ├── documents.ts / mail.ts / meetings.ts / upload.ts # Tài liệu, IMAP/SMTP, Họp WebRTC, Upload
        ├── admin.ts                  # Quản trị người dùng & Export/Import DB
        └── ai.ts                     # Tương tác với Google Gemini Model
```

---

## 3. Kiến Trúc Cơ Sở Dữ Liệu MySQL 8 (68 Bảng — `backend/db_mysql.ts`)

Hệ thống hoạt động trên nền tảng **100% MySQL 8**, tuân thủ nguyên tắc không sử dụng mock data. Mọi chỉ số thống kê (KPIs, Charts, Workflows) đều được tính toán theo thời gian thực từ cơ sở dữ liệu.

### 3.1 Nhóm Bảng Cốt Lõi Hệ Thống (Core Tables)
1. `users`: Thông tin tài khoản nhân sự, phân quyền, mật khẩu băm bcrypt, trạng thái khóa.
2. `roles`: Danh mục vai trò và tập quyền hạn RBAC.
3. `departments`: Danh mục phòng ban trực thuộc Tran Le Electricity.
4. `teams` & `positions`: Đội nhóm và chức danh trong cơ cấu tổ chức.
5. `tasks`: Danh sách công việc, phân loại, độ ưu tiên, deadline, trạng thái Kanban.
6. `task_assignees`: Bảng liên kết nhiều-nhiều giữa task và nhân viên được giao việc.
7. `task_tags`: Nhãn công việc.
8. `task_subtasks`: Danh sách đầu việc con trong từng task.
9. `task_comments`: Thảo luận và trao đổi công việc.
10. `task_templates`: Mẫu công việc tái sử dụng.
11. `contracts`: Hợp đồng kinh tế, giá trị trước/sau thuế, tiến độ thanh toán.
12. `contract_links`: Quan hệ liên kết giữa các hợp đồng đầu vào và đầu ra.
13. `clients`: Danh mục khách hàng / đối tác.
14. `projects`: Danh mục dự án đấu thầu, tổng thầu EPC và thương mại.
15. `project_milestones`: Các mốc tiến độ chính của dự án.
16. `project_reports`: Báo cáo tiến độ hiện trường định kỳ.
17. `project_departments` & `project_members`: Phân rã dự án theo phòng ban và thành viên.
18. `products`: Danh mục thiết bị Solar (Tấm pin AIKO, Biến tần SAJ, Phụ kiện DC).
19. `revenue_reports`: Báo cáo doanh thu tài chính định kỳ.
20. `meetings` & `meeting_participants`: Lịch họp và danh sách người tham dự.
21. `signals`: Tín hiệu WebRTC P2P dành cho video call.
22. `notes` (+ `reports`): Sổ tay ghi chú cá nhân, lịch nhắc và báo cáo tuần.
23. `notifications` & `scheduled_emails` & `mail_tracking` & `mail_quotas`: Thông báo realtime, mail hẹn giờ, tracking và hạn mức mail.
24. `events`: Sự kiện lịch biểu & deadline.
25. `activity_logs` & `db_history` & `_migrations`: Audit Trail, lịch sử DB và phiên bản migration.
26. `documents`: Kho tài liệu số.
27. `department_requests` & `approvals`: Yêu cầu liên phòng ban và tờ trình phê duyệt số.
28. `system_config`: Cấu hình hệ thống key-value.
29. `password_reset_requests` & `password_reset_tokens`: Luồng quên / đặt lại mật khẩu.

### 3.2 Nhóm Bảng Nghiệp Vụ Chuyên Biệt 13 Phòng Ban
| Tên Bảng MySQL | Phòng Ban Phụ Trách | Trường Dữ Liệu Chính | Mục Đích Nghiệp Vụ |
|---|---|---|---|
| `sales_leads` | Kinh Doanh & CRM | `id, name, value, capacity, contact, stage, sent` | Quản lý phễu cơ hội bán hàng Solar |
| `sales_performance` | Kinh Doanh & CRM | `id, name, sales, createdAt` | Bảng xếp hạng doanh số nhân viên |
| `engineering_requests` | Kỹ Thuật Solar | `id, type, project, date, status, priority` | Yêu cầu khảo sát mái, P&ID, thỏa thuận đấu nối |
| `engineering_designs` | Kỹ Thuật Solar | `id, name, capacity, stage, progress, tasks` | Hồ sơ thiết kế kỹ thuật, bản vẽ 1 sợi SLD |
| `epc_subcontractors` | Tổng Thầu EPC | `id, name, task, rating, status` | Quản lý đội thầu phụ thi công cơ điện |
| `om_alarms` | O&M SAJ Center | `id, site, inverter, fault, time, severity, status` | Cảnh báo SCADA sự cố biến tần SAJ |
| `om_schedules` | O&M SAJ Center | `id, site, task, date, team, status` | Kế hoạch bảo dưỡng định kỳ và rửa pin |
| `procurement_prs` | Mua Hàng & SCM | `id, project, items, date, status, priority` | Phiếu yêu cầu mua sắm vật tư (PR) |
| `procurement_pos` | Mua Hàng & SCM | `id, supplier, value, items, stage, progress, eta` | Đơn đặt hàng nhà cung cấp (PO) |
| `warehouse_inventory` | Kho Vận & Logistics | `id, sku, name, category, stock, minStock, unit` | Danh mục tồn kho tấm pin AIKO, biến tần SAJ |
| `warehouse_inbound` | Kho Vận & Logistics | `id, source, items, date, status` | Phiếu nhập kho từ cảng / nhà máy |
| `warehouse_outbound` | Kho Vận & Logistics | `id, project, items, date, status, requestedBy` | Phiếu xuất kho cấp phát vật tư công trình |
| `finance_ap` | Tài Chính Kế Toán | `id, dept, desc_text, amount, vendor, date, status` | Lệnh chi tiền, ủy nhiệm chi (AP) |
| `finance_ar` | Tài Chính Kế Toán | `id, project, desc_text, amount, customer, dueDate` | Thu hồi công nợ theo mốc nghiệm thu (AR) |
| `hr_recruitment` | Hành Chính Nhân Sự | `id, title, dept, slots, applied, status` | Chiến dịch tuyển dụng kỹ sư & kinh doanh |
| `hr_employees` | Hành Chính Nhân Sự | `id, name, position, dept, status, pto, timesheet` | Hồ sơ nhân sự, phép năm & bảng chấm công |
| `it_tickets` | CNTT & Số Hóa | `id, issue, requester, priority, status, time` | Phiếu yêu cầu hỗ trợ kỹ thuật IT Helpdesk |
| `it_assets` | CNTT & Số Hóa | `id, name, assignee, type, status` | Quản lý máy đo, laptop, license phần mềm |
| `it_systems` | CNTT & Số Hóa | `id, name, status, uptime, load_pct` | Giám sát hạ tầng máy chủ và mạng |
| `executive_metrics` | Ban Giám Đốc | `id, metric, value, period` | Chỉ số điều hành tổng hợp cho Cockpit |
| `legal_contracts` | Pháp Chế & HĐ | `id, title, partner, type, value, status, expiry` | Sổ theo dõi hợp đồng và cam kết pháp lý |
| `legal_approvals` | Pháp Chế & HĐ | `id, title, entity, requester, step, urgency` | Tờ trình thẩm định điều khoản rủi ro |
| `legal_library` | Pháp Chế & HĐ | `id, title, category, file` | Thư viện văn bản pháp luật & biểu mẫu ISO |
| `marketing_campaigns` | Marketing & PR | `id, title, channels, status` | Lịch biên tập nội dung, hội thảo Solar Expo |
| `marketing_leads` | Marketing & PR | `id, source, percentage` | Tỷ trọng chuyển đổi nguồn khách hàng tiềm năng |
| `customer_tickets` | Chăm Sóc Khách Hàng | `id, customer, channel, title, status, agent` | Hàng đợi khiếu nại và bảo hành 24/7 |
| `contract_renewals` | Chăm Sóc Khách Hàng | `id, customer, expiry, value, status` | Quản lý hợp đồng đến hạn tái ký gói O&M |
| `company_okrs` | Ban Giám Đốc | `id, objective, progress, dept, status` | Quản trị mục tiêu trọng tâm quý (OKRs) |
| `executive_meetings` | Ban Giám Đốc | `id, title, date, actions, pending` | Lịch giao ban điều hành & Action Items HĐQT |

---

## 4. Chi Tiết Tính Năng Nghiệp Vụ 13 Phòng Ban

### 4.1 Phòng Kinh Doanh & CRM (`SalesWorkspace.tsx`)
- **Phễu bán hàng 4 giai đoạn:** Tiếp nhận Lead ➔ Đánh giá tính khả thi (Qualified) ➔ Báo giá & Proposal ➔ Ký kết thành công (Won).
- **Bộ tính hoa hồng kinh doanh (Commission Calculator):** Tính toán tức thời Lợi nhuận gộp ước tính và Hoa hồng thực nhận dựa trên giá trị hợp đồng và tỷ lệ hoa hồng cam kết.
- **Thao tác nhanh 1-Click:** Chuyển đổi trạng thái cơ hội sang giai đoạn tiếp theo và kích hoạt luồng khảo sát sang phòng Kỹ thuật.

### 4.2 Phòng Kỹ Thuật Solar (`EngineeringWorkspace.tsx`)
- **Quản lý yêu cầu kỹ thuật:** Tiếp nhận yêu cầu Khảo sát hiện trường, Lập bảng bóc tách vật tư (BOM), Thiết kế sơ đồ 1 sợi SLD, Thỏa thuận đấu nối EVN.
- **Bộ tính chuỗi tấm pin & Biến tần (PV String Sizing Tool):** Phân tích tương thích giữa tấm pin AIKO Neostar (Voc, Vmp, Pmax) và dải điện áp MPPT của biến tần SAJ Electric, cảnh báo quá tải DC/AC.

### 4.3 Khối Tổng Thầu Thi Công EPC (`EpcWorkspace.tsx`)
- **Giám sát công trình thực địa:** Theo dõi tiến độ thi công thực tế của từng dự án điện mặt trời áp mái và trang trại Solar Farm.
- **Nhật ký công trường số (`DailySiteLogModal`):** Ghi nhận thời tiết, quân số công nhân, khối lượng lắp đặt hoàn thành và tải ảnh hiện trường.
- **Quản lý Thầu phụ:** Đánh giá năng lực thi công và sao chất lượng của các đội thầu phụ kéo cáp, lắp khung.

### 4.4 Trung Tâm Dịch Vụ O&M SAJ (`OmWorkspace.tsx`)
- **Bảng điều độ SCADA Alarms:** Giám sát cảnh báo lỗi biến tần SAJ (Quá nhiệt, chạm đất cách điện, lệch pha lưới điện EVN).
- **Lập lịch bảo dưỡng định kỳ (PM Schedule):** Lên kế hoạch rửa pin bằng robot tự động và kiểm tra siết lực giàn khung nhôm.
- **Phiếu bảo hành RMA SAJ (`SajRmaTicketModal`) & Báo cáo quét nhiệt FLIR (`FlirThermalScanModal`):** Xử lý quy trình đổi mới thiết bị và kiểm tra điểm nóng Hotspot.

### 4.5 Phòng Mua Hàng & SCM (`ProcurementWorkspace.tsx`)
- **Phiếu đề xuất mua hàng (PR - Purchase Request):** Tiếp nhận yêu cầu vật tư từ ban chỉ huy công trình.
- **Đơn đặt hàng nhà cung cấp (PO - Purchase Order):** Quản lý tiến độ thanh toán và giao nhận từ các hãng AIKO Solar, SAJ Electric, Leader Cable.

### 4.6 Phòng Kho Vận & Logistics (`WarehouseWorkspace.tsx`)
- **Kiểm kê vật tư theo mã SKU:** Quản lý số lượng tồn kho thực tế, định mức dự trữ tối thiểu cho tấm pin, biến tần và phụ kiện tủ điện.
- **Phiếu Nhập kho (Inbound) & Xuất kho (Outbound):** Lưu vết chi tiết nguồn gốc container cập cảng và cấp phát xuất cho từng dự án cụ thể.

### 4.7 Phòng Tài Chính Kế Toán (`FinanceWorkspace.tsx`)
- **Quản trị Phải trả (AP):** Lập và duyệt Lệnh thanh toán / Ủy nhiệm chi cho nhà cung cấp và đội thầu phụ.
- **Quản trị Phải thu (AR):** Theo dõi công nợ khách hàng theo từng đợt nghiệm thu bàn giao và phát hành hóa đơn VAT.

### 4.8 Phòng Hành Chính Nhân Sự (`HrWorkspace.tsx`)
- **Quản lý tuyển dụng:** Đăng tin tuyển dụng và theo dõi ứng viên các vị trí Kỹ sư Solar, Trưởng nhóm kinh doanh.
- **Quản lý Nghỉ phép (PTO) & Chấm công:** Tiếp nhận đơn xin nghỉ phép, công tác hiện trường và chốt dữ liệu chuyển bảng lương.

### 4.9 Phòng CNTT & Chuyển Đổi Số (`ItWorkspace.tsx`)
- **IT Helpdesk:** Tiếp nhận và xử lý yêu cầu hỗ trợ kỹ thuật phần mềm, cấu hình máy tính và mạng nội bộ.
- **Quản lý tài sản số & License:** Cấp phát laptop kỹ thuật, máy đo quang điện và bản quyền phần mềm thiết kế chuyên dụng (PVsyst, AutoCAD).

### 4.10 Phòng Pháp Chế & Hợp Đồng (`LegalWorkspace.tsx`)
- **Sổ theo dõi hợp đồng:** Kiểm soát thời hạn hiệu lực, giá trị pháp lý và điều khoản bảo hành của các hợp đồng EPC, O&M, Mua bán.
- **Thẩm định tờ trình:** Rà soát điều khoản phạt trễ hạn, rủi ro pháp lý và an toàn PCCC.

### 4.11 Phòng Marketing & Truyền Thông (`MarketingWorkspace.tsx`)
- **Lịch biên tập nội dung số:** Lên kế hoạch chiến dịch truyền thông thương hiệu Năng Lượng Xanh Trần Lê.
- **Phân tích nguồn Leads:** Đo lường hiệu quả chuyển đổi từ các kênh Triển lãm Solar Expo, Website và Mạng xã hội.

### 4.12 Trung Tâm Chăm Sóc Khách Hàng (`CustomerCareWorkspace.tsx`)
- **Hàng đợi Ticket CSKH 24/7:** Tiếp nhận cuộc gọi Hotline, Zalo OA và điều phối kỹ thuật xử lý sự cố.
- **Gia hạn & Tái ký HĐ O&M (Retention):** Tự động phát hiện các dự án sắp hết hạn bảo trì miễn phí để chào bán gói O&M mở rộng.

### 4.13 Ban Giám Đốc (`ExecutiveWorkspace.tsx`)
- **Executive Cockpit:** Bảng điều khiển chiến lược tổng hợp Tổng giá trị hợp đồng ký kết, Doanh thu thực tế và Số dự án đang chạy.
- **Quản trị Mục tiêu OKRs:** Giao chỉ tiêu định lượng cho từng phòng ban và đo lường tiến độ hoàn thành.
- **Lịch giao ban HĐQT:** Quản lý các cuộc họp lãnh đạo cấp cao và đôn đốc các Action Items trọng yếu.

---

## 5. 6 Tab Đa Năng Cho Mọi Phòng Ban (`frontend/pages/DepartmentWorkspace/tabs/`)

Bên cạnh tab nghiệp vụ riêng, mọi phòng ban đều sở hữu **6 tab quản trị chuẩn hóa**:
1. **Tổng Quan (Dashboard):** Biểu đồ tròn cơ cấu trạng thái task, biểu đồ cột phân bổ theo mức độ ưu tiên, danh sách việc khẩn cần xử lý và yêu cầu liên phòng ban.
2. **Lịch Biểu & Deadline (Calendar):** Chế độ xem Lịch Tháng (Month Grid) và Lịch Nghị sự (Agenda), lọc theo hạn chót công việc và sự kiện nội bộ.
3. **Kho Tài Liệu (Docs):** Quản lý tài liệu kỹ thuật, bản vẽ CAD, file PDF hợp đồng và biên bản nghiệm thu; tích hợp modal tải tệp lên.
4. **Phê Duyệt Số (Approvals):** Trung tâm xử lý tờ trình, đề xuất chi ngân sách, duyệt kỹ thuật với nút duyệt/từ chối 1-click.
5. **Báo Cáo Hiệu Suất (Reports):** Đo lường tỷ lệ tuân thủ cam kết SLA, bảng xếp hạng năng suất nhân viên và xuất báo cáo Excel (.xlsx) chuẩn hóa tức thì.
6. **Nhật Ký Hoạt Động (Audit Trail):** Dòng thời gian ghi nhận chi tiết lịch sử tạo, sửa, xóa và thay đổi trạng thái của mọi thành viên.

---

## 6. Lệnh Triển Khai & Kiểm Thử Nghiệm Thu

```bash
# 1. Khởi chạy toàn bộ hệ thống bằng Docker Compose
docker compose up -d --build

# 2. Kiểm tra log của backend container
docker logs -f tranle_task_app

# 3. Kiểm tra kiểu toàn monorepo (root proxy typecheck cả 2 workspaces)
npm run typecheck

# 4. Build kiểm tra Bundle frontend
npm run build

# 5. Chạy kiểm thử tự động trên Backend (vitest + supertest)
npm run test --workspace=backend
```

---

> **Cam kết chất lượng:** Toàn bộ hệ thống TranLe Tasks tuân thủ nguyên tắc **Zero-Hardcode**, 100% dữ liệu đồng bộ và lưu trữ an toàn trong MySQL 8 (68 bảng), phục vụ hoàn hảo cho quy trình làm việc thực tế của Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê. Tài liệu đồng bộ từ source code ngày 13/09/2026: 29 routes backend, 22 pages + 23 services frontend, 5 schedulers, 4 contexts.
