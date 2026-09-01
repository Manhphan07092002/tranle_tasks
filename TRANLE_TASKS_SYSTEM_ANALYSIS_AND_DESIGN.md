# TRANLE TASKS — PHÂN TÍCH & THIẾT KẾ HỆ THỐNG
## Bộ sơ đồ đồ án môn IT / Phân tích & Thiết kế hệ thống

> **Hệ thống:** TranLe Tasks — Tran Le Electricity Management & Collaboration Platform  
> **Repository:** https://github.com/Manhphan07092002/tranle_tasks.git  
> **Website doanh nghiệp:** https://tranlecorp.com/  
> **Mục tiêu tài liệu:** chuyển cấu trúc hệ thống hiện tại thành một bộ phân tích & thiết kế hoàn chỉnh theo chuẩn đồ án môn Phân tích & Thiết kế hệ thống.
>
> **Nguồn phân tích repo:** `phan_tich.MD` và cấu trúc repository hiện tại. Repo đang là monorepo với React/Vite/Tailwind ở frontend, Express/TypeScript ở backend, MySQL 8, Socket.io, Gemini AI, mail IMAP/SMTP và Docker/PM2/Nginx cho triển khai. citeturn524105view1turn524105view2
>
> **Lưu ý:** sơ đồ dưới đây là mô hình mục tiêu/đề xuất để hoàn thiện hệ thống theo cơ cấu phòng ban. Những quan hệ chưa có đầy đủ trong code hiện tại được ghi rõ là **Target / Proposed** để AI triển khai.

---

# 1. PHẠM VI HỆ THỐNG

TranLe Tasks hiện được định hướng là nền tảng quản lý công việc, dự án và cộng tác nội bộ; repository hiện có các nhóm chức năng như Task Management, Calendar/Meetings, Team Directory, Mail, Reports/Dashboard, Admin, AI Assistant và realtime collaboration. citeturn992973view0

Phần backend hiện có các route cho `tasks`, `projects`, `contracts`, `revenue`, `products`, `documents`, `meetings`, `roles`, `departments`, `users`, `reports`, `notifications`, `activity`, `events`, `upload`, `AI`, v.v. citeturn524105view2turn524105view3

Hệ thống mục tiêu bổ sung quản lý theo phòng ban:

```text
Company
│
├── Ban Giám đốc
├── Kinh doanh
├── Kỹ thuật / Engineering
├── Dự án / EPC
├── O&M / Bảo hành
├── Mua hàng
├── Kho & Logistics
├── Marketing
├── CSKH
├── Tài chính – Kế toán
├── HCNS
├── IT
└── Pháp chế / Hợp đồng
```

---

# 2. ACTOR CỦA HỆ THỐNG

## 2.1. Actor nội bộ

| Actor | Vai trò |
|---|---|
| Nhân viên | Thực hiện công việc, cập nhật tiến độ, báo cáo kết quả |
| Trưởng nhóm | Quản lý team, phân công và review |
| Trưởng phòng | Quản lý nghiệp vụ và KPI phòng |
| Project Manager | Quản lý tiến độ và thành viên dự án |
| Ban Giám đốc | Điều hành toàn công ty, xem KPI, phê duyệt |
| Admin/IT | Quản trị tài khoản, hệ thống, quyền |
| Kế toán | Quản lý doanh thu, chi phí, công nợ |
| HR | Quản lý nhân sự và tổ chức |
| Sales | Quản lý CRM, báo giá, hợp đồng |
| Engineering | Quản lý kỹ thuật, thiết kế |
| EPC | Quản lý triển khai dự án |
| Procurement | Quản lý mua hàng |
| Warehouse/Logistics | Quản lý kho, serial, giao nhận |
| O&M | Quản lý bảo trì, sự cố, bảo hành |
| Marketing | Quản lý nội dung, chiến dịch, social |
| CSKH | Quản lý yêu cầu và phản hồi khách hàng |
| Legal | Quản lý hợp đồng và pháp lý |

## 2.2. Actor bên ngoài

```text
Khách hàng
Nhà cung cấp
Đối tác
Hệ thống Email
Google Gemini API
Thiết bị/Browser
```

---

# 3. SƠ ĐỒ 1 — CONTEXT DIAGRAM

## 3.1. Mục đích

Thể hiện TranLe Tasks như một hệ thống trung tâm và các tác nhân trao đổi dữ liệu với hệ thống.

```mermaid
flowchart LR
    EMP["Nhân viên"]
    TL["Trưởng nhóm"]
    MGR["Trưởng phòng"]
    PM["Project Manager"]
    DIR["Ban Giám đốc"]
    ADM["Admin / IT"]
    CUS["Khách hàng"]
    SUP["Nhà cung cấp"]
    MAIL["Email / IMAP / SMTP"]
    GEM["Google Gemini API"]

    SYS["TRANLE TASKS<br/>Hệ thống quản lý công việc<br/>phòng ban & dự án"]

    EMP <--> |Task / Report / Comment / Document| SYS
    TL <--> |Assign / Review / Team KPI| SYS
    MGR <--> |Department Workflow / KPI / Approval| SYS
    PM <--> |Project / Milestone / Task| SYS
    DIR <--> |Executive KPI / Approval / Decision| SYS
    ADM <--> |Users / Roles / Config / Security| SYS
    CUS <--> |Customer Request / Service / Project Data| SYS
    SUP <--> |Quotation / PO / Delivery / Warranty| SYS
    MAIL <--> |Send / Receive Email| SYS
    SYS <--> |Prompt / Suggestion / AI Task| GEM
```

### Dữ liệu chính

```text
Người dùng → Task / Request / Report / Document / Comment
Trưởng phòng → Assignment / Approval / KPI
Ban Giám đốc → KPI / Decision / Approval
Khách hàng → Request / Project / Service Ticket
Nhà cung cấp → RFQ / Quotation / PO / Delivery
Email → Message / Attachment
Gemini → AI Suggestion / Task Template / Assistant
```

---

# 4. SƠ ĐỒ 2 — USE CASE DIAGRAM

## 4.1. Use Case cấp hệ thống

