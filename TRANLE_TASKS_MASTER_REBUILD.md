# TRANLE TASKS — MASTER AI REBUILD SPECIFICATION

> Mục đích: đặc tả để Claude Code / Antigravity / Cursor / AI coding agents đọc trước khi phân tích và xây dựng lại TranLe Tasks.
>
> Repository: https://github.com/Manhphan07092002/tranle_tasks.git
>
> Website doanh nghiệp: https://tranlecorp.com/
>
> Mục tiêu: nâng cấp TranLe Tasks từ hệ thống task management tổng quát thành nền tảng quản lý công việc, phòng ban, dự án và workflow phù hợp với Công ty Trần Lê.

---

## 1. NGUYÊN TẮC ĐỌC FILE

AI MUST đọc file này trước khi sửa code.

AI MUST:
- Audit repository hiện tại trước khi chỉnh sửa.
- Tận dụng module đang có.
- Không rewrite toàn bộ nếu không cần.
- Không phá các chức năng đang hoạt động.
- Ưu tiên migration an toàn.
- Dùng ID làm khóa quan hệ thay vì tên hiển thị.
- Enforce permission ở backend, không chỉ frontend.
- Kiểm tra typecheck, test và build sau thay đổi quan trọng.

Không tự suy đoán dữ liệu doanh nghiệp chưa được xác minh.

---

## 2. PHÂN TÍCH REPOSITORY HIỆN TẠI

Repo đã có nền tảng lớn, gồm các khu vực:

- Dashboard
- Tasks
- Kanban
- List
- Calendar
- Mail
- Notes
- Team
- Meetings
- Reports
- Contracts
- Revenue
- Products / Inventory
- Projects
- Project Reports
- Documents
- Admin
- Settings
- Notifications
- AI Assistant

Backend/domain hiện có các nhóm:

- departments
- roles
- users
- tasks
- projects
- contracts
- products
- reports
- revenue
- meetings
- documents
- notifications
- activity

Kết luận:
**Không xây lại từ số 0. Refactor theo kiến trúc Organization + Department + Team + Position + User + Role/Permission + Project + Task + Workflow.**

---

## 3. VẤN ĐỀ KIẾN TRÚC HIỆN TẠI

Mô hình cũ đang phụ thuộc nhiều vào chuỗi tên phòng ban:

```text
user.department = "Kinh doanh"
task.department = "Kinh doanh"
project.department = "Kỹ thuật"
```

Đây là cách không ổn định.

Không nên dùng tên hiển thị làm relational key.

Mô hình mới:

```text
User.departmentId
User.teamId
User.positionId
User.managerId

Task.departmentId
Task.teamId
Task.projectId

Project.primaryDepartmentId
```

Nếu cần tương thích, field string cũ có thể giữ tạm trong migration nhưng không được là nguồn quan hệ chính.

---

# 4. CƠ CẤU TỔ CHỨC ĐỀ XUẤT

Đây là cơ cấu chức năng đề xuất cho phần mềm dựa trên phạm vi hoạt động của Tran Le Electricity; không coi là sơ đồ pháp lý chính thức nếu doanh nghiệp chưa công bố.

```text
CÔNG TY
│
├── BAN GIÁM ĐỐC
│
├── PHÒNG KINH DOANH
│   ├── B2B
│   ├── Distribution
│   └── Residential
│
├── PHÒNG KỸ THUẬT
│   ├── Engineering
│   ├── Electrical Design
│   ├── Solar Design
│   └── Technical Support
│
├── PHÒNG DỰ ÁN / EPC
│   ├── Project Management
│   ├── Construction
│   ├── QA/QC
│   └── HSE
│
├── PHÒNG O&M / BẢO HÀNH
│
├── PHÒNG MUA HÀNG
│
├── PHÒNG KHO & LOGISTICS
│
├── PHÒNG MARKETING
│
├── PHÒNG CHĂM SÓC KHÁCH HÀNG
│
├── PHÒNG TÀI CHÍNH – KẾ TOÁN
│
├── PHÒNG HÀNH CHÍNH – NHÂN SỰ
│
├── PHÒNG IT
│
└── PHÁP CHẾ / HỢP ĐỒNG
```

---

# 5. ENTITY HIERARCHY

Phân biệt rõ:

```text
Company
  ↓
Department
  ↓
Team
  ↓
Position
  ↓
User
```

Song song:

```text
Role
  ↓
Permissions
  ↓
Scope
```

User có:

```text
Department
Team
Position
Manager
Role
```

---

# 6. DATABASE — DEPARTMENTS

Đề xuất:

```sql
departments
------------
id
code
name
description
color
icon
managerId
parentId
sortOrder
isActive
createdAt
updatedAt
```

Rules:
- `id` stable.
- `code` unique.
- `name` chỉ là display label.
- `managerId` là trưởng phòng.
- `parentId` cho phép hierarchy.
- `isActive` để archive thay vì xóa lịch sử.

Seed:

```json
[
  {"code":"EXEC","name":"Ban Giám đốc"},
  {"code":"SALES","name":"Kinh doanh"},
  {"code":"ENG","name":"Kỹ thuật"},
  {"code":"EPC","name":"Dự án / EPC"},
  {"code":"OM","name":"O&M / Bảo hành"},
  {"code":"PROC","name":"Mua hàng"},
  {"code":"WH","name":"Kho & Logistics"},
  {"code":"MKT","name":"Marketing"},
  {"code":"CS","name":"Chăm sóc khách hàng"},
  {"code":"FIN","name":"Tài chính – Kế toán"},
  {"code":"HR","name":"Hành chính – Nhân sự"},
  {"code":"IT","name":"IT"},
  {"code":"LEGAL","name":"Pháp chế / Hợp đồng"}
]
```

---

# 7. DATABASE — TEAMS

```sql
teams
------------
id
departmentId
code
name
description
managerId
color
isActive
createdAt
updatedAt
```

Ví dụ:
- Kinh doanh → B2B / Distribution / Residential.
- Kỹ thuật → Engineering / Electrical / Solar / Technical Support.
- EPC → PM / Construction / QAQC / HSE.

---

# 8. DATABASE — POSITIONS

```sql
positions
------------
id
departmentId
teamId
code
name
description
level
isManager
isActive
```

Ví dụ:
- Sales Executive
- Sales Team Leader
- Sales Manager
- Electrical Engineer
- Technical Lead
- Engineering Manager
- Project Manager
- Site Manager
- Warehouse Staff
- Warehouse Manager

---

# 9. DATABASE — USERS

Thay hoặc migrate khỏi:

```text
department: string
```

sang:

```text
departmentId
teamId
positionId
managerId
roleId
status
employmentStatus
```

Legacy string có thể giữ tạm cho migration.

---

# 10. ROLE / PERMISSION / SCOPE

Permission phải hỗ trợ:

```text
Role
+
Department Scope
+
Team Scope
+
Project Scope
```

### Employee
- Xem việc của mình.
- Cập nhật task được giao.
- Comment.
- Upload file.

### Team Leader
- Xem task team.
- Assign task.
- Review output.
- Xem workload team.

### Department Manager
- Xem và phân công việc trong phòng.
- Xem project của phòng.
- Xem báo cáo phòng.
- Approve workflow của phòng.

### Executive
- Xem toàn công ty.
- Xem tất cả phòng.
- Xem project.
- Xem KPI.
- Approve các hoạt động quan trọng.

Backend MUST enforce scope.

---

# 11. DEPARTMENT CONTEXT

Khi user login:

```text
User
 ↓
Department
 ↓
Team
 ↓
Role
 ↓
Permissions
 ↓
Dashboard
```

Dashboard thay đổi theo context.

Ví dụ:

```text
Nguyễn Văn A
Kỹ thuật
Engineering
Electrical Engineer
```

→ hiển thị Technical Dashboard.

---

# 12. PHÒNG KINH DOANH

## Mục tiêu

Lead → Customer → Proposal → Contract → Project Handoff.

Workflow:

```text
Lead
 ↓
Contacted
 ↓
Qualified
 ↓
Survey Required
 ↓
Technical Request
 ↓
Proposal
 ↓
Negotiation
 ↓
Won / Lost
 ↓
Project Handoff
```

Chức năng:
- Leads
- Customers
- Opportunities
- Quotations
- Contracts
- Follow-up
- Sales Calendar
- Revenue
- Sales Tasks
- Reports

