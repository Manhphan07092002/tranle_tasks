# TRANLE TASKS — PHÂN TÍCH CHỨC NĂNG CHI TIẾT THEO PHÒNG BAN

> Mục đích: đặc tả cách cá nhân hóa TranLe Tasks theo từng phòng ban để mỗi phòng có dashboard, nghiệp vụ, workflow, dữ liệu, task, KPI, báo cáo và quyền riêng.
> Repository: https://github.com/Manhphan07092002/tranle_tasks.git
> Website: https://tranlecorp.com/

## 1. Nguyên tắc
Mỗi phòng ban phải có:
- Dashboard
- Work Queue
- Business Modules
- Task Types
- Workflow
- Approval
- Calendar
- Documents
- Notifications
- Reports
- KPI
- Team Members
- Activity/Audit

Không biến mọi dữ liệu thành Task. Entity/master data/transaction là dữ liệu nghiệp vụ; Task là lớp thực thi.

## 2. Cơ cấu tổ chức
```text
CÔNG TY TRẦN LÊ
├── BAN GIÁM ĐỐC
├── KINH DOANH
├── KỸ THUẬT / ENGINEERING
├── DỰ ÁN / EPC
├── O&M / BẢO HÀNH
├── MUA HÀNG / PROCUREMENT
├── KHO & LOGISTICS
├── MARKETING
├── CSKH
├── TÀI CHÍNH – KẾ TOÁN
├── HÀNH CHÍNH – NHÂN SỰ
├── IT
└── PHÁP CHẾ / HỢP ĐỒNG
```

## 3. Ban Giám đốc
### Chức năng
- Executive Dashboard
- Company KPI
- Department KPI
- Revenue / Gross Profit / Cash Flow
- Project Portfolio
- Work Overview
- Overdue / Blocked Tasks
- Approval Center
- Risk Management
- Issue Management
- Strategic Plan / Goal
- Executive Meetings
- Decisions / Action Items
- Escalation
- Company Reports
### KPI
Revenue, Profit, Cash Flow, Project Progress, Delayed Projects, Overdue Tasks, Critical Issues, Department Performance.

## 4. Phòng Kinh doanh
### Chức năng
- Sales Dashboard
- Customers / Contacts
- Leads
- Opportunities
- Pipeline
- Sales Activities
- Call / Meeting Calendar
- Site Survey Request
- Technical Request
- Quotation
- Price List
- Discount
- Quotation Approval
- Contracts
- Contract Follow-up
- Follow-up
- Lost Reason
- Competitor
- Sales / Target / Commission
- Import / Export
- Sales Reports
### Workflow
```text
Lead → Contacted → Qualified → Survey → Technical Request → Proposal → Quotation → Negotiation → Won/Lost → Contract → Project Handover
```
### Task
Call, Email, Follow-up, Meeting, Survey, Proposal, Quotation, Discount Approval, Negotiation, Contract, Handover.
### KPI
Leads, Qualified Leads, Pipeline Value, Quotation Value, Win Rate, Revenue, Average Deal, Sales Cycle.

## 5. Phòng Kỹ thuật / Engineering
### Chức năng
- Technical Dashboard
- Technical Request Queue
- Site Survey
- Load Analysis
- Electricity Bill Analysis
- Solar Design
- Electrical Design
- Hybrid Design
- ESS/Battery Design
- Off-grid Design
- Solar Pump Design
- Capacity Calculation
- Energy Yield Calculation
- BOM / BOQ
- SLD
- Layout
- Cable Schedule
- Equipment List
- Datasheet Library
- Compatibility Check
- Technical Review
- Technical Approval
- Revision
- Change Request
- Technical Issue
- Document Control
### Workflow
```text
Technical Request → Data Review → Survey → Analysis → Design → Calculation → BOM/BOQ → Review → Approval → EPC Handover
```
### KPI
Open Requests, Design Completion, On-time Rate, Rework Rate, Review Rejection, Average Design Time, Pending Approval.

