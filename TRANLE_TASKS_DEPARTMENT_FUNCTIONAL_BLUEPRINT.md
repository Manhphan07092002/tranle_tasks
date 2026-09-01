# TRANLE TASKS — DEPARTMENT FUNCTIONAL BLUEPRINT

## Mục tiêu

Tài liệu này bổ sung đặc tả nghiệp vụ chi tiết cho từng phòng ban của TranLe Tasks.

AI phải hiểu rằng mỗi phòng ban không chỉ có `Tasks`, mà phải có:
- Dashboard riêng
- Master Data
- Work Queue
- Nghiệp vụ riêng
- Workflow
- Task Templates
- Approval
- Documents
- Calendar
- Notifications
- Reports
- KPI
- Audit Log
- Cross-department Handoff
- Permission Scope

Không biến toàn bộ dữ liệu nghiệp vụ thành Task. Entity/master data/transaction phải có bảng hoặc object riêng; Task là lớp thực thi công việc.

---

# 1. KIẾN TRÚC TỔ CHỨC

```text
CÔNG TY
│
├── BAN GIÁM ĐỐC
├── KINH DOANH
├── KỸ THUẬT / ENGINEERING
├── DỰ ÁN / EPC
├── O&M / BẢO HÀNH
├── MUA HÀNG
├── KHO & LOGISTICS
├── MARKETING
├── CSKH
├── TÀI CHÍNH – KẾ TOÁN
├── HÀNH CHÍNH – NHÂN SỰ
├── IT
└── PHÁP CHẾ / HỢP ĐỒNG
```

Mô hình dữ liệu:

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
  ↓
Role / Permission / Scope
```

---

# 2. BAN GIÁM ĐỐC

## Phạm vi quản lý
Toàn công ty.

## Chức năng

### Dashboard
- KPI công ty
- Doanh thu
- Lợi nhuận
- Dòng tiền
- Danh sách dự án
- Dự án trễ
- Task quá hạn
- Task bị Blocked
- Pending Approvals
- Rủi ro
- Vấn đề nghiêm trọng
- Hiệu suất phòng ban

### Nghiệp vụ
- Phê duyệt báo giá lớn
- Phê duyệt hợp đồng
- Phê duyệt dự án
- Phê duyệt PO/chi phí vượt hạn mức
- Phê duyệt thanh toán
- Phân bổ ngân sách
- Giao mục tiêu phòng ban
- Theo dõi tiến độ dự án
- Xử lý escalation
- Ra quyết định điều hành
- Theo dõi action item sau họp

### Entity
```text
Strategic Initiative
Executive Decision
Approval Request
Risk
Issue
Company KPI
Department KPI
Executive Meeting
```

### KPI
```text
Revenue
Gross Profit
Active Projects
Delayed Projects
Overdue Tasks
Blocked Tasks
Cash Flow
Department Performance
```

---

# 3. PHÒNG KINH DOANH / SALES

## Mục tiêu
Quản lý từ Lead → Khách hàng → Báo giá → Hợp đồng → Bàn giao Project.

## Module
- Sales Dashboard
- Leads
- Customers
- Contacts
- Opportunities
- Pipeline
- Activities
- Site Survey Requests
- Technical Requests
- Quotations
- Price Lists
- Discount Requests
- Contracts
- Follow-up
- Sales Calendar
- Sales Documents
- Competitor
- Target/Commission
- Sales Reports

## Customer
```text
Company
Contact
Phone
Email
Address
Tax Information
Customer Type
Industry
Source
Owner
Status
Notes
Attachments
```

## Lead workflow

```text
NEW
 ↓
CONTACTED
 ↓
QUALIFIED
 ↓
SURVEY
 ↓
TECHNICAL REQUEST
 ↓
PROPOSAL
 ↓
NEGOTIATION
 ↓