Dashboard:
- New Leads
- Qualified Leads
- Open Opportunities
- Quotations
- Negotiations
- Won Deals
- Pipeline Value
- Revenue
- Overdue Tasks

Sales handoff bắt buộc:
- Customer
- Site
- Electricity usage/data
- Images/documents
- Desired solution
- Approximate capacity
- Deadline
- Technical requirements

---

# 13. PHÒNG KỸ THUẬT

Workflow:

```text
Technical Request
 ↓
Analysis
 ↓
Site Data Review
 ↓
Design
 ↓
Calculation
 ↓
BOM
 ↓
Technical Review
 ↓
Approved
 ↓
EPC Handover
```

Chức năng:
- Engineering Tasks
- Technical Requests
- Solar Design
- Electrical Design
- Hybrid/ESS
- BOM
- Drawings
- Datasheets
- Technical Review
- Approval

Technical Task nên hỗ trợ:
- customerId
- projectId
- site
- systemType
- capacity
- equipment
- drawing
- bom
- reviewerId
- deadline
- approvalStatus

---

# 14. PHÒNG DỰ ÁN / EPC

Workflow:

```text
Contract Signed
 ↓
Project Created
 ↓
Kickoff
 ↓
Engineering
 ↓
Procurement
 ↓
Delivery
 ↓
Construction
 ↓
Testing
 ↓
Commissioning
 ↓
Acceptance
 ↓
Handover
 ↓
O&M
```

Project structure:

```text
Project
├── Overview
├── Milestones
├── Tasks
├── Engineering
├── Procurement
├── Warehouse
├── Construction
├── QA/QC
├── HSE
├── Commissioning
├── Documents
├── Budget
├── Reports
└── Handover
```

Milestones:

```text
M1 Contract Signed
M2 Site Survey
M3 Engineering
M4 Procurement
M5 Delivery
M6 Installation
M7 Testing
M8 Commissioning
M9 Acceptance
M10 Handover
M11 O&M
```

---

# 15. O&M / BẢO HÀNH

Workflow:

```text
Customer Issue
 ↓
Ticket
 ↓
Triage
 ↓
Remote Support
 ↓
On-site
 ↓
Repair
 ↓
Verification
 ↓
Close
```

Modules:
- Service Tickets
- Maintenance
- Warranty
- Warranty Claims
- Site Visits
- Inverter Issues
- Battery Issues
- Monitoring
- O&M Reports

Warranty workflow:

```text
Claim
 ↓
Check Serial
 ↓
Check Warranty
 ↓
Evidence
 ↓
Supplier / RMA
 ↓
Repair or Replacement
 ↓
Customer Verification
 ↓
Close
```

---

# 16. MUA HÀNG / PROCUREMENT

Workflow:

```text
Purchase Request
 ↓
Approval
 ↓
RFQ
 ↓
Supplier Comparison
 ↓
Purchase Order
 ↓
Supplier Confirmation
 ↓
Delivery Tracking
 ↓
Warehouse
```

Modules:
- Purchase Requests
- Suppliers
- RFQ
- Comparison
- Purchase Orders
- Delivery Tracking
- Supplier Documents

Fields:
```text
supplierId
projectId
productId
quantity
unitPrice
currency
deliveryDate
paymentTerms
warrantyTerms
```

---

# 17. KHO & LOGISTICS

Workflow:

```text
Purchase Order
 ↓
Inbound
 ↓
QC
 ↓
Stock
 ↓
Reservation
 ↓
Outbound
 ↓
Delivery
```

Modules:
- Products
- Inventory
- SKU
- Serial Numbers
- Inbound
- Outbound
- Transfer
- Delivery
- Stock Reports

Inventory:
```text
Product
 ├── SKU
 ├── Serial
 ├── Warehouse
 ├── Bin
 ├── Quantity
 ├── Reserved
 └── Available
```

Hỗ trợ nhiều kho:
- North
- Central
- South

Không hard-code location name.

---

# 18. MARKETING

Workflow:

```text
Idea
 ↓
Brief
 ↓
Production
 ↓
Design
 ↓
Review
 ↓
Approval
 ↓
Publish
 ↓
Performance
```

Modules:
- Content
- Website
- SEO
- Facebook
- Social
- Campaigns
- Media
- Leads
- Reports