```mermaid
flowchart LR
    EMP["Nhân viên"]
    TL["Trưởng nhóm"]
    MGR["Trưởng phòng"]
    PM["Project Manager"]
    DIR["Ban Giám đốc"]
    ADM["Admin / IT"]
    SALES["Kinh doanh"]
    ENG["Kỹ thuật"]
    EPC["Dự án / EPC"]
    PROC["Mua hàng"]
    WH["Kho / Logistics"]
    OM["O&M"]
    FIN["Tài chính / Kế toán"]
    HR["HCNS"]
    CS["CSKH"]
    MKT["Marketing"]
    LEGAL["Pháp chế"]

    subgraph UC["TRANLE TASKS — USE CASES"]
        U1(("Đăng nhập / Xác thực"))
        U2(("Quản lý công việc"))
        U3(("Giao việc"))
        U4(("Cập nhật tiến độ"))
        U5(("Duyệt công việc"))
        U6(("Quản lý phòng ban"))
        U7(("Quản lý Team / Chức vụ"))
        U8(("Quản lý nhân sự"))
        U9(("Quản lý dự án"))
        U10(("Quản lý khách hàng"))
        U11(("Quản lý báo giá / Hợp đồng"))
        U12(("Quản lý mua hàng"))
        U13(("Quản lý kho / Logistics"))
        U14(("Quản lý O&M / Bảo hành"))
        U15(("Quản lý báo cáo / KPI"))
        U16(("Quản lý cuộc họp / Lịch"))
        U17(("Quản lý tài liệu"))
        U18(("Quản lý Email"))
        U19(("AI Assistant"))
        U20(("Quản trị người dùng / quyền"))
        U21(("Notifications / Activity"))
    end

    EMP --> U1
    EMP --> U2
    EMP --> U4
    EMP --> U16
    EMP --> U17
    EMP --> U18
    EMP --> U21

    TL --> U3
    TL --> U5
    TL --> U15

    MGR --> U3
    MGR --> U5
    MGR --> U6
    MGR --> U15

    PM --> U9
    PM --> U2
    PM --> U15

    DIR --> U9
    DIR --> U15
    DIR --> U5

    ADM --> U6
    ADM --> U7
    ADM --> U8
    ADM --> U20

    SALES --> U10
    SALES --> U11
    SALES --> U2

    ENG --> U2
    ENG --> U9
    EPC --> U9
    PROC --> U12
    WH --> U13
    OM --> U14
    FIN --> U11
    FIN --> U15
    HR --> U8
    CS --> U10
    MKT --> U15
    LEGAL --> U11
```

---

# 5. USE CASE PHÂN RÃ THEO ACTOR

## 5.1. Nhân viên

```text
Đăng nhập
Xem việc của tôi
Nhận việc
Cập nhật trạng thái
Cập nhật tiến độ
Comment
Mention
Upload tài liệu
Xem lịch
Tham gia họp
Tạo báo cáo
Xem thông báo
Dùng AI Assistant
```

## 5.2. Trưởng nhóm

```text
Xem công việc team
Tạo task
Giao task
Đổi người thực hiện
Theo dõi workload
Review kết quả
Duyệt task
Xem KPI team
```

## 5.3. Trưởng phòng

```text
Quản lý công việc phòng
Quản lý thành viên phòng
Quản lý team
Phân công
Review
Approval
Theo dõi project
Theo dõi KPI
Báo cáo phòng
```

## 5.4. Ban Giám đốc

```text
Xem toàn công ty
KPI
Revenue
Projects
Department Performance
Approval
Decision
Risk
Issue
Executive Report
```

## 5.5. Admin/IT

```text
Users
Departments
Teams
Positions
Roles
Permissions
System Config
Audit
Security
```

---

# 6. SƠ ĐỒ 3 — ACTIVITY DIAGRAM NGHIỆP VỤ TRUNG TÂM

## 6.1. Luồng giao việc

```mermaid
flowchart TD
    A([Start]) --> B["Trưởng nhóm / Trưởng phòng tạo task"]
    B --> C["Nhập thông tin task"]
    C --> D{"Dữ liệu hợp lệ?"}
    D -- "Không" --> E["Báo lỗi / yêu cầu bổ sung"]
    E --> C
    D -- "Có" --> F["Chọn Department / Team / Assignee"]
    F --> G["Thiết lập Priority / Deadline / Project"]
    G --> H["Tạo Task"]
    H --> I["Notification cho người thực hiện"]
    I --> J["Nhân viên nhận việc"]
    J --> K["In Progress"]
    K --> L{"Hoàn thành?"}
    L -- "Chưa" --> K
    L -- "Có" --> M["Submit kết quả"]
    M --> N["Review"]
    N --> O{"Được duyệt?"}
    O -- "Không" --> P["Trả lại / yêu cầu chỉnh sửa"]
    P --> K
    O -- "Có" --> Q["Done"]
    Q --> R([End])
```

---

# 7. ACTIVITY — WORKFLOW SALES → ENGINEERING → EPC

```mermaid
flowchart TD
    A([Khách hàng]) --> B["Sales tạo Lead"]
    B --> C["Qualification"]
    C --> D{"Có nhu cầu?"}
    D -- "Không" --> Z([Lost])
    D -- "Có" --> E["Khảo sát / thu thập dữ liệu"]
    E --> F["Technical Request"]
    F --> G["Engineering phân tích"]
    G --> H["Thiết kế"]
    H --> I["BOM / Proposal kỹ thuật"]
    I --> J["Technical Review"]
    J --> K{"Approved?"}
    K -- "Không" --> H
    K -- "Có" --> L["Sales lập Quotation"]
    L --> M["Negotiation"]
    M --> N{"Won?"}
    N -- "Không" --> Z2([Lost])
    N -- "Có" --> O["Contract"]
    O --> P["Create Project"]
    P --> Q["EPC Kickoff"]
    Q --> R["Procurement"]
    R --> S["Warehouse / Delivery"]
    S --> T["Construction"]
    T --> U["Testing / Commissioning"]
    U --> V["Acceptance / Handover"]
    V --> W["O&M / Warranty"]
```

---

# 8. ACTIVITY — XỬ LÝ SERVICE TICKET