WON / LOST
```

## Quote
```text
Customer
Items
Quantity
Unit Price
Discount
VAT
Margin
Valid Until
Approval
Attachments
```

## Task templates
- Gọi khách hàng
- Xác nhận nhu cầu
- Xin hóa đơn điện
- Đặt lịch khảo sát
- Tạo technical request
- Chuẩn bị proposal
- Lập báo giá
- Xin duyệt chiết khấu
- Gửi báo giá
- Follow-up
- Đàm phán
- Ký hợp đồng
- Bàn giao Project

## KPI
```text
Leads
Qualified Leads
Opportunity Value
Quotation Value
Win Rate
Revenue
Average Deal Size
Sales Cycle
Overdue Follow-ups
```

## Sales → Engineering
Bắt buộc có:
```text
Customer
Site
Electricity Data
Photos
Requirements
Capacity
Deadline
```

---

# 4. PHÒNG KỸ THUẬT / ENGINEERING

## Mục tiêu
Quản lý toàn bộ công việc kỹ thuật trước, trong và hỗ trợ sau dự án.

## Module
- Engineering Dashboard
- Technical Request Queue
- Site Survey
- Load Analysis
- Solar Design
- Electrical Design
- Hybrid Design
- ESS/Battery Design
- Off-grid Design
- Solar Pump Design
- Energy Yield Calculation
- BOM
- BOQ
- Drawings
- SLD
- Datasheet Library
- Equipment Compatibility
- Technical Review
- Design Approval
- Change Request
- Technical Issue
- Document Control

## Design Package
```text
Layout
SLD
Electrical Calculation
String Design
Cable Schedule
Protection
Equipment List
BOM
BOQ
Yield Estimate
```

## Workflow
```text
Technical Request
 ↓
Data Review
 ↓
Survey
 ↓
Analysis
 ↓
Design
 ↓
Calculation
 ↓
BOM
 ↓
Technical Review
 ↓
Approval
 ↓
EPC Handover
```

## Task templates
- Phân tích hóa đơn
- Phân tích tải
- Khảo sát mái
- Tính công suất PV
- Thiết kế layout
- Thiết kế string
- Chọn inverter
- Tính battery
- Thiết kế SLD
- Tạo BOM
- Kiểm tra tương thích
- Technical Review
- Điều chỉnh bản vẽ
- Bàn giao hồ sơ

## KPI
```text
Open Requests
Completed Designs
On-time Rate
Rework Rate
Review Rejection
Average Design Time
Pending Approval
```

---

# 5. PHÒNG DỰ ÁN / EPC

## Mục tiêu
Triển khai dự án từ hợp đồng đến nghiệm thu và bàn giao.

## Module
- Project Portfolio
- Project Dashboard
- Project Planning
- Milestones
- Gantt
- Project Tasks
- Resource Planning
- Site Management
- Daily Site Report
- Construction Planning
- Progress Tracking
- QA/QC
- HSE
- Issue Management
- Risk Management
- Change Request
- Variation
- Cost Tracking
- Materials Tracking
- Testing
- Commissioning
- Acceptance
- Handover

## Project Lifecycle
```text
Contract
 ↓
Kickoff
 ↓
Planning
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

## Site
```text
Site
Team
Attendance
Daily Report
Weather
Safety
Progress
Photos
Issues
Materials
```

## QA/QC
- Inspection Request
- Material Inspection
- Installation Checklist
- NCR
- Corrective Action
- Punch List
- Final Inspection

## HSE
- Safety Plan
- Toolbox Meeting
- PPE
- Risk Assessment
- Incident
- Near Miss
- Safety Inspection

## KPI
```text
Schedule Progress
Planned vs Actual
Budget vs Actual
NCR
Safety Incidents
Open Issues
Punch List
Milestone On-time Rate
```

---

# 6. PHÒNG O&M / BẢO HÀNH

## Mục tiêu
Quản lý vận hành, bảo trì, sự cố, tài sản lắp đặt và bảo hành.

## Module
- O&M Dashboard
- Customer Sites
- Installed Assets
- Service Tickets
- Maintenance Schedule
- Preventive Maintenance
- Corrective Maintenance
- Warranty
- Warranty Claims
- RMA
- Site Visits
- Monitoring
- Alarm/Alert
- Service Reports
- Spare Parts
- Technician Dispatch
- SLA

## Asset
```text
Asset
Serial
Model
Brand
Project
Site
Installation Date
Warranty Start
Warranty End
Status
```