Content types:
- Product
- Solution
- Project
- Company
- News
- Partner
- Event

---

# 19. CSKH

Workflow:

```text
Customer Request
 ↓
Ticket
 ↓
Categorize
 ↓
Assign
 ↓
Resolve
 ↓
Customer Confirmation
 ↓
Close
```

Ticket types:
- Product Question
- Quotation
- Delivery
- Warranty
- Technical
- Complaint
- Maintenance

CSKH có thể escalate sang:
- Sales
- Engineering
- O&M
- Warehouse
- Accounting

---

# 20. TÀI CHÍNH – KẾ TOÁN

Modules:
- Contracts
- Receivables
- Payables
- Revenue
- Project Cost
- Payments
- Cash Flow
- Reports

Workflow:

```text
Request
 ↓
Document Check
 ↓
Approval
 ↓
Payment
 ↓
Accounting
 ↓
Reconciliation
```

Project financial metrics:
```text
Revenue
Cost
Gross Profit
Margin
Outstanding
Cash Flow
```

---

# 21. HCNS

Modules:
- Employees
- Organization
- Recruitment
- Onboarding
- Leave
- Attendance
- Payroll
- Internal Documents

Onboarding:

```text
Recruitment
 ↓
Offer
 ↓
Create Employee
 ↓
Create Account
 ↓
Department
 ↓
Team
 ↓
Position
 ↓
Role
 ↓
Device
 ↓
Training
 ↓
Active
```

---

# 22. IT

Modules:
- IT Helpdesk
- Accounts
- Devices
- Access
- Network
- Security
- Backup
- Monitoring

Priority:
```text
P1 Critical
P2 High
P3 Medium
P4 Low
```

---

# 23. PHÁP CHẾ / HỢP ĐỒNG

Modules:
- Contract Review
- Contract Approval
- Supplier Agreements
- Customer Agreements
- EPC Contracts
- Warranty Terms
- NDA
- Legal Documents

Workflow:

```text
Draft
 ↓
Review
 ↓
Legal Review
 ↓
Approval
 ↓
Signature
 ↓
Active
 ↓
Expired / Terminated
```

---

# 24. TASK MODEL

Đề xuất:

```sql
tasks
-----
id
title
description
departmentId
teamId
createdBy
assigneeId
projectId
milestoneId
customerId
contractId
taskType
status
priority
startDate
dueDate
estimatedHours
actualHours
parentTaskId
requiresApproval
approvalStatus
approvedBy
createdAt
updatedAt
completedAt
```

Giữ các khả năng hiện có:
- subtasks
- comments
- tags
- assignees
- attachments

---

# 25. TASK STATUS

```text
BACKLOG
TODO
IN PROGRESS
BLOCKED
WAITING
REVIEW
APPROVED
DONE
CANCELLED
```

Rules:
- BACKLOG: chưa lập kế hoạch.
- TODO: sẵn sàng.
- IN PROGRESS: đang làm.
- BLOCKED: bị chặn.
- WAITING: chờ người/đơn vị khác.
- REVIEW: chờ kiểm tra.
- APPROVED: đã duyệt.
- DONE: hoàn thành.
- CANCELLED: hủy.

---

# 26. PRIORITY

```text
URGENT
HIGH
MEDIUM
LOW
```

---

# 27. PROJECT LÀ CROSS-FUNCTIONAL

Một project có thể có:
- Sales
- Engineering
- EPC
- Procurement
- Warehouse
- Finance
- O&M

Không ép project chỉ thuộc một phòng.

Có thể dùng:

```sql
projects
--------
primaryDepartmentId
```

và:

```sql
project_departments
-------------------
projectId
departmentId
role
```

và:

```sql
project_members
---------------
projectId
userId
role
```

Ví dụ:

```text
Cocotex 4.5 MWp

Sales        → Commercial Owner
Engineering  → Technical Owner
EPC          → Execution Owner
Procurement  → Purchasing
Warehouse    → Materials
Finance      → Billing
O&M          → After-sales
```

---

# 28. DASHBOARD THEO CẤP

## Employee

```text
My Tasks
Today
Upcoming
Overdue
Blocked
Calendar
Notifications
```

## Team Leader

```text
Team Tasks
Progress
Overdue
Blocked
Workload
Calendar
```