```mermaid
flowchart TD
    A([Customer Request]) --> B["CSKH tạo Ticket"]
    B --> C["Phân loại"]
    C --> D["Đánh Priority / SLA"]
    D --> E["Assign O&M"]
    E --> F{"Có thể xử lý từ xa?"}
    F -- "Có" --> G["Remote Support"]
    F -- "Không" --> H["Tạo Site Visit"]
    H --> I["Đi kỹ thuật"]
    I --> J["Diagnose"]
    J --> K["Repair / Replace"]
    K --> L["Testing"]
    G --> L
    L --> M{"Khách xác nhận?"}
    M -- "Chưa" --> J
    M -- "Có" --> N["Close Ticket"]
```

---

# 9. SƠ ĐỒ 4 — SEQUENCE DIAGRAM

## 9.1. Đăng nhập

```mermaid
sequenceDiagram
    actor U as User
    participant UI as React UI
    participant API as Express API
    participant DB as MySQL
    U->>UI: Nhập email/password
    UI->>API: POST /api/auth/login
    API->>DB: Query user
    DB-->>API: User + Role
    API->>API: Verify password
    API->>API: Generate JWT
    API-->>UI: Token + User Context
    UI-->>U: Dashboard theo role/department
```

## 9.2. Tạo và giao Task

```mermaid
sequenceDiagram
    actor M as Manager
    participant UI as Task UI
    participant API as Task API
    participant DB as MySQL
    participant N as Notification Service
    M->>UI: Nhập task
    UI->>API: POST /api/tasks
    API->>API: Validate permission
    API->>DB: INSERT task
    DB-->>API: Created Task
    API->>N: Create notification
    N-->>M: Assignment event
    API-->>UI: Task created
    UI-->>M: Task detail
```

## 9.3. Approval

```mermaid
sequenceDiagram
    actor R as Requester
    actor A as Approver
    participant UI as Web UI
    participant API as Backend
    participant DB as MySQL
    R->>UI: Submit Approval
    UI->>API: POST /api/approvals
    API->>DB: Create approval
    DB-->>API: Approval ID
    API-->>A: Notification
    A->>UI: Open approval
    UI->>API: Approve / Reject
    API->>DB: Update approval
    DB-->>API: Saved
    API-->>R: Approval result
```

## 9.4. Cross-department Request

```mermaid
sequenceDiagram
    actor S as Sales
    participant UI as Frontend
    participant API as Backend
    participant DB as MySQL
    actor E as Engineering
    S->>UI: Create Technical Request
    UI->>API: POST /api/department-requests
    API->>DB: INSERT request
    DB-->>API: Request
    API-->>E: Notification / Queue
    E->>UI: Accept request
    UI->>API: Update request
    API->>DB: Save
    API-->>S: Status update
```

---

# 10. SƠ ĐỒ 5 — CLASS DIAGRAM

> Mô hình mục tiêu theo hướng domain. Không nhất thiết trùng 100% class hiện tại trong source.

```mermaid
classDiagram
    class Company {
      +id
      +name
    }

    class Department {
      +id
      +code
      +name
      +description
      +managerId
      +parentId
      +isActive
    }

    class Team {
      +id
      +departmentId
      +code
      +name
      +managerId
    }

    class Position {
      +id
      +departmentId
      +teamId
      +code
      +name
      +level
      +isManager
    }

    class User {
      +id
      +name
      +email
      +departmentId
      +teamId
      +positionId
      +managerId
      +roleId
    }

    class Role {
      +id
      +name
    }

    class Permission {
      +id
      +code
      +resource
      +action
      +scope
    }

    class Customer {
      +id
      +name
      +phone
      +email
    }

    class Project {
      +id
      +name
      +customerId
      +primaryDepartmentId
      +status
      +startDate
      +endDate
    }

    class ProjectDepartment {
      +projectId
      +departmentId
      +role
    }

    class Milestone {
      +id
      +projectId
      +name
      +status
      +dueDate
    }

    class Task {
      +id
      +title
      +description
      +departmentId
      +teamId
      +projectId
      +milestoneId
      +assigneeId
      +status
      +priority
      +dueDate
    }

    class DepartmentRequest {
      +id
      +sourceDepartmentId
      +targetDepartmentId
      +requesterId
      +relatedEntityType
      +relatedEntityId
      +priority
      +status
    }

    class Approval {
      +id
      +entityType
      +entityId
      +requestedBy
      +approverId
      +status
    }

    class Document {
      +id
      +name
      +entityType
      +entityId
    }

    class Notification {
      +id
      +userId
      +type
      +entityId
      +isRead
    }

    class ActivityLog {
      +id
      +actorId
      +action
      +entityType
      +entityId
      +oldValue
      +newValue
      +createdAt
    }

    Company "1" --> "*" Department
    Department "1" --> "*" Team
    Team "1" --> "*" Position
    Position "1" --> "*" User
    Department "1" --> "*" User
    Department "1" --> "1" User : manager
    Role "1" --> "*" User
    Role "*" --> "*" Permission
    User "1" --> "*" Task : creates/owns
    Department "1" --> "*" Task
    Team "1" --> "*" Task
    Project "1" --> "*" Milestone
    Project "1" --> "*" Task
    Customer "1" --> "*" Project
    Project "*" --> "*" Department : ProjectDepartment
    DepartmentRequest "*" --> "1" Department : source
    DepartmentRequest "*" --> "1" Department : target
    DepartmentRequest "*" --> "1" User : requester
    Task "*" --> "*" User : assignees
    Approval "*" --> "1" User : approver
    Document "*" --> "1" User : owner
    Notification "*" --> "1" User
    ActivityLog "*" --> "1" User : actor
```

---

# 11. SƠ ĐỒ 6 — ERD