## Workflow
```text
Ticket
 ↓
Triage
 ↓
Remote Support
 ↓
Dispatch
 ↓
Diagnose
 ↓
Repair
 ↓
Test
 ↓
Customer Confirmation
 ↓
Close
```

## KPI
```text
Open Tickets
SLA Compliance
MTTR
Repeat Failure
Maintenance Completion
Warranty Claims
Site Availability
```

---

# 7. PHÒNG MUA HÀNG / PROCUREMENT

## Mục tiêu
Quản lý mua thiết bị, vật tư, nhà cung cấp và đơn hàng.

## Module
- Procurement Dashboard
- Suppliers
- Purchase Requests
- RFQ
- Supplier Quotations
- Quotation Comparison
- Negotiation
- Approval
- Purchase Orders
- Delivery Tracking
- Supplier Contracts
- Supplier Performance
- Procurement Documents

## Workflow
```text
Purchase Request
 ↓
Approval
 ↓
RFQ
 ↓
Supplier Quotations
 ↓
Comparison
 ↓
Negotiation
 ↓
Approval
 ↓
PO
 ↓
Supplier Confirmation
 ↓
Delivery
 ↓
Warehouse
```

## Supplier
```text
Contact
Product Categories
Price
Lead Time
Payment Terms
Warranty
Rating
Documents
```

## KPI
```text
Purchase Value
Average Lead Time
Supplier On-time Rate
Cost Saving
Open POs
Late Deliveries
```

---

# 8. PHÒNG KHO & LOGISTICS

## Mục tiêu
Quản lý hàng hóa, serial, nhập xuất tồn, điều chuyển và giao hàng.

## Module
- Warehouse Dashboard
- Products
- SKU
- Serial Numbers
- Warehouses
- Locations/Bins
- Inbound
- Outbound
- Transfer
- Reservation
- Delivery Orders
- Returns
- Stock Count
- Inventory Adjustment
- Stock Reports

## Transaction
```text
INBOUND
OUTBOUND
TRANSFER
RESERVATION
RETURN
ADJUSTMENT
```

## Workflow
```text
PO
 ↓
Inbound
 ↓
QC
 ↓
Put Away
 ↓
Available
 ↓
Reservation
 ↓
Picking
 ↓
Packing
 ↓
Delivery
```

## KPI
```text
Stock Value
Available Stock
Reserved Stock
Low Stock
Stock Accuracy
Inventory Turnover
Late Delivery
```

---

# 9. PHÒNG MARKETING

## Mục tiêu
Quản lý thương hiệu, nội dung, website, social và tạo lead.

## Module
- Marketing Dashboard
- Campaigns
- Content Calendar
- Content
- Website
- SEO
- Facebook
- Social
- Media Library
- Landing Pages
- Events
- Lead Sources
- Ads
- Marketing Reports

## Workflow
```text
Idea
 ↓
Brief
 ↓
Draft
 ↓
Design
 ↓
Review
 ↓
Approval
 ↓
Publish
 ↓
Measure
```

## Content Types
```text
Product
Solution
Project
Company
Partner
News
Event
Recruitment
Technical
```

## KPI
```text
Traffic
Leads
Engagement
Reach
Conversion
Content Output
Campaign ROI
Cost per Lead
```

---

# 10. PHÒNG CHĂM SÓC KHÁCH HÀNG / CSKH

## Mục tiêu
Quản lý mọi yêu cầu và tương tác khách hàng.

## Module
- Customer Dashboard
- Customer Profiles
- Tickets
- Complaints
- Requests
- Follow-up
- Satisfaction
- Warranty Handoff
- Service Handoff
- Contact History
- Call/Interaction Log
- Customer Documents

## Ticket types
```text
Product
Quotation
Delivery
Technical
Warranty
Complaint
Maintenance
Invoice
Contract
Other
```