## Department Manager

```text
Department KPI
Tasks
Projects
Staff Performance
Overdue
Blocked
Reports
```

## Executive

```text
Company KPI
Revenue
Projects
Departments
Workload
Overdue
Critical Issues
```

---

# 29. SIDEBAR ĐỀ XUẤT

```text
Overview

Work
├── My Tasks
├── Team Tasks
├── Department
├── Kanban
├── List
└── Calendar

Organization
├── Organization Chart
├── Departments
├── Teams
├── Positions
└── Employees

Projects
├── All Projects
├── My Projects
├── Milestones
└── Project Reports

Sales
├── Customers
├── Leads
├── Opportunities
├── Quotations
└── Contracts

Operations
├── Procurement
├── Warehouse
├── Logistics
└── O&M

Reports
├── Tasks
├── Departments
├── Projects
├── Revenue
└── KPIs

Communication
├── Mail
├── Meetings
├── Notes
└── Notifications

Documents
AI Assistant

Administration
├── Users
├── Departments
├── Teams
├── Positions
├── Roles
├── Permissions
└── System Settings
```

Hiển thị module phải theo permission.

---

# 30. ORGANIZATION PAGE

Hiển thị:

```text
Company
 ↓
Departments
 ↓
Teams
 ↓
Positions
 ↓
Employees
```

Functions:
- Tree view.
- Department card.
- Manager.
- Member count.
- Active task count.
- Project count.
- KPI.
- Edit.
- Add team.
- Add employee.
- Assign manager.

---

# 31. DEPARTMENT DETAIL

Tabs:

```text
Overview
Members
Tasks
Projects
Calendar
Reports
Documents
```

Overview:
```text
Open Tasks
Overdue
Blocked
Completed
Active Projects
Team Workload
```

---

# 32. CROSS-DEPARTMENT HANDOFF

## Sales → Engineering
Bắt buộc:
- Customer
- Site
- Load data
- Electricity data
- Images
- Requirements
- Capacity
- Deadline

## Engineering → EPC
Bắt buộc:
- Approved drawings
- BOM
- Equipment list
- Technical specs
- Installation notes

## Procurement → Warehouse
Bắt buộc:
- PO
- SKU
- Quantity
- ETA
- Supplier
- Delivery docs

## Warehouse → Project
Bắt buộc:
- Delivery order
- SKU
- Quantity
- Serial
- Site
- Delivery date

## EPC → O&M
Bắt buộc:
- As-built
- Serial list
- Commissioning report
- Warranty
- O&M instructions

---

# 33. AUTOMATION

## Won Deal

Khi opportunity = WON:

```text
Create Project
Create Project Manager Task
Create Engineering Task
Create Procurement Task
Create Finance Task
```

## Overdue

Nếu:

```text
dueDate < today
AND status != DONE
AND status != CANCELLED
```

→ mark overdue  
→ notify assignee  
→ notify manager.

## Blocked

Khi BLOCKED, bắt buộc:

```text
Blocked Reason
Blocked By
Expected Resolution
```

## Engineering Approved

→ tạo EPC handoff task.

## Project Acceptance

→ tạo:
- O&M onboarding
- Warranty record
- Handover checklist
- Customer documentation

---

# 34. NOTIFICATIONS

Thông báo khi:
- Assigned.
- Mentioned.
- Due soon.
- Overdue.
- Blocked.
- Reviewed.
- Approved/Rejected.
- Milestone changed.
- Approval requested.
- Assignment changed.

---

# 35. AUDIT LOG

Ghi:
```text
Created
Updated
Assigned
Status Changed
Priority Changed
Department Changed
Team Changed
Commented
Attachment Added
Approved
Rejected
Completed
Deleted
```

Audit record:

```text
actor
action
entity
entityId
timestamp
oldValue
newValue
```

---

# 36. REPORTING

Filter:
```text
Date
Department
Team
User
Project
Status
Priority
Task Type
Customer
```

Metrics:
```text
Total Tasks
Completed
Completion Rate
Overdue
Blocked
Average Completion Time
Workload
Project Progress
Department Performance
```

Project health:
```text
ON TRACK
AT RISK
DELAYED
BLOCKED
COMPLETED
```

---

# 37. API TARGET

Departments:

```text
GET    /api/departments
POST   /api/departments
GET    /api/departments/:id
PUT    /api/departments/:id
DELETE /api/departments/:id

GET    /api/departments/:id/members
GET    /api/departments/:id/tasks
GET    /api/departments/:id/projects
GET    /api/departments/:id/reports
```

Teams:

```text
GET    /api/teams
POST   /api/teams
PUT    /api/teams/:id
DELETE /api/teams/:id
```

Positions:

```text
GET    /api/positions
POST   /api/positions
PUT    /api/positions/:id
DELETE /api/positions/:id
```

Organization:

```text
GET /api/organization/tree
GET /api/organization/chart
```

Task API MUST accept:
```text
departmentId
teamId
projectId
milestoneId
approval
```

---

# 38. DATABASE INDEXES

Ưu tiên index:
```text
departmentId
teamId
assigneeId
projectId
status
priority
dueDate
createdAt
```

Use foreign keys whenever practical.

---

# 39. MIGRATION STRATEGY

Không xóa dữ liệu cũ.

### Phase 1
Create:
- departments
- teams
- positions

### Phase 2
Seed master data.

### Phase 3
Map old department names:

```text
"Kinh doanh" → dept-sales
"Kỹ thuật" → dept-engineering
```

### Phase 4
Update users:
```text
departmentId
teamId
positionId
managerId
```

### Phase 5
Update tasks.

### Phase 6
Update projects/reports.

### Phase 7
Refactor API/frontend khỏi dependency vào department string.

### Phase 8
Xóa legacy field chỉ sau khi migration + regression test pass.

---

# 40. FILES / AREAS CẦN AUDIT TRONG REPO

AI MUST inspect ít nhất:

```text
package.json
frontend structure
backend structure
db schema
routes
services
types
components
pages
auth
permissions
```

Các khu vực quan trọng đã xác định:

```text
backend/
├── db_mysql.ts
├── routes/
│   ├── departments.ts
│   ├── users.ts
│   ├── tasks.ts
│   ├── projects.ts
│   ├── reports.ts
│   ├── revenue.ts
│   └── roles.ts
```

Frontend:

```text
frontend/
├── types.ts
├── constants.ts
├── App.tsx
├── services/
│   ├── departmentService.ts
│   ├── userService.ts
│   └── taskService.ts
├── pages/
│   ├── Admin/
│   ├── Team/
│   ├── Tasks/
│   ├── Dashboard/
│   ├── Projects/
│   └── Reports/
└── components/
    ├── UserModal.tsx
    ├── TaskModal.tsx
    └── layout/
```

Các path trên là các khu vực cần audit theo cấu trúc repo hiện tại; agent phải xác nhận lại bằng cách đọc repository trước khi sửa.

---

# 41. KHÔNG ĐƯỢC PHÁ VỠ CHỨC NĂNG HIỆN CÓ

Trước/sau refactor phải kiểm tra:

```text
Tasks
Kanban
List
Calendar
Projects
Contracts
Revenue
Products
Reports
Meetings
Documents
Notifications
AI Assistant
Admin
Settings
```

Không xóa module nếu chưa có lý do và migration.

---

# 42. TEST MATRIX

## Organization
- Create department.
- Edit.
- Deactivate.
- Create team.
- Create position.
- Assign manager.
- Assign user.

## Permission
- Employee restricted.
- Team leader team scope.
- Department manager department scope.
- Executive company scope.

## Tasks
- Create.
- Assign.
- Cross-team.
- Cross-department.
- Change department.
- Change team.
- Block.
- Review.
- Approve.
- Complete.

## Projects
- Create.
- Add departments.
- Add project members.
- Milestone.
- Task.
- Completion.

## Reports
- Department filter.
- Team filter.
- Project filter.
- User filter.
- Date filter.

---

# 43. IMPLEMENTATION ORDER

## Phase 1 — Repository audit
- Inspect architecture.
- Inspect DB.
- Inspect existing permissions.
- Find department string usage.
- Find migration risk.

## Phase 2 — Organization
- Departments.
- Teams.
- Positions.
- Managers.
- User relations.
- Organization tree.

## Phase 3 — Permissions
- Role.
- Permission.
- Department scope.
- Team scope.
- Project scope.