## 6. Phòng Dự án / EPC
### Chức năng
- Project Portfolio
- Project Dashboard
- Project Planning
- Gantt
- Milestones
- Project Tasks
- Resource Planning
- Site Management
- Daily Report
- Construction Planning
- Progress
- QA/QC
- HSE
- Risk
- Issue
- Change Request
- Variation
- Cost Tracking
- Material Tracking
- Inspection
- Testing
- Commissioning
- Acceptance
- Handover
- Project Documents
- Project Reports
### QA/QC
Inspection Request, Material Inspection, Installation Checklist, NCR, Corrective Action, Punch List, Final Inspection.
### HSE
Safety Plan, Risk Assessment, Toolbox Meeting, PPE, Incident, Near Miss, Safety Inspection.
### Workflow
```text
Contract → Kickoff → Planning → Engineering → Procurement → Delivery → Construction → Testing → Commissioning → Acceptance → Handover → O&M
```

## 7. Phòng O&M / Bảo hành
### Chức năng
- O&M Dashboard
- Sites
- Installed Systems
- Asset Management
- Serial Number
- Service Ticket
- Maintenance Schedule
- Preventive Maintenance
- Corrective Maintenance
- Warranty
- Warranty Claim
- RMA
- Site Visit
- Technician Dispatch
- Monitoring
- Alarm / Alert
- Service Report
- Spare Parts
- SLA
### Asset
Serial, Model, Brand, Project, Site, Installation Date, Warranty Start/End, Status.
### Workflow
```text
Ticket → Triage → Remote Support → Dispatch → Diagnose → Repair/Replace → Test → Customer Confirmation → Close
```
### KPI
Open Tickets, SLA Compliance, MTTR, Repeat Failure, Maintenance Completion, Warranty Claims, Site Availability.

## 8. Phòng Mua hàng / Procurement
### Chức năng
- Procurement Dashboard
- Purchase Request
- Supplier / Contact
- RFQ
- Supplier Quotation
- Quotation Comparison
- Negotiation
- Approval
- Purchase Order
- PO Tracking
- Delivery Tracking
- Supplier Contract
- Supplier Documents
- Supplier Evaluation
- Supplier Performance
- Procurement Reports
### Workflow
```text
Purchase Request → Approval → RFQ → Quotations → Comparison → Negotiation → Approval → PO → Confirmation → Delivery → Warehouse
```
### KPI
Purchase Value, Lead Time, Supplier On-time Rate, Cost Saving, Open PO, Late Delivery.

## 9. Phòng Kho & Logistics
### Chức năng
- Warehouse Dashboard
- Products
- SKU
- Serial
- Warehouses
- Locations/Bins
- Inbound
- Outbound
- Transfer
- Reservation
- Return
- Stock Count
- Stock Adjustment
- Inventory
- Low Stock Alert
- Delivery Order
- Shipment
- Tracking
- Inventory Report
### Transaction
```text
INBOUND / OUTBOUND / TRANSFER / RESERVATION / RETURN / ADJUSTMENT
```
### Serial trace
```text
Serial → Product → Supplier → Warehouse → Project → Customer → Warranty
```
### KPI
Stock Value, Available, Reserved, Low Stock, Accuracy, Turnover, Late Delivery.

## 10. Phòng Marketing
### Chức năng
- Marketing Dashboard
- Campaign
- Content Calendar
- Content
- Website
- SEO
- Facebook
- Social Media
- Landing Page
- Media Library
- Banner
- Video
- Event
- Lead Source
- Ads
- Performance
- Marketing Report
### Workflow
```text
Idea → Brief → Draft → Design → Review → Approval → Publish → Measure
```
### KPI
Traffic, Leads, Reach, Engagement, Conversion, Content Output, Campaign ROI, CPL.

## 11. Phòng CSKH
### Chức năng
- CSKH Dashboard
- Customer Profile
- Ticket
- Request
- Complaint
- Follow-up
- Call Log
- Interaction History
- Customer Documents
- Satisfaction / CSAT
- Warranty Request
- Service Request
- Escalation
- SLA
- CSKH Report
### Ticket
Product, Quotation, Delivery, Technical, Warranty, Complaint, Maintenance, Invoice, Contract.
### Workflow
```text
Request → Categorize → Assign → Resolve → Customer Confirmation → Close
```
### KPI
First Response, Resolution Time, SLA, CSAT, Complaints, Repeat Ticket.