```mermaid
erDiagram
    COMPANY ||--o{ DEPARTMENT : contains
    DEPARTMENT ||--o{ TEAM : contains
    TEAM ||--o{ POSITION : contains
    POSITION ||--o{ USER : assigns
    DEPARTMENT ||--o{ USER : belongs_to
    USER ||--o| DEPARTMENT : manages

    ROLE ||--o{ USER : assigned
    ROLE ||--o{ ROLE_PERMISSION : has
    PERMISSION ||--o{ ROLE_PERMISSION : grants

    CUSTOMER ||--o{ PROJECT : owns
    PROJECT ||--o{ PROJECT_MILESTONE : contains
    PROJECT ||--o{ PROJECT_DEPARTMENT : involves
    DEPARTMENT ||--o{ PROJECT_DEPARTMENT : participates
    PROJECT ||--o{ PROJECT_MEMBER : members
    USER ||--o{ PROJECT_MEMBER : assigned

    DEPARTMENT ||--o{ TASK : owns
    TEAM ||--o{ TASK : handles
    PROJECT ||--o{ TASK : contains
    PROJECT_MILESTONE ||--o{ TASK : groups
    USER ||--o{ TASK : creates
    USER ||--o{ TASK_ASSIGNEE : assigned
    TASK ||--o{ TASK_ASSIGNEE : has
    TASK ||--o{ TASK_COMMENT : has
    TASK ||--o{ TASK_ATTACHMENT : has
    TASK ||--o{ TASK_CHECKLIST : has
    TASK ||--o{ TASK_HISTORY : tracks

    DEPARTMENT ||--o{ DEPARTMENT_REQUEST : source
    DEPARTMENT ||--o{ DEPARTMENT_REQUEST : target
    USER ||--o{ DEPARTMENT_REQUEST : requests

    DEPARTMENT_REQUEST ||--o{ APPROVAL : may_require
    TASK ||--o{ APPROVAL : may_require
    APPROVAL }o--|| USER : approver

    USER ||--o{ DOCUMENT : uploads
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY_LOG : actor

    COMPANY {
      string id PK
      string name
    }
    DEPARTMENT {
      string id PK
      string code UK
      string name
      string manager_id FK
      string parent_id FK
      boolean is_active
    }
    TEAM {
      string id PK
      string department_id FK
      string code UK
      string name
      string manager_id FK
    }
    POSITION {
      string id PK
      string department_id FK
      string team_id FK
      string code UK
      string name
      int level
      boolean is_manager
    }
    USER {
      string id PK
      string name
      string email UK
      string department_id FK
      string team_id FK
      string position_id FK
      string manager_id FK
      string role_id FK
    }
    ROLE {
      string id PK
      string name
    }
    PERMISSION {
      string id PK
      string code UK
      string resource
      string action
      string scope
    }
    ROLE_PERMISSION {
      string role_id FK
      string permission_id FK
    }
    CUSTOMER {
      string id PK
      string name
      string email
      string phone
    }
    PROJECT {
      string id PK
      string customer_id FK
      string primary_department_id FK
      string name
      string status
      date start_date
      date end_date
    }
    PROJECT_DEPARTMENT {
      string project_id FK
      string department_id FK
      string role
    }
    PROJECT_MEMBER {
      string project_id FK
      string user_id FK
      string role
    }
    PROJECT_MILESTONE {
      string id PK
      string project_id FK
      string name
      string status
      date due_date
    }
    TASK {
      string id PK
      string department_id FK
      string team_id FK
      string project_id FK
      string milestone_id FK
      string created_by FK
      string title
      string status
      string priority
      date due_date
    }
    TASK_ASSIGNEE {
      string task_id FK
      string user_id FK
    }
    TASK_COMMENT {
      string id PK
      string task_id FK
      string user_id FK
      text content
    }
    TASK_ATTACHMENT {
      string id PK
      string task_id FK
      string file_url
    }
    TASK_CHECKLIST {
      string id PK
      string task_id FK
      string content
      boolean completed
    }
    TASK_HISTORY {
      string id PK
      string task_id FK
      string actor_id FK
      string action
    }
    DEPARTMENT_REQUEST {
      string id PK
      string source_department_id FK
      string target_department_id FK
      string requester_id FK
      string related_entity_type
      string related_entity_id
      string status
    }
    APPROVAL {
      string id PK
      string entity_type
      string entity_id
      string requested_by FK
      string approver_id FK
      string status
    }
    DOCUMENT {
      string id PK
      string owner_id FK
      string entity_type
      string entity_id
      string name
    }
    NOTIFICATION {
      string id PK
      string user_id FK
      string type
      string entity_id
      boolean is_read
    }
    ACTIVITY_LOG {
      string id PK
      string actor_id FK
      string action
      string entity_type
      string entity_id
      datetime created_at
    }
```

---

# 12. SƠ ĐỒ 7 — DFD LEVEL 0

## 12.1. Tiến trình tổng quát

```mermaid
flowchart LR
    E1["Nhân viên"]
    E2["Trưởng phòng / Manager"]
    E3["Ban Giám đốc"]
    E4["Khách hàng"]
    E5["Nhà cung cấp"]
    E6["Admin / IT"]

    P0(("0. TRANLE TASKS"))

    D1[("D1 Users & Organization")]
    D2[("D2 Tasks & Workflow")]
    D3[("D3 Projects & Customers")]
    D4[("D4 Documents")]
    D5[("D5 Reports / KPI")]
    D6[("D6 Notifications / Activity")]
    D7[("D7 Business Data")]

    E1 -->|Task / Update / Report| P0
    E2 -->|Assign / Review / Approval| P0
    E3 -->|KPI / Decision| P0
    E4 -->|Request / Project Data| P0
    E5 -->|Quotation / PO / Delivery| P0
    E6 -->|Users / Roles / Configuration| P0

    P0 <--> D1
    P0 <--> D2
    P0 <--> D3
    P0 <--> D4
    P0 <--> D5
    P0 <--> D6
    P0 <--> D7
```

---

# 13. DFD LEVEL 1

Phân rã hệ thống thành các tiến trình:

```mermaid
flowchart TB
    I["External Inputs"]
    P1(("1.0 Authentication & Organization"))
    P2(("2.0 Task & Workflow"))
    P3(("3.0 Project & Customer"))
    P4(("4.0 Department Business Modules"))
    P5(("5.0 Collaboration"))
    P6(("6.0 Reporting & KPI"))
    P7(("7.0 Administration"))

    D1[("D1 Users / Departments / Teams / Roles")]
    D2[("D2 Tasks / Requests / Approvals")]
    D3[("D3 Projects / Customers")]
    D4[("D4 Documents / Attachments")]
    D5[("D5 Reports / Revenue / KPI")]
    D6[("D6 Meetings / Mail / Notes")]
    D7[("D7 Activity / Notifications")]

    I --> P1
    P1 <--> D1

    P1 --> P2
    P2 <--> D2

    P1 --> P3
    P3 <--> D3

    P2 --> P4
    P4 <--> D2
    P4 <--> D3

    P2 --> P5
    P5 <--> D6
    P5 <--> D4
    P5 <--> D7

    P2 --> P6
    P3 --> P6
    P4 --> P6
    P6 <--> D5

    P1 --> P7
    P7 <--> D1
```

---

# 14. DFD LEVEL 2 — QUẢN LÝ CÔNG VIỆC

```mermaid
flowchart TB
    A["2.0 Task Management"]
    P21(("2.1 Tạo Task"))
    P22(("2.2 Phân công"))
    P23(("2.3 Thực hiện"))
    P24(("2.4 Review / Approval"))
    P25(("2.5 Theo dõi"))
    P26(("2.6 Hoàn thành"))

    D21[("Task DB")]
    D22[("User / Department DB")]
    D23[("Project DB")]
    D24[("Notification / Activity")]

    A --> P21
    P21 --> D21
    P21 --> P22
    D22 --> P22
    P22 --> D21
    P22 --> D24
    P22 --> P23
    P23 --> D21
    P23 --> D24
    P23 --> P24
    P24 --> D21
    P24 --> D24
    P24 --> P25
    D23 --> P25
    P25 --> P26
    P26 --> D21
```

---

# 15. SƠ ĐỒ 8 — COMPONENT DIAGRAM

Repo hiện dùng React/Vite/Tailwind/TypeScript ở frontend; backend Express/TypeScript; MySQL 8; Socket.io; Gemini; Nodemailer/IMAPFlow; Docker/PM2/Nginx. citeturn524105view1

```mermaid
flowchart TB
    UI["Frontend<br/>React + Vite + TypeScript + Tailwind"]
    ROUTER["Router / Auth Context"]
    TASK_UI["Task / Kanban / Calendar"]
    ORG_UI["Organization / Department"]
    PROJECT_UI["Projects"]
    SALES_UI["Sales / Contracts"]
    OPS_UI["Procurement / Warehouse / O&M"]
    REPORT_UI["Reports / Dashboard"]
    COLLAB_UI["Mail / Meetings / Notes"]
    ADMIN_UI["Admin / Roles / Permissions"]
    AI_UI["AI Assistant"]

    API["Express API"]
    AUTH["Auth Middleware / JWT"]
    TASK["Task Service"]
    ORG["Organization Service"]
    PROJECT["Project Service"]
    BUSINESS["Business Services"]
    REPORT["Report Service"]
    DOC["Document Service"]
    MAIL["Mail Service"]
    AI["AI Service"]
    SOCKET["Socket.io"]

    DB[("MySQL 8")]
    FILES[("File Storage")]
    GEM["Google Gemini API"]
    EMAIL["IMAP / SMTP / Poste.io"]

    UI --> ROUTER
    ROUTER --> TASK_UI
    ROUTER --> ORG_UI
    ROUTER --> PROJECT_UI
    ROUTER --> SALES_UI
    ROUTER --> OPS_UI
    ROUTER --> REPORT_UI
    ROUTER --> COLLAB_UI
    ROUTER --> ADMIN_UI
    ROUTER --> AI_UI

    TASK_UI --> API
    ORG_UI --> API
    PROJECT_UI --> API
    SALES_UI --> API
    OPS_UI --> API
    REPORT_UI --> API
    COLLAB_UI --> API
    ADMIN_UI --> API
    AI_UI --> API

    API --> AUTH
    AUTH --> TASK
    AUTH --> ORG
    AUTH --> PROJECT
    AUTH --> BUSINESS
    AUTH --> REPORT
    AUTH --> DOC
    AUTH --> MAIL
    AUTH --> AI
    AUTH --> SOCKET

    TASK --> DB
    ORG --> DB
    PROJECT --> DB
    BUSINESS --> DB
    REPORT --> DB
    DOC --> DB
    DOC --> FILES
    MAIL --> EMAIL
    AI --> GEM
    SOCKET --> DB
```

---

# 16. SƠ ĐỒ 9 — DEPLOYMENT DIAGRAM

```mermaid
flowchart TB
    USER["PC / Laptop / Mobile Browser"]
    NGINX["Nginx / Reverse Proxy"]

    APP["Application Server<br/>Docker / PM2"]
    FRONT["Frontend React Build"]
    BACK["Backend Express / TypeScript<br/>Port 3500"]

    MYSQL[("MySQL 8")]
    POSTE["Poste.io<br/>Mail Server"]
    SOCKET["Socket.io"]
    GEMINI["Google Gemini API"]

    USER -->|HTTPS| NGINX
    NGINX --> FRONT
    NGINX --> BACK

    FRONT --> BACK
    BACK --> MYSQL
    BACK --> SOCKET
    BACK --> POSTE
    BACK --> GEMINI

    APP --> FRONT
    APP --> BACK
    APP --> SOCKET
```

Repo hiện mô tả Docker gồm App + MySQL 8 + Poste.io, cùng PM2/Nginx cho deployment. citeturn524105view1

---

# 17. SƠ ĐỒ 10 — ARCHITECTURE DIAGRAM

## 17.1. Kiến trúc phân lớp

```mermaid
flowchart TB
    A["Presentation Layer<br/>React / Tailwind / Router"]
    B["Application Layer<br/>API / Auth / Workflow / Business Rules"]
    C["Domain Layer<br/>Organization / Task / Project / Sales / EPC / O&M"]
    D["Data Access Layer<br/>SQL / Repository / Services"]
    E["Infrastructure<br/>MySQL / Files / Socket.io / Email / Gemini"]

    A --> B
    B --> C
    C --> D
    D --> E
```

## 17.2. Kiến trúc nghiệp vụ