## Workflow
```text
Request
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

## Escalation
```text
CSKH → Sales
CSKH → Engineering
CSKH → O&M
CSKH → Warehouse
CSKH → Finance
CSKH → Management
```

## KPI
```text
Open Tickets
Response Time
Resolution Time
SLA Rate
CSAT
Complaints
Repeat Tickets
```

---

# 11. PHÒNG TÀI CHÍNH – KẾ TOÁN

## Mục tiêu
Quản lý doanh thu, chi phí, công nợ, thanh toán, ngân sách và hiệu quả dự án.

## Module
- Finance Dashboard
- Receivables
- Payables
- Invoices
- Payments
- Receipts
- Project Cost
- Budget
- Cash Flow
- Revenue
- Expense
- Tax Documents
- Financial Approval
- Financial Reports

## AR
```text
Invoice
Due Date
Amount
Paid
Outstanding
Aging
```

## AP
```text
Supplier
Invoice
PO
Amount
Due Date
Payment Status
```

## Project Finance
```text
Contract Value
Revenue
Material Cost
Labor Cost
Subcontract Cost
Logistics Cost
Other Cost
Gross Profit
Margin
```

## KPI
```text
Revenue
Gross Profit
Margin
AR
AP
Overdue Receivable
Cash Flow
Project Profitability
```

---

# 12. PHÒNG HÀNH CHÍNH – NHÂN SỰ / HR

## Mục tiêu
Quản lý vòng đời nhân viên và hoạt động hành chính.

## Module
- HR Dashboard
- Employee Directory
- Organization
- Departments
- Teams
- Positions
- Recruitment
- Candidate Pipeline
- Onboarding
- Offboarding
- Leave
- Attendance
- Payroll Reference
- Training
- Performance
- HR Documents
- Policies

## Employee Lifecycle
```text
Recruitment
 ↓
Interview
 ↓
Offer
 ↓
Onboarding
 ↓
Active
 ↓
Transfer
 ↓
Promotion
 ↓
Leave
 ↓
Offboarding
```

## KPI
```text
Headcount
Open Positions
New Hires
Turnover
Leave
Training
Performance Reviews
```

---

# 13. PHÒNG IT

## Mục tiêu
Quản lý công nghệ, tài khoản, thiết bị, hỗ trợ và bảo mật.

## Module
- IT Dashboard
- Helpdesk
- IT Tickets
- Users & Accounts
- Access Management
- Devices/Assets
- Software Licenses
- Network
- Server/Hosting
- Backup
- Security
- Monitoring
- Change Management
- Incident Management
- Knowledge Base

## Access Workflow
```text
Request
 ↓
Manager Approval
 ↓
IT Review
 ↓
Grant
 ↓
Verify
 ↓
Close
```

## Incident Workflow
```text
Detect
 ↓
Triage
 ↓
Assign
 ↓
Resolve
 ↓
Verify
 ↓
Postmortem
```

## KPI
```text
Tickets
First Response
Resolution Time
P1/P2 Incidents
Device Inventory
Security Issues
Backup Status
```

---

# 14. PHÒNG PHÁP CHẾ / HỢP ĐỒNG

## Mục tiêu
Quản lý vòng đời hợp đồng và hồ sơ pháp lý.

## Module
- Contract Dashboard
- Contract Register
- Contract Draft
- Review
- Legal Review
- Approval
- Signature Tracking
- Renewal
- Expiry Alerts
- Legal Documents
- NDA
- EPC Contracts
- Supplier Contracts
- Customer Contracts
- Legal Issues

## Workflow
```text
Draft
 ↓
Review
 ↓
Legal Review
 ↓
Business Approval
 ↓
Signature
 ↓
Active
 ↓