## Phase 4 — Tasks
- departmentId.
- teamId.
- projectId.
- milestoneId.
- approval.

## Phase 5 — Dashboard
- Employee.
- Team.
- Department.
- Executive.

## Phase 6 — Business workflows
- Sales.
- Engineering.
- EPC.
- Procurement.
- Warehouse.
- O&M.

## Phase 7 — Reporting

## Phase 8 — Migration cleanup

---

# 44. DEFINITION OF DONE

```text
[ ] Department dùng ID
[ ] Team tồn tại
[ ] Position tồn tại
[ ] User liên kết department/team/position
[ ] Manager tồn tại
[ ] Role + permission có scope
[ ] Task có department/team/project
[ ] Project hỗ trợ nhiều department tham gia
[ ] Department dashboard
[ ] Team dashboard
[ ] Executive dashboard
[ ] Sales workflow
[ ] Engineering workflow
[ ] EPC workflow
[ ] Procurement workflow
[ ] Warehouse workflow
[ ] O&M workflow
[ ] Cross-department handoff
[ ] Notification
[ ] Audit log
[ ] Reporting filters
[ ] Existing features pass regression
[ ] Migration không mất dữ liệu
[ ] Backend permission enforcement
[ ] Responsive UI
```

---

# 45. PRODUCT VISION

TranLe Tasks phải trở thành:

```text
Company Workflow Management Platform
```

thay vì chỉ:

```text
Todo / Task App
```

Core platform:

```text
Organization Management
        +
Task Management
        +
Project Management
        +
Department Workflow
        +
Permission Management
        +
Operations
        +
Reporting
        +
Approval
        +
Cross-team Collaboration
```

Business flow:

```text
CUSTOMER
   ↓
SALES
   ↓
ENGINEERING
   ↓
EPC / PROJECT
   ↓
PROCUREMENT
   ↓
WAREHOUSE
   ↓
CONSTRUCTION
   ↓
COMMISSIONING
   ↓
HANDOVER
   ↓
O&M / WARRANTY
```

Supporting functions:

```text
Finance
HR
IT
Marketing
CSKH
Legal
```

---

# 46. MASTER PROMPT FOR AI CODING AGENT

```text
You are the lead software architect and senior full-stack engineer for TranLe Tasks.

Read these files first:
1. TRANLE_TASKS_MASTER_REBUILD.md
2. TRANLE_DESIGN_SYSTEM.md
3. The complete current repository

Goal:
Upgrade the existing TranLe Tasks application into a department-aware company workflow management platform.

Do NOT rewrite the entire application unless necessary.
Reuse current working modules.

Before coding:
1. Audit the repo.
2. Inspect current database schema.
3. Inspect auth and permissions.
4. Inspect departments/users/tasks/projects.
5. Find all code using department strings.
6. Identify migration risks.
7. Produce a concise implementation plan.

Then implement in this order:
1. Organization
2. Departments
3. Teams
4. Positions
5. Users
6. Roles and scoped permissions
7. Department-aware tasks
8. Cross-functional projects
9. Department dashboards
10. Sales workflow
11. Engineering workflow
12. EPC workflow
13. Procurement workflow
14. Warehouse workflow
15. O&M workflow
16. Reporting
17. Migration cleanup

Rules:
- Use stable IDs for relations.
- Do not use department names as database keys.
- Enforce authorization in backend.
- Preserve existing features.
- Use migrations; never destroy production data.
- Do not fabricate business data.
- Reuse current components.
- Keep frontend responsive and accessible.
- Keep API contracts documented.
- Add tests for critical workflows.

After each phase:
- run tests
- run typecheck
- run build
- summarize changed files
- summarize database changes
- summarize migration state
- list remaining risks

Do not proceed with destructive changes without first understanding the existing data model.
```

---

# 47. DESIGN SYSTEM REFERENCE

For UI and styling, also read:

```text
TRANLE_DESIGN_SYSTEM.md
```

Use design tokens instead of scattered hard-coded values.

Brand direction:
- Modern.
- Clean.
- Technical.
- Sustainable.
- Trustworthy.
- Premium.

Primary design token:
```text
Energy Green
```

Secondary:
```text
Solar Gold
```

The design system is separate so UI refactoring and business architecture remain maintainable.

---

# END