## 12. Phòng Tài chính – Kế toán
### Chức năng
- Finance Dashboard
- Revenue
- Expense
- Accounts Receivable
- Accounts Payable
- Invoice
- Receipt
- Payment
- Cash Flow
- Budget
- Project Cost
- Project Profit
- Bank Reconciliation
- Tax Documents
- Payment Approval
- Finance Report
### AR
Invoice, Due Date, Amount, Paid, Outstanding, Aging.
### AP
Supplier, PO, Invoice, Amount, Due Date, Payment Status.
### Project Finance
Contract Value, Revenue, Material Cost, Labor Cost, Subcontract Cost, Logistics Cost, Other Cost, Gross Profit, Margin.

## 13. Phòng Hành chính – Nhân sự
### Chức năng
- HR Dashboard
- Employee Directory
- Departments
- Teams
- Positions
- Organization Chart
- Recruitment
- Candidate
- Interview
- Offer
- Onboarding
- Offboarding
- Transfer
- Promotion
- Leave
- Attendance
- Training
- Performance Review
- HR Documents
- Policies
### Onboarding
```text
Employee → Account → Email → Department → Team → Position → Role → Device → Access → Training → Active
```
### KPI
Headcount, New Hires, Turnover, Open Positions, Leave, Training, Performance.

## 14. Phòng IT
### Chức năng
- IT Dashboard
- Helpdesk
- IT Ticket
- User Account
- Access Management
- Device Management
- Laptop/PC
- Software License
- Network
- Server
- Hosting
- Backup
- Security
- Monitoring
- Incident
- Change Management
- Knowledge Base
### Request
Tạo tài khoản, cấp quyền, reset password, cấp máy, cài phần mềm, cấp email, thu hồi quyền.
### Incident
P1 Critical, P2 High, P3 Medium, P4 Low.

## 15. Phòng Pháp chế / Hợp đồng
### Chức năng
- Legal Dashboard
- Contract Register
- Contract Draft
- Contract Review
- Legal Review
- Approval
- E-signature Tracking
- Renewal
- Expiry Alert
- NDA
- EPC Contract
- Supplier Contract
- Customer Contract
- Legal Document
- Legal Issue
- Legal Report
### Workflow
```text
Draft → Review → Legal Review → Approval → Signature → Active → Renewal / Expired
```

## 16. Chức năng dùng chung cho mọi phòng
### Công việc
Task, Subtask, Checklist, Priority, Deadline, Assignee, Status, Tag, Attachment, Comment, Mention, Time Tracking, Recurring Task.
### Workflow
Request, Assignment, Review, Approval, Rejection, Handoff, Escalation.
### Thời gian
Calendar, Deadline, Reminder, Recurring Task, SLA.
### Tài liệu
Upload, Version, Preview, Approval, Download, History.
### Báo cáo
KPI, Dashboard, Report, Export Excel/PDF, Filter, Drill-down.
### Quản trị
Role, Permission, Department Scope, Team Scope, Project Scope, Audit Log.

## 17. Quan hệ giữa các phòng
```text
Kinh doanh
    ↓ Technical Request
Kỹ thuật
    ↓ Approved Design / BOM
Dự án / EPC
    ↓ Purchase Request
Mua hàng
    ↓ PO / Delivery
Kho & Logistics
    ↓ Materials
Dự án / EPC
    ↓ Commissioning / Handover
O&M / Bảo hành
    ↓ Service / Warranty
CSKH
```

Phòng hỗ trợ xuyên suốt:
```text
Finance → doanh thu / công nợ / chi phí / thanh toán
HR → nhân sự / tổ chức
IT → hệ thống / tài khoản / bảo mật
Marketing → thương hiệu / nội dung / lead
Legal → hợp đồng / pháp lý / phê duyệt
```

## 18. Cross-Department Request
Entity:
```text
DepartmentRequest
- id
- sourceDepartmentId
- targetDepartmentId
- requesterId
- title
- description
- priority
- relatedEntityType
- relatedEntityId
- dueDate
- status
- attachments
- createdAt
- updatedAt
```

Ví dụ:
```text
Sales → Technical Request → Engineering
Engineering → Purchase Request → Procurement
CSKH → Service Request → O&M
Warehouse → Delivery Request → Logistics
```