Renewal / Expiry
```

## KPI
```text
Active Contracts
Pending Review
Pending Signature
Expiring Soon
Expired
Contract Value
```

---

# 15. CHỨC NĂNG CHUNG CỦA MỌI PHÒNG

Mỗi department phải có:

```text
Dashboard
Members
Master Data
Work Queue
Tasks
Workflow
Task Templates
Approval
Documents
Calendar
Notifications
Reports
KPI
Audit Log
```

## Work Queue
```text
My Work
Team Work
Unassigned
Due Today
Overdue
Blocked
Waiting
Review
```

---

# 16. DEPARTMENT REQUEST

Công việc liên phòng ban không được chỉ giao qua chat.

Entity:

```text
DepartmentRequest
-----------------
id
requesterId
sourceDepartmentId
targetDepartmentId
title
description
priority
relatedEntityType
relatedEntityId
dueDate
status
attachments
createdAt
updatedAt
```

Ví dụ:

```text
Sales → Technical Request → Engineering
Engineering → Purchase Request → Procurement
CSKH → Service Request → O&M
Warehouse → Delivery Request → Logistics
```

---

# 17. APPROVAL CENTER

Dùng chung toàn hệ thống:

```text
Quotation Approval
Discount Approval
Purchase Approval
Payment Approval
Project Approval
Engineering Approval
Contract Approval
Leave Approval
Access Approval
```

Entity:

```text
Approval
---------
id
entityType
entityId
requestedBy
approverId
status
comment
requestedAt
approvedAt
rejectedAt
```

---

# 18. WORKLOAD MANAGEMENT

Mỗi user:

```text
Assigned Tasks
Estimated Hours
Actual Hours
Overdue
Blocked
Upcoming
Capacity
```

Manager xem:

```text
Employee
Open Tasks
Estimated Hours
Capacity
Utilization
Overdue
```

Trạng thái:

```text
OVERLOADED
AT_CAPACITY
UNDERUTILIZED
```

---

# 19. SLA MANAGEMENT

Áp dụng đặc biệt cho:
- CSKH
- O&M
- IT
- Approval

SLA:

```text
Response Time
Resolution Time
Business Hours
Escalation
```

---

# 20. TASK TYPE SYSTEM

Task type không chỉ là GENERAL.

```text
GENERAL
FOLLOW_UP
APPROVAL
REVIEW
REQUEST
MEETING
CALL
EMAIL
SURVEY
DESIGN
PROCUREMENT
DELIVERY
CONSTRUCTION
INSPECTION
TESTING
COMMISSIONING
MAINTENANCE
WARRANTY
TICKET
REPORT
DOCUMENT
TRAINING
```

Có thể giới hạn task type theo department.

---

# 21. TASK MODEL

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

Giữ các chức năng hiện có:
- Subtasks
- Comments
- Tags
- Multiple assignees
- Attachments

---

# 22. PROJECT CROSS-DEPARTMENT

Project không nên bị khóa vào một phòng ban duy nhất.

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
Sales        → Commercial Owner
Engineering  → Technical Owner
EPC          → Execution Owner
Procurement  → Purchasing
Warehouse    → Materials
Finance      → Billing
O&M          → After-sales
```

---

# 23. AUTOMATION

## Won Deal
```text
Opportunity = WON
 ↓
Create Project
Create PM Task
Create Engineering Task
Create Procurement Task
Create Finance Task
```

## Overdue
```text
dueDate < today
AND status != DONE
AND status != CANCELLED
```

→ Mark overdue  
→ Notify assignee  
→ Notify manager

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
```text
O&M onboarding
Warranty record
Handover checklist
Customer documentation
```

---

# 24. NOTIFICATION HIERARCHY

```text
Employee
 ↓
Team Leader
 ↓
Department Manager
 ↓
Executive
```

Ví dụ:
- Task quá hạn → Team Leader.
- Critical overdue → Department Manager.
- Critical project blocker → Executive.

---

# 25. REPORTING

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

Drill-down:
```text
Company
 ↓
Department
 ↓
Team
 ↓
User
 ↓
Task
```

---

# 26. SIDEBAR ĐỀ XUẤT

```text
Tổng quan

Công việc
├── Việc của tôi
├── Team của tôi
├── Phòng ban
├── Kanban
├── Danh sách
└── Lịch

Tổ chức
├── Sơ đồ tổ chức
├── Phòng ban
├── Team
├── Chức vụ
└── Nhân sự

Dự án
├── Tất cả dự án
├── Dự án của tôi
├── Milestones
└── Báo cáo dự án

Kinh doanh
├── Khách hàng
├── Leads
├── Opportunities
├── Báo giá
└── Hợp đồng

Vận hành
├── Mua hàng
├── Kho
├── Logistics
└── O&M

Báo cáo
├── Công việc
├── Phòng ban
├── Dự án
├── Doanh thu
└── KPI

Giao tiếp
├── Mail
├── Meetings
├── Notes
└── Notifications

Documents
AI Assistant

Quản trị
├── Users
├── Departments
├── Teams
├── Positions
├── Roles
├── Permissions
└── System Settings
```