```text
                    BAN GIÁM ĐỐC
                          │
                   COMPANY KPI
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
     ORGANIZATION       WORK             CONTROL
        │                 │                 │
 Department/Team      Task/Project     Role/Permission
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    WORKFLOW ENGINE
                          │
              ┌───────────┼────────────┐
              │           │            │
           Request      Approval      SLA
              │           │            │
              └───────────┼────────────┘
                          │
                     REPORT / KPI
```

---

# 18. SƠ ĐỒ 11 — QUAN HỆ GIỮA CÁC PHÒNG BAN

```mermaid
flowchart LR
    SALES["KINH DOANH"]
    ENG["KỸ THUẬT"]
    EPC["DỰ ÁN / EPC"]
    PROC["MUA HÀNG"]
    WH["KHO & LOGISTICS"]
    OM["O&M / BẢO HÀNH"]
    CS["CSKH"]

    FIN["TÀI CHÍNH"]
    HR["HCNS"]
    IT["IT"]
    MKT["MARKETING"]
    LEGAL["PHÁP CHẾ"]
    DIR["BAN GIÁM ĐỐC"]

    SALES -->|"Technical Request"| ENG
    ENG -->|"Approved Design / BOM"| EPC
    EPC -->|"Purchase Request"| PROC
    PROC -->|"PO / Delivery"| WH
    WH -->|"Material"| EPC
    EPC -->|"Commissioning / Handover"| OM
    OM -->|"Service Status"| CS
    CS -->|"Customer Feedback / Request"| SALES
    CS -->|"Service Ticket"| OM

    SALES -->|"Contract / Revenue Data"| FIN
    EPC -->|"Project Cost"| FIN
    PROC -->|"PO / AP"| FIN
    WH -->|"Inventory Value"| FIN

    HR -->|"People / Organization"| DIR
    IT -->|"System / Security"| DIR
    MKT -->|"Leads / Brand"| SALES
    LEGAL -->|"Contract Review"| SALES
    LEGAL -->|"Contract Review"| PROC
    LEGAL -->|"Legal Support"| EPC

    DIR -->|"Goals / Approval / KPI"| SALES
    DIR -->|"Goals / Approval / KPI"| ENG
    DIR -->|"Goals / Approval / KPI"| EPC
    DIR -->|"Goals / Approval / KPI"| FIN
```

---

# 19. SƠ ĐỒ 12 — END-TO-END BUSINESS PROCESS

Đây là sơ đồ nên đặt ở đầu phần phân tích nghiệp vụ.

```text
                         ┌─────────────────┐
                         │   BAN GIÁM ĐỐC  │
                         │ KPI / APPROVAL  │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    KINH DOANH   │
                         │ CRM / LEAD /    │
                         │ QUOTATION        │
                         └────────┬────────┘
                                  │
                           Technical Request
                                  ▼
                         ┌─────────────────┐
                         │    KỸ THUẬT     │
                         │ SURVEY / DESIGN │
                         │ BOM / REVIEW    │
                         └────────┬────────┘
                                  │
                           Approved Package
                                  ▼
                         ┌─────────────────┐
                         │     EPC         │
                         │ PROJECT / SITE  │
                         │ QAQC / HSE      │
                         └───────┬─┬───────┘
                                 │ │
                  Purchase       │ │ Materials
                                 │ │
                                 ▼ ▼
                           ┌──────────────┐
                           │ MUA HÀNG     │
                           └──────┬───────┘
                                  │
                                 PO
                                  ▼
                           ┌──────────────┐
                           │ KHO/LOGISTICS│
                           └──────┬───────┘
                                  │
                              Delivery
                                  ▼
                               EPC
                                  │
                           Commissioning
                                  ▼
                           ┌──────────────┐
                           │ O&M/WARRANTY │
                           └──────┬───────┘
                                  │
                                  ▼
                               CSKH
```

Phòng hỗ trợ:

```text
              ┌──────────┐
              │ FINANCE  │
              └────┬─────┘
                   │
              toàn bộ hoạt động

              ┌──────────┐
              │   HR     │
              └────┬─────┘
                   │
              nhân sự / tổ chức

              ┌──────────┐
              │   IT     │
              └────┬─────┘
                   │
              hệ thống / bảo mật

              ┌──────────┐
              │ MARKETING│──→ LEAD / BRAND
              └──────────┘

              ┌──────────┐
              │  LEGAL   │──→ CONTRACT
              └──────────┘
```

---

# 20. TRẠNG THÁI CÔNG VIỆC

```text
BACKLOG
   ↓
TODO
   ↓
IN PROGRESS
   ├── BLOCKED
   └── WAITING
   ↓
REVIEW
   ↓
APPROVED
   ↓
DONE
```

Nhánh hủy:

```text
ANY STATE → CANCELLED
```

---

# 21. MÔ HÌNH PHÊ DUYỆT

```text
Employee / Department
          │
          ▼
    Request / Task
          │
          ▼
    Pending Approval
          │
      ┌───┴────┐
      ▼        ▼
   Approved  Rejected
      │        │
      ▼        ▼
 Next Step   Revision
```

Approval được dùng cho:
- Báo giá.
- Chiết khấu.
- Mua hàng.
- Thanh toán.
- Hợp đồng.
- Kỹ thuật.
- Dự án.
- Nghỉ phép.
- Quyền truy cập.

---

# 22. MÔ HÌNH PHÂN QUYỀN

```text
USER
 │
 ├── ROLE
 │     │
 │     └── PERMISSION
 │
 ├── DEPARTMENT SCOPE
 │
 ├── TEAM SCOPE
 │
 └── PROJECT SCOPE
```

### Ma trận cấp quyền

| Cấp | Scope |
|---|---|
| Employee | Own / Assigned |
| Team Leader | Team |
| Department Manager | Department |
| Project Manager | Project |
| Director | Company |
| Admin | System |

---

# 23. LIÊN KẾT CÁC CHỨC NĂNG HIỆN TẠI VỚI KIẾN TRÚC MỚI

Repository hiện có service/frontend và route/backend tương ứng cho task, contract, project, report, revenue, note, user, meeting, product, document, client, department, role, AI; đây là nền tảng để mở rộng thay vì viết lại. citeturn524105view2