## 19. Project Cross-Department
Một project có thể gồm nhiều phòng:
```text
Sales → Commercial Owner
Engineering → Technical Owner
EPC → Execution Owner
Procurement → Purchasing
Warehouse → Materials
Finance → Billing
O&M → After-sales
```

Khuyến nghị:
```text
projects.primaryDepartmentId
project_departments(projectId, departmentId, role)
project_members(projectId, userId, role)
```

## 20. Permission Scope
```text
OWN
TEAM
DEPARTMENT
PROJECT
COMPANY
SYSTEM
```
Ví dụ:
```text
task.read.own
task.read.team
task.read.department
task.read.company
task.create
task.assign.team
task.assign.department
project.read
project.manage
report.read.department
report.read.company
approval.request
approval.approve
```

## 21. Dashboard theo vai trò
### Employee
My Tasks, Today, Upcoming, Overdue, Blocked, Calendar, Notifications.
### Team Leader
Team Tasks, Workload, Overdue, Blocked, Review, Team KPI.
### Department Manager
Department KPI, Tasks, Projects, Staff Performance, Approval, Reports.
### Project Manager
Project Progress, Milestones, Tasks, Issues, Risk, Schedule, Budget.
### Executive
Company KPI, Revenue, Projects, Departments, Workload, Risks, Issues, Approvals.

## 22. Workflow Engine
```text
REQUEST
→ TRIAGE
→ ASSIGN
→ IN PROGRESS
→ REVIEW
→ APPROVAL
→ HANDOFF
→ DONE
```

## 23. Automation
### Won Deal
```text
Opportunity WON
→ Create Project
→ Create PM Task
→ Create Engineering Request
→ Create Procurement Request
→ Create Finance Task
```
### Overdue
```text
dueDate < today AND status != DONE/CANCELLED
→ Notify assignee
→ Notify manager
```
### Blocked
Bắt buộc `Blocked Reason`, `Blocked By`, `Expected Resolution`.
### Engineering Approved
→ tạo EPC Handover.
### Project Acceptance
→ O&M Onboarding + Warranty Registration + Handover Checklist + Customer Documents.

## 24. Definition of Done cho một phòng
```text
[ ] Dashboard
[ ] Members
[ ] Master Data
[ ] Business Modules
[ ] Work Queue
[ ] Task Types
[ ] Workflow
[ ] Approval
[ ] Calendar
[ ] Documents
[ ] Notifications
[ ] Reports
[ ] KPI
[ ] Audit
[ ] SLA nếu cần
[ ] Cross-department Handoff
[ ] Permission Scope
```

## 25. Master Prompt cho AI Coding Agent
```text
You are the lead software architect and senior full-stack engineer for TranLe Tasks.

Read:
1. TRANLE_TASKS_SYSTEM_ANALYSIS_AND_DESIGN.md
2. TRANLE_TASKS_DEPARTMENT_FUNCTIONAL_BLUEPRINT.md
3. TRANLE_TASKS_DEPARTMENT_PERSONALIZATION.md
4. TRANLE_DESIGN_SYSTEM.md
5. The complete repository

Goal:
Transform the existing TranLe Tasks app into a department-aware company operational management platform.

Do not blindly rewrite the project.

First audit frontend, backend, database, auth, roles, permissions, departments, users, tasks, projects, contracts, revenue, products, reports, documents, meetings, notifications and AI.

Then implement:
Organization → Department → Team → Position → User → Role → Permission/Scope.

Build department-specific modules, workflows, dashboards, KPI, approval and reports for Sales, Engineering, EPC, O&M, Procurement, Warehouse/Logistics, Marketing, CSKH, Finance, HR, IT, Legal and Executive.

Preserve existing features.
Use IDs instead of display names for relations.
Use migrations and preserve data.
Enforce authorization on backend.
Support cross-department projects and DepartmentRequest.
Use shared Workflow and Approval engines.
Do not treat all business data as tasks.

For each phase:
- inspect current code
- list impacted files
- implement
- run tests
- run typecheck
- run build
- report DB/API/permission changes
- report risks and remaining work

A department is complete only when its Dashboard, Business Modules, Work Queue, Workflow, Approval, Reports, KPI, Permissions and Handoff are implemented.
```

# END OF SPECIFICATION