---

# 27. PHÂN QUYỀN THEO ROLE

## Employee
```text
task.read.own
task.update.assigned
comment.create
attachment.create
```

## Team Leader
```text
task.read.team
task.assign.team
task.review.team
report.read.team
```

## Department Manager
```text
task.read.department
task.assign.department
project.read.department
report.read.department
approval.department
```

## Executive
```text
company.read
department.read.all
project.read.all
report.read.all
approval.company
```

## Admin
```text
system.manage
users.manage
roles.manage
permissions.manage
organization.manage
```

---

# 28. MIGRATION

Không xóa dữ liệu hiện tại.

## Phase 1
Tạo:
```text
Departments
Teams
Positions
```

## Phase 2
Seed organization.

## Phase 3
Map:
```text
"Kinh doanh" → dept-sales
"Kỹ thuật" → dept-engineering
```

## Phase 4
Update:
```text
users.departmentId
users.teamId
users.positionId
users.managerId
```

## Phase 5
Update tasks/projects/reports.

## Phase 6
Refactor code khỏi department string.

## Phase 7
Chỉ xóa legacy field sau khi regression test pass.

---

# 29. DEFINITION OF DONE CHO MỖI PHÒNG

```text
[ ] Dashboard
[ ] Members
[ ] Master Data
[ ] Work Queue
[ ] Workflow
[ ] Task Templates
[ ] Approval
[ ] Documents
[ ] Calendar
[ ] Notifications
[ ] Reports
[ ] KPI
[ ] Audit Log
[ ] Cross-department Handoff
[ ] Permission Scope
```

---

# 30. QUY TẮC CHO AI CODING AGENT

Khi xây một phòng ban, AI phải xác định:

```text
1. Quản lý đối tượng gì?
2. Công việc hằng ngày?
3. Ai tạo?
4. Ai xử lý?
5. Ai duyệt?
6. Input?
7. Output?
8. Bàn giao cho phòng nào?
9. SLA?
10. KPI?
11. Dữ liệu cần lưu?
12. Dashboard?
13. Notification?
14. Audit?
15. Permission?
```

AI không được chỉ tạo một menu Tasks chung.

---

# 31. MASTER IMPLEMENTATION PROMPT

```text
You are the lead software architect for TranLe Tasks.

Read:
1. TRANLE_TASKS_MASTER_REBUILD.md
2. TRANLE_DESIGN_SYSTEM.md
3. This department functional blueprint
4. The complete repository

Goal:
Upgrade the current application into a company-wide operational workflow platform.

Do not blindly rewrite the project.

First audit:
- Current frontend
- Current backend
- Database schema
- Authentication
- Roles/permissions
- Departments
- Users
- Tasks
- Projects
- Reports
- Existing modules

Then produce a gap analysis.

Refactor toward:

Company
→ Department
→ Team
→ Position
→ User
→ Role
→ Permission/Scope
→ Project
→ Request/Ticket
→ Task
→ Workflow
→ Approval
→ Evidence
→ Report/KPI

Each department must have:
Dashboard
Master Data
Work Queue
Workflow
Task Templates
Approval
Documents
Calendar
Notifications
Reports
KPI
Audit
Cross-department Handoff

Implement department-specific workflows:
Sales
Engineering
EPC
O&M
Procurement
Warehouse
Marketing
CSKH
Finance
HR
IT
Legal

Preserve working features.

Use IDs for relationships, never department display names.

Enforce permissions on the backend.

Use migrations and preserve current data.

Do not hard-code department/business rules across many frontend files. Centralize them in reusable domain/config layers.

For every phase:
- List changed files.
- List DB changes.
- Run tests.
- Run typecheck.
- Run build.
- Report migration status.
- Report remaining risks.

A department is NOT considered complete until it satisfies the department Definition of Done in this document.
```

# END