| Chức năng hiện tại | Kiến trúc mới |
|---|---|
| Tasks | Task + Department + Team + Project + Workflow |
| Departments | Organization |
| Users | User + Department + Team + Position |
| Roles | RBAC + Scope |
| Projects | Cross-department Project |
| Contracts | Sales + Finance + Legal |
| Products | Warehouse + Procurement |
| Reports | Department/Team/Project KPI |
| Revenue | Finance + Sales |
| Documents | Document Control |
| Meetings | Collaboration |
| Mail | Communication |
| Notifications | Workflow / SLA |
| Activity | Audit |
| AI | Cross-module Assistant |

Repo hiện đã có permission như `manage_users`, `view_all_tasks`, `manage_dept_tasks`, `view_own_tasks`, `view_all_reports`, `approve_dept_reports`, `create_report`, `manage_meetings`, `create_revenue_report`, `approve_dept_revenue`, `manage_warehouse`, `view_dept_users`; mô hình mới nên giữ và mở rộng các quyền này thành permission có scope. citeturn524105view3

---

# 24. CÁC MODULE CHÍNH CỦA TRANLE TASKS

```text
1. Authentication
2. Organization
3. Departments
4. Teams
5. Positions
6. Users
7. Roles
8. Permissions
9. Tasks
10. Requests
11. Approvals
12. Projects
13. Milestones
14. Customers
15. Sales
16. Quotations
17. Contracts
18. Procurement
19. Warehouse
20. Logistics
21. O&M
22. Warranty
23. CSKH
24. Finance
25. HR
26. Marketing
27. IT
28. Legal
29. Documents
30. Calendar
31. Meetings
32. Mail
33. Notifications
34. Reports
35. KPI
36. Audit
37. AI Assistant
```

---

# 25. PHÂN TÍCH DỮ LIỆU CỐT LÕI

## Organization

```text
Company
Department
Team
Position
User
Role
Permission
```

## Work

```text
Task
Subtask
Checklist
Comment
Attachment
Task History
Request
Approval
```

## Business

```text
Customer
Lead
Opportunity
Quotation
Contract
Supplier
Purchase Request
Purchase Order
Product
Warehouse
Asset
Service Ticket
Warranty
```

## Project

```text
Project
Project Department
Project Member
Milestone
Project Task
Project Document
Project Report
```

## Communication

```text
Mail
Meeting
Event
Notification
Activity
```

---

# 26. YÊU CẦU PHI CHỨC NĂNG

## Security
- JWT Authentication.
- Role-based access control.
- Department/Team/Project scope.
- Backend authorization.
- Password security.
- Audit log.
- File access control.

## Performance
- Pagination.
- Search.
- Filter.
- Indexed queries.
- React Query cache.
- Realtime updates bằng Socket.io.

## Reliability
- Database backup.
- Migration.
- Error handling.
- Logging.
- Retry cho integration.

## UX
- Responsive.
- Mobile friendly.
- Accessible.
- Clear status.
- Consistent design system.
- Department-specific navigation.

## Maintainability
- Reusable components.
- Domain services.
- Validation.
- TypeScript.
- API contracts.
- Migration scripts.

---

# 27. SƠ ĐỒ TRIỂN KHAI PHÂN QUYỀN

```text
Login
  ↓
JWT
  ↓
Load User Context
  ↓
Department
  ↓
Team
  ↓
Role
  ↓
Permissions
  ↓
Scope
  ↓
Dashboard
  ↓
API Authorization
  ↓
Resource Access
```

---

# 28. SƠ ĐỒ DỮ LIỆU TRONG MỘT CÔNG VIỆC

```text
USER
 ↓
DEPARTMENT
 ↓
TEAM
 ↓
PROJECT
 ↓
MILESTONE
 ↓
TASK
 ├── SUBTASK
 ├── CHECKLIST
 ├── COMMENT
 ├── ATTACHMENT
 ├── APPROVAL
 └── HISTORY
 ↓
RESULT
 ↓
REPORT
 ↓
KPI
```

---

# 29. DANH SÁCH SƠ ĐỒ ĐƯA VÀO BÁO CÁO

## Bộ 9 sơ đồ khuyến nghị

```text
1. Context Diagram
2. Use Case Diagram
3. Activity Diagram
4. Sequence Diagram
5. Class Diagram
6. ERD
7. DFD Level 0
8. DFD Level 1
9. Architecture Diagram
```

## Có thể bổ sung

```text
10. DFD Level 2
11. Component Diagram
12. Deployment Diagram
13. Organization Diagram
14. Business Process Diagram
15. Permission Matrix
```

---

# 30. ĐỐI CHIẾU GIỮA CÁC SƠ ĐỒ

| Nghiệp vụ | Use Case | Activity | Sequence | Class | ERD |
|---|---:|---:|---:|---:|---:|
| Đăng nhập | ✅ | ✅ | ✅ | User/Role | User/Role |
| Tạo Task | ✅ | ✅ | ✅ | Task/User | Task |
| Giao Task | ✅ | ✅ | ✅ | Task/User | Task_Assignee |
| Duyệt Task | ✅ | ✅ | ✅ | Approval | Approval |
| Quản lý phòng | ✅ | ✅ | ✅ | Department | Department |
| Quản lý Project | ✅ | ✅ | ✅ | Project | Project |
| Sales → Engineering | ✅ | ✅ | ✅ | Request | Department_Request |
| Procurement | ✅ | ✅ | ✅ | Supplier/PO | Procurement |
| Warehouse | ✅ | ✅ | ✅ | Inventory | Inventory |
| O&M | ✅ | ✅ | ✅ | Ticket/Asset | Ticket/Asset |
| Báo cáo KPI | ✅ | ✅ | ✅ | Report/KPI | Report/KPI |

---

# 31. KẾT LUẬN THIẾT KẾ

TranLe Tasks nên được thiết kế theo mô hình:

```text
                         TRANLE TASKS
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
  ORGANIZATION              WORK                  CONTROL
       │                      │                      │
 Department                Task                   Role
 Team                     Project               Permission
 Position                 Request                 Scope
 User                    Milestone
       │                      │
       └──────────────────────┼──────────────────────┘
                              │
                     WORKFLOW ENGINE
                              │
                ┌─────────────┼─────────────┐
                │             │             │
             Approval         SLA        Notification
                │             │             │
                └─────────────┼─────────────┘
                              │
                         REPORT / KPI
```

Core business chain:

```text
Customer
 ↓
Sales
 ↓
Engineering
 ↓
EPC
 ↓
Procurement
 ↓
Warehouse / Logistics
 ↓
Construction
 ↓
Commissioning
 ↓
Handover
 ↓
O&M / Warranty
 ↓
CSKH
```

Support:

```text
Finance
HR
IT
Marketing
Legal
```

---

# 32. CHỈ DẪN CHO AI XÂY DỰNG HỆ THỐNG

```text
AI MUST:

1. Đọc repository trước khi sửa code.
2. Đối chiếu phan_tich.MD.
3. Đối chiếu TRANLE_DESIGN_SYSTEM.md.
4. Đọc tài liệu này trước khi thiết kế.
5. Không rewrite toàn bộ nếu module hiện tại có thể tái sử dụng.
6. Tìm toàn bộ nơi đang dùng department dạng string.
7. Migrate sang departmentId.
8. Thêm Team / Position / Manager.
9. Xây RBAC + Department/Team/Project Scope.
10. Xây Department Request.
11. Xây Approval Engine.
12. Bổ sung workflow theo phòng.
13. Bổ sung dashboard theo role/scope.
14. Giữ các module hiện có.
15. Không xóa dữ liệu hiện tại.
16. Tạo migration.
17. Enforce authorization ở backend.
18. Test từng workflow.
19. Test regression toàn hệ thống.
20. Cuối cùng mới loại bỏ legacy dependency.
```

---

# 33. DEFINITION OF DONE

```text
[ ] Context Diagram
[ ] Use Case
[ ] Activity
[ ] Sequence
[ ] Class
[ ] ERD
[ ] DFD 0
[ ] DFD 1
[ ] DFD 2 nếu cần
[ ] Component
[ ] Deployment
[ ] Architecture

[ ] Organization
[ ] Departments
[ ] Teams
[ ] Positions
[ ] Users
[ ] Roles
[ ] Permissions
[ ] Scopes

[ ] Task
[ ] Request
[ ] Approval
[ ] Project
[ ] Milestone

[ ] Sales
[ ] Engineering
[ ] EPC
[ ] Procurement
[ ] Warehouse
[ ] O&M
[ ] CSKH
[ ] Finance
[ ] HR
[ ] IT
[ ] Marketing
[ ] Legal

[ ] Notifications
[ ] SLA
[ ] Audit
[ ] Reports
[ ] KPI

[ ] Migration
[ ] Tests
[ ] Build
[ ] Security review
```

---

# 34. MASTER PROMPT CHO CLAUDE / ANTIGRAVITY

```text
You are the lead software architect and senior full-stack engineer for TranLe Tasks.

Read these documents first:
1. phan_tich.MD
2. TRANLE_TASKS_MASTER_REBUILD.md
3. TRANLE_TASKS_DEPARTMENT_FUNCTIONAL_BLUEPRINT.md
4. TRANLE_DESIGN_SYSTEM.md
5. TRANLE_TASKS_SYSTEM_ANALYSIS_AND_DESIGN.md
6. Then inspect the complete repository.

Your goal is to refactor the current TranLe Tasks application into a department-aware company operational management system.

Do not blindly rewrite the application.

First audit:
- frontend
- backend
- database
- authentication
- permissions
- departments
- users
- tasks
- projects
- reports
- contracts
- revenue
- products
- documents
- meetings
- mail
- notifications
- AI

Use the diagrams in this document as the target analysis/design model.

Target organization:

Company
→ Department
→ Team
→ Position
→ User
→ Role
→ Permission
→ Scope

Target work model:

Customer / Project / Contract
→ Request / Ticket
→ Task / Milestone
→ Workflow
→ Approval
→ Evidence
→ Report / KPI

Each department must have:
Dashboard
Master Data
Business Modules
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

Primary business flow:

Sales
→ Engineering
→ EPC
→ Procurement
→ Warehouse
→ Construction
→ Commissioning
→ Handover
→ O&M
→ CSKH

Support:
Finance
HR
IT
Marketing
Legal

Requirements:
- Use stable IDs for relationships.
- Do not use department name as relational key.
- Backend must enforce permissions.
- Projects must support multiple participating departments.
- Tasks can belong to department/team/project/milestone.
- Cross-department requests must be first-class entities.
- Approval must be reusable.
- Existing modules must remain functional.
- Database migration must preserve existing data.
- Build each phase incrementally.
- Test after each phase.

Implementation order:
1. Organization
2. Teams/Positions
3. Users/Managers
4. Roles/Permissions/Scopes
5. Tasks/Requests/Approvals
6. Projects/Milestones
7. Department Dashboards
8. Sales
9. Engineering
10. EPC
11. Procurement
12. Warehouse
13. O&M
14. CSKH
15. Finance
16. HR
17. IT
18. Marketing
19. Legal
20. Reports/KPI/Automation/AI

For every phase:
- inspect existing implementation
- list impacted files
- implement
- migrate safely
- run tests
- run typecheck
- run build
- report database changes
- report permission changes
- report remaining risks

A feature is not complete until it is represented consistently across:
Use Case → Activity → Sequence → Class → ERD → API → UI → Database.
```

---

# 35. LƯU Ý NGUỒN

Tài liệu này kết hợp:
- **Cấu trúc repo hiện tại**.
- **Các module/API hiện có**.
- **Mô hình phòng ban mục tiêu đã thống nhất**.
- **Yêu cầu bộ sơ đồ đồ án Phân tích & Thiết kế hệ thống**.

Repository hiện xác định TranLe Tasks là nền tảng quản trị công việc, dự án năng lượng tái tạo, hợp đồng và cộng tác nội bộ; frontend dùng React 19/Vite/Tailwind/TypeScript, backend Express 5/TypeScript, MySQL 8, Socket.io và Gemini. citeturn992973view0turn524105view1

---

# END OF TRANLE TASKS SYSTEM ANALYSIS & DESIGN
