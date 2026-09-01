# TRANLE TASKS — TÀI LIỆU ĐẶC TẢ KỸ THUẬT & HƯỚNG DẪN PHÁT TRIỂN TOÀN DIỆN
## (Master Technical Specification & Development Blueprint)

> **Dự án:** TranLe Tasks — Nền Tảng Quản Lý Công Việc, Dự Án Năng Lượng Tái Tạo & Cộng Tác Nội Bộ  
> **Doanh nghiệp:** Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê (Tran Le Electricity)  
> **Mã nguồn:** Monorepo (Frontend React/Vite/Tailwind + Backend Express/TypeScript + MySQL 8 + Socket.io + Poste.io + Gemini AI)  
> **Mục tiêu tài liệu:** Đóng vai trò là **kim chỉ nam duy nhất (Single Source of Truth)** đặc tả toàn bộ nghiệp vụ, cơ sở dữ liệu, API, giao diện và luồng phát triển để đội ngũ kỹ thuật và AI triển khai hoàn thiện dự án.

---

# MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG & ĐỐI TƯỢNG VẬN HÀNH](#1-tổng-quan-hệ-thống--đối-tượng-vận-hành)
2. [CƠ CẤU TỔ CHỨC & MA TRẬN PHÂN QUYỀN (RBAC + SCOPE)](#2-cơ-cấu-tổ-chức--ma-trận-phân-quyền-rbac--scope)
3. [ĐẶC TẢ CHI TIẾT NGHIỆP VỤ 13 PHÒNG BAN](#3-đặc-tả-chi-tiết-nghiệp-vụ-13-phòng-ban)
4. [CHUỖI VÒNG ĐỜI NĂNG LƯỢNG MẶT TRỜI XUYÊN SUỐT (END-TO-END WORKFLOW)](#4-chuỗi-vòng-đời-năng-lượng-mặt-trời-xuyên-suốt-end-to-end-workflow)
5. [CẤU TRÚC GIAO DIỆN KHÔNG GIAN PHÒNG BAN (DEPARTMENT WORKSPACE ARCHITECTURE)](#5-cấu-trúc-giao-diện-không-gian-phòng-ban-department-workspace-architecture)
6. [HỆ THỐNG CƠ SỞ DỮ LIỆU & QUAN HỆ THỰC THỂ (MYSQL SCHEMA)](#6-hệ-thống-cơ-sở-dữ-liệu--quan-hệ-thực-thể-mysql-schema)
7. [HỆ THỐNG BACKEND API ENDPOINTS](#7-hệ-thống-backend-api-endpoints)
8. [QUY CHUẨN THIẾT KẾ GIAO DIỆN (TRANLE SOLAR DESIGN SYSTEM)](#8-quy-chuẩn-thiết-kế-giao-diện-tranle-solar-design-system)
9. [LỘ TRÌNH TRIỂN KHAI & TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE)](#9-lộ-trình-triển-khai--tiêu-chuẩn-hoàn-thành-definition-of-done)

---

# 1. TỔNG QUAN HỆ THỐNG & ĐỐI TƯỢNG VẬN HÀNH

TranLe Tasks được xây dựng nhằm mục tiêu chuyển đổi số toàn diện hoạt động sản xuất kinh doanh của **Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê**, doanh nghiệp hàng đầu về:
* Tổng thầu EPC công trình điện mặt trời mái nhà công nghiệp, trang trại và thương mại (C&I).
* Phân phối chính hãng tấm quang điện hiệu suất cao **AIKO Solar**, biến tần **SAJ / Huawei**, pin lưu trữ BESS **Dyness**.
* Trung tâm Dịch vụ Kỹ thuật & Bảo hành ủy quyền SAJ tại Việt Nam (**SAJ Service Center**).
* Dịch vụ Vận hành & Bảo dưỡng định kỳ (**O&M**) nhà máy năng lượng tái tạo.

### Nguyên lý thiết kế cốt lõi:
1. **Phân tách thực thể dữ liệu:** Dữ liệu nghiệp vụ (Dự án, Báo giá, Hợp đồng, Đơn mua hàng, Phiếu kho, Ticket sự cố) có bảng quản lý riêng biệt; **Task** là công cụ phân công và theo dõi việc thực thi; **Department Request** là cầu nối luân chuyển liên phòng ban.
2. **Khóa quan hệ định danh bền vững:** Tất cả liên kết trong hệ thống bắt buộc sử dụng mã định danh `departmentId`, `teamId`, `positionId`, `projectId`, `userId` — tuyệt đối không dùng tên chuỗi văn bản làm khóa quan hệ.
3. **Phân quyền theo phạm vi (Scoped Authorization):** Kiểm soát truy cập chặt chẽ ngay từ tầng Backend middleware theo vai trò và phạm vi tổ chức (Cá nhân, Team, Phòng ban, Toàn công ty).

---

# 2. CƠ CẤU TỔ CHỨC & MA TRẬN PHÂN QUYỀN (RBAC + SCOPE)

### 2.1. Cấu trúc 5 Cấp bậc Tổ chức:
```text
CÔNG TY (Company)
 └── PHÒNG BAN (Department - 13 phòng)
      └── ĐỘI NHÓM CHUYÊN MÔN (Team - 21 teams)
           └── CHỨC DANH (Position - Cấp bậc 1 đến 5)
                └── NHÂN SỰ (User - Tài khoản đăng nhập)
```

### 2.2. Danh Mục 13 Phòng Ban Chuẩn Hóa:
1. `dept-exec`: **Ban Giám Đốc** (EXEC)
2. `dept-sales`: **Phòng Kinh Doanh** (SALES)
3. `dept-eng`: **Phòng Kỹ Thuật Solar** (ENG)
4. `dept-epc`: **Khối Tổng Thầu EPC & Thi Công** (EPC)
5. `dept-om`: **Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center** (OM)
6. `dept-proc`: **Phòng Mua Hàng & Cung Ứng** (PROC)
7. `dept-wh`: **Phòng Kho & Logistics** (WH)
8. `dept-mkt`: **Phòng Marketing & Truyền Thông** (MKT)
9. `dept-cs`: **Phòng Chăm Sóc Khách Hàng** (CS)
10. `dept-fin`: **Phòng Tài Chính – Kế Toán** (FIN)
11. `dept-hr`: **Phòng Hành Chính – Nhân Sự** (HR)
12. `dept-it`: **Phòng IT & Chuyển Đổi Số** (IT)
13. `dept-legal`: **Phòng Pháp Chế & Hợp Đồng** (LEGAL)

### 2.3. Ma Trận Vai Trò & Quyền Hạn (Roles & Scopes):
| Vai trò (Role) | Mã Hệ Thống | Cấp bậc | Phạm vi truy cập (Scope) | Quyền hạn chính |
| :--- | :--- | :---: | :--- | :--- |
| **Admin** | `role-admin` | 5 | Toàn hệ thống (System) | Toàn quyền cấu hình, tài khoản, vai trò, bảo mật, sao lưu |
| **Director** | `role-director` | 5 | Toàn công ty (Company) | Xem báo cáo toàn diện, phê duyệt cấp cao, quyết định điều hành |
| **Manager (Trưởng Phòng)** | `role-manager` | 4 | Phòng ban (Department) | Quản lý việc phòng, phân công, duyệt báo cáo phòng, quản lý team |
| **Phó Phòng (Deputy Manager)**| `role-deputy-manager` | 3 | Phòng ban (Department) | Hỗ trợ điều hành, quản lý task phòng, duyệt báo cáo chuyên môn |
| **Trưởng Nhóm (Team Leader)** | `role-manager` / Level 3 | 3 | Đội nhóm (Team) | Giao task cho team viên, review kết quả, theo dõi tiến độ team |
| **Employee (Kỹ sư / Nhân viên)**| `role-employee` | 2 | Cá nhân (Own/Assigned) | Nhận việc, cập nhật tiến độ, nộp báo cáo, gửi phiếu yêu cầu |

---

# 3. ĐẶC TẢ CHI TIẾT NGHIỆP VỤ 13 PHÒNG BAN

---

### 1. Ban Giám Đốc (`dept-exec`)
* **Nghiệp vụ cốt lõi:** Quản trị chiến lược, giám sát KPI tăng trưởng doanh thu MWp, kiểm soát rủi ro và phê duyệt chủ trương lớn.
* **Module & Dữ liệu chuyên sâu:**
  - `Executive Dashboard`: Biểu đồ doanh thu lũy kế, lợi nhuận gộp theo từng khối, dòng tiền ra/vào và sản lượng đóng điện (MWp).
  - `Company Portfolio`: Bảng tiến độ tổng thể các dự án EPC trọng điểm cấp quốc gia và hợp đồng phân phối.
  - `Decision & Escalation Center`: Tiếp nhận và giải quyết các vấn đề nghẽn được các phòng ban đệ trình vượt thẩm quyền.
  - `Executive Actions`: Biên bản họp giao ban HĐQT và phân bổ mục tiêu kế hoạch (OKRs/KPIs) cho 12 phòng ban.

---

### 2. Phòng Kinh Doanh (`dept-sales`)
* **Nghiệp vụ cốt lõi:** Quản lý phễu khách hàng B2B, dự án điện mặt trời mái nhà xưởng, phát triển kênh phân phối đại lý tấm pin AIKO và biến tần SAJ.
* **Module & Dữ liệu chuyên sâu:**
  - `CRM & Pipeline`: 6 giai đoạn bán hàng (*Lead ➔ Khảo sát ➔ Báo giá ➔ Đàm phán ➔ Ký hợp đồng ➔ Chuyển giao EPC*).
  - `Quotations & Price Book`: Bảng tính giá chi tiết kèm mức chiết khấu theo phân cấp khách hàng.
  - `Sales Target & Commission`: Đo lường doanh số thực tế so với chỉ tiêu tháng/quý và tính hoa hồng kinh doanh.
  - `Competitor Analysis & Lost Reasons`: Thống kê nguyên nhân trượt thầu và dữ liệu giải pháp đối thủ.
* **Chuyển giao liên phòng:** Gửi *Technical Request* sang Phòng Kỹ Thuật; Gửi *Contract Review* sang Pháp Chế; Gửi *Project Handover* sang Khối EPC.

---

### 3. Phòng Kỹ Thuật Solar (`dept-eng`)
* **Nghiệp vụ cốt lõi:** Khảo sát hiện trường mái xưởng, mô phỏng 3D PVSyst, bóc tách dự toán vật tư BOM/BOQ, thiết kế tủ điện AC/DC và trạm biến áp.
* **Module & Dữ liệu chuyên sâu:**
  - `Technical Request Queue`: Hàng đợi xử lý yêu cầu kỹ thuật tiếp nhận từ Kinh Doanh và CSKH.
  - `PVSyst Simulations & Calculations`: Báo cáo phân tích sản lượng điện dự kiến (Specific Yield, PR ratio, tổn hao đổ bóng Shading Analysis).
  - `Design Package Repository`: Bộ hồ sơ bản vẽ kỹ thuật (Layout bố trí tấm pin, Sơ đồ nguyên lý 1 sợi SLD, Bảng kéo rải cáp Cable Schedule).
  - `Datasheet & Compatibility Library`: Thư viện thông số kỹ thuật tấm pin AIKO N-Type, biến tần SAJ chuỗi String/Hybrid và tính tương thích inverter-pin.
* **Chuyển giao liên phòng:** Xuất bộ hồ sơ kỹ thuật đã duyệt (*Approved Design & BOM*) cho Khối EPC và Phòng Mua Hàng.

---

### 4. Khối Tổng Thầu EPC & Thi Công (`dept-epc`)
* **Nghiệp vụ cốt lõi:** Quản lý toàn diện công trường xây lắp điện mặt trời, tiến độ Gantt Chart, kiểm soát chất lượng QA/QC và an toàn lao động HSE.
* **Module & Dữ liệu chuyên sâu:**
  - `Project Gantt & Milestone Tracking`: Theo dõi tiến độ từng hạng mục (Khung kết cấu ➔ Gá pin ➔ Đấu nối chuỗi String ➔ Tủ điện & Inverter ➔ Thử nghiệm đóng điện).
  - `Daily Site Reports`: Nhật trình thi công hàng ngày kèm quân số, thời tiết, khối lượng đạt được và hình ảnh hiện trường.
  - `QA/QC Inspection & Punch List`: Biên bản kiểm tra vật tư đầu vào, đo điện trở nối đất chống sét (< 4Ω), đo Megger cách điện dây DC và bảng khắc phục lỗi (Punch List).
  - `HSE Safety Management`: Kế hoạch an toàn, biên bản họp an toàn đầu giờ (Toolbox Meeting), cấp phát bảo hộ PPE, nhật ký sự cố/suýt sự cố (Near Miss).
* **Chuyển giao liên phòng:** Gửi *Purchase Request (PR)* sang Mua Hàng; Gửi yêu cầu xuất kho sang Phòng Kho; Bàn giao nghiệm thu (*Handover*) sang Trung tâm O&M.

---

### 5. Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center (`dept-om`)
* **Nghiệp vụ cốt lõi:** Vận hành từ xa qua hệ thống SCADA/IoT, bảo dưỡng định kỳ (vệ sinh pin, kiểm tra siết lực ngàm) và trạm bảo hành ủy quyền biến tần SAJ tại Việt Nam.
* **Module & Dữ liệu chuyên sâu:**
  - `Sites & Asset Management`: Danh mục nhà máy đang vận hành kèm số Serial Number từng inverter SAJ, tủ điện và chuỗi pin.
  - `O&M Maintenance Schedules`: Lịch bảo dưỡng định kỳ, lịch quét nhiệt hồng ngoại FLIR kiểm tra Hotspot tấm pin.
  - `Service Tickets & SLA`: Tiếp nhận và xử lý sự cố lỗi kỹ thuật (Mã lỗi biến tần, chạm đất PV Iso-Low, quá nhiệt Over-temp...).
  - `RMA & Warranty Claims`: Phiếu tiếp nhận bảo hành, biên bản kiểm tra chẩn đoán bo mạch công suất IGBT, thay linh kiện SAJ chính hãng.
* **Chuyển giao liên phòng:** Cập nhật kết quả sự cố cho *CSKH*; Gửi yêu cầu xuất linh kiện thay thế sang *Phòng Kho*.

---

### 6. Phòng Mua Hàng & Cung Ứng (`dept-proc`)
* **Nghiệp vụ cốt lõi:** Quản trị chuỗi cung ứng vật tư năng lượng, đàm phán hợp đồng nhập khẩu tấm pin AIKO, biến tần SAJ, phụ kiện nhôm và dây cáp chuyên dụng solar.
* **Module & Dữ liệu chuyên sâu:**
  - `Purchase Request (PR) Queue`: Tiếp nhận yêu cầu mua sắm từ các công trình EPC và linh kiện bảo hành O&M.
  - `RFQ & Quotation Comparison`: Bảng so sánh đa chiều các nhà cung cấp (Giá bán, điều khoản thanh toán, thời gian giao hàng ETA, chứng chỉ CO/CQ).
  - `Purchase Orders (PO)`: Đơn đặt hàng chính thức, theo dõi lộ trình vận chuyển quốc tế và nội địa.
  - `Supplier Relationship Management (SRM)`: Hồ sơ nhà cung cấp, đánh giá chất lượng và lịch sử giao hàng.
* **Chuyển giao liên phòng:** Bàn giao thông tin lô hàng về cho *Phòng Kho*; Chuyển hồ sơ đề nghị thanh toán cho *Phòng Kế Toán*.

---

### 7. Phòng Kho & Logistics (`dept-wh`)
* **Nghiệp vụ cốt lõi:** Quản lý mạng lưới kho bãi 3 miền (Hà Nội, Đà Nẵng, TP.HCM), bảo quản thiết bị, quản lý mã Serial Number và điều phối phương tiện giao nhận.
* **Module & Dữ liệu chuyên sâu:**
  - `Warehouse & Bin Locations`: Quản lý sơ đồ vị trí kho, số lượng tồn kho khả dụng theo từng kho hàng.
  - `Serial Number Tracking`: Quản lý vết từng Serial Number tấm pin AIKO và biến tần SAJ từ lúc nhập kho ➔ xuất công trình ➔ kích hoạt bảo hành.
  - `Inbound / Outbound / Transfer`: Lập phiếu nhập kho, phiếu xuất kho thi công và phiếu điều chuyển kho nội bộ.
  - `Delivery Orders & Logistics`: Lịch trình điều xe tải, theo dõi lộ trình vận chuyển và biên bản giao nhận hàng hóa tại công trình.
* **Chuyển giao liên phòng:** Cung cấp số liệu tồn kho thực tế cho *Phòng Kinh Doanh* và *Phòng Mua Hàng*.

---

### 8. Phòng Marketing & Truyền Thông (`dept-mkt`)
* **Nghiệp vụ cốt lõi:** Xây dựng thương hiệu Năng Lượng Xanh Trần Lê, sản xuất nội dung số, tổ chức sự kiện/hội thảo năng lượng và tạo nguồn khách hàng tiềm năng.
* **Module & Dữ liệu chuyên sâu:**
  - `Content Calendar & Editorial Workflow`: Quản lý bài viết theo quy trình: *Ý tưởng ➔ Viết bài ➔ Thiết kế đồ họa ➔ Duyệt ➔ Đăng bài ➔ Đo lường*.
  - `Campaigns & Lead Acquisition`: Đo lường hiệu quả chiến dịch truyền thông, chuyển đổi khách hàng tiềm năng (Leads) qua Website/Mạng xã hội.
  - `Media Asset Library`: Kho tư liệu ảnh công trình thực tế, video flycam chất lượng cao, tài liệu catalog và hồ sơ năng lực công ty.
* **Chuyển giao liên phòng:** Bàn giao dữ liệu Lead về cho *Phòng Kinh Doanh*.

---

### 9. Phòng Chăm Sóc Khách Hàng (`dept-cs`)
* **Nghiệp vụ cốt lõi:** Đầu mối giao tiếp trực tiếp 24/7 với khách hàng, hỗ trợ giám sát sản lượng điện qua app eSolar, tiếp nhận khiếu nại và đo lường sự hài lòng CSAT.
* **Module & Dữ liệu chuyên sâu:**
  - `Customer 360 Profile`: Xem toàn bộ thông tin dự án, cấu hình hệ thống, lịch sử tương tác và các phiếu hỗ trợ trước đây của khách hàng.
  - `CSKH Tickets & SLA`: Tiếp nhận cuộc gọi, phân loại ticket (Hỗ trợ app, Khiếu nại, Yêu cầu bảo hành) và giám sát thời gian xử lý SLA.
  - `CSAT Surveys`: Phiếu khảo sát tự động đánh giá mức độ hài lòng sau khi hoàn thành dự án hoặc xử lý sự cố.
* **Chuyển giao liên phòng:** Chuyển ticket sự cố kỹ thuật sang *O&M SAJ Center*; Chuyển nhu cầu lắp thêm sang *Phòng Kinh Doanh*.

---

### 10. Phòng Tài Chính – Kế Toán (`dept-fin`)
* **Nghiệp vụ cốt lõi:** Quản trị dòng tiền công ty, kế toán giá thành dự án EPC, quản lý công nợ khách hàng và thanh quyết toán hợp đồng.
* **Module & Dữ liệu chuyên sâu:**
  - `Accounts Receivable (AR) & Aging`: Sổ theo dõi công nợ khách hàng, các mốc thanh toán theo hợp đồng và cảnh báo nợ quá hạn.
  - `Project Costing & Profit Margin`: Báo cáo phân tích chi phí từng dự án (Vật tư pin/inverter, khung giàn, nhân công, vận chuyển ➔ Tỷ suất lợi nhuận).
  - `Payment Approvals & Cash Flow`: Quản lý phiếu đề nghị chi, phê duyệt thanh toán cho nhà cung cấp và dự báo dòng tiền.
* **Chuyển giao liên phòng:** Đối soát khối lượng nghiệm thu với *Khối EPC*; Xác nhận hoàn tất tài chính để xuất hóa đơn và bàn giao.

---

### 11. Phòng Hành Chính – Nhân Sự (`dept-hr`)
* **Nghiệp vụ cốt lõi:** Hoạch định nhân lực, tuyển dụng kỹ sư điện/năng lượng, đào tạo an toàn lao động, quản lý chấm công, phép năm và văn hóa doanh nghiệp.
* **Module & Dữ liệu chuyên sâu:**
  - `Recruitment Pipeline`: Phễu tuyển dụng ứng viên (Nộp hồ sơ ➔ Phỏng vấn ➔ Test chuyên môn ➔ Gửi Offer).
  - `Onboarding Workflow`: Quy trình tiếp nhận nhân sự mới (Tạo email doanh nghiệp, cấp tài khoản TranLe Tasks, cấp đồ bảo hộ PPE, đào tạo nội bộ).
  - `Time-off & Performance Reviews`: Quản lý đơn nghỉ phép, công tác hiện trường và đánh giá hiệu suất KPI nhân sự hàng tháng.
* **Chuyển giao liên phòng:** Cung cấp số liệu nhân sự cho *Ban Giám Đốc*; Phối hợp với *IT* cấp quyền hệ thống.

---

### 12. Phòng IT & Chuyển Đổi Số (`dept-it`)
* **Nghiệp vụ cốt lõi:** Quản trị nền tảng công nghệ TranLe Tasks, máy chủ mail nội bộ, an toàn thông tin, bảo trì máy tính/phần mềm và hỗ trợ người dùng (Helpdesk).
* **Module & Dữ liệu chuyên sâu:**
  - `IT Helpdesk Tickets`: Phiếu yêu cầu từ nhân viên (Cấp tài khoản, cài phần mềm PVSyst/AutoCAD, cấu hình VPN/Mail).
  - `Incident Management`: Quản lý sự cố công nghệ thông tin phân cấp từ P1 (Khẩn cấp) đến P4 (Thấp).
  - `Device & Asset Register`: Quản lý danh mục máy tính xách tay, thiết bị đo kiểm, máy in và bản quyền phần mềm cấp phát cho nhân viên.
  - `System Backup & Security`: Nhật ký sao lưu cơ sở dữ liệu MySQL tự động và kiểm tra nhật ký truy cập hệ thống.

---

### 13. Phòng Pháp Chế & Hợp Đồng (`dept-legal`)
* **Nghiệp vụ cốt lõi:** Thẩm định pháp lý, soạn thảo và rà soát các hợp đồng EPC quy mô lớn, hợp đồng đại lý, thủ tục đấu nối thỏa thuận với EVN.
* **Module & Dữ liệu chuyên sâu:**
  - `Contract Register & Repository`: Sổ theo dõi toàn bộ hợp đồng kinh tế của công ty kèm trạng thái hiệu lực và ngày hết hạn.
  - `Legal Review Workflow`: Quy trình thẩm định hợp đồng: *Soạn thảo ➔ Pháp chế rà soát ➔ Trình duyệt ➔ Ký kết ➔ Theo dõi thực hiện*.
  - `Regulatory & Compliance Archive`: Thư viện văn bản pháp luật ngành điện lực, tiêu chuẩn PCCC và thủ tục đấu nối lưới điện quốc gia.

---

# 4. CHUỖI VÒNG ĐỜI NĂNG LƯỢNG MẶT TRỜI XUYÊN SUỐT (END-TO-END WORKFLOW)

Hệ thống TranLe Tasks vận hành liền mạch qua chuỗi giá trị 10 giai đoạn:

```text
[1. KHÁCH HÀNG / LEADS]
       │
       ▼
[2. PHÒNG KINH DOANH] ──(Tư vấn sơ bộ, tạo Lead)
       │
       ├──► [PHIẾU YÊU CẦU: Technical Request]
       ▼
[3. PHÒNG KỸ THUẬT SOLAR] ──(Khảo sát mái, Mô phỏng PVSyst 3D, Bóc BOM)
       │
       ├──► [PHIẾU DUYỆT: Technical Approval]
       ▼
[4. PHÒNG KINH DOANH] ──(Lập Báo giá, Đàm phán, Ký Hợp đồng EPC)
       │
       ├──► [HỢP ĐỒNG KÝ KẾT & TẠM ỨNG ĐỢT 1]
       ▼
[5. KHỐI TỔNG THẦU EPC] ──(Khởi tạo Dự án, Lập tiến độ Gantt, Tổ chức công trường)
       │
       ├──► [PHIẾU YÊU CẦU: Purchase Request - PR]
       ▼
[6. PHÒNG MUA HÀNG] ──(Lập Đơn mua PO, Đàm phán nhà cung cấp AIKO/SAJ)
       │
       ├──► [LỊCH GIAO HÀNG VẬT TƯ]
       ▼
[7. PHÒNG KHO & LOGISTICS] ──(Nhập kho, Quét Serial QC, Xuất hàng tới công trình)
       │
       ▼
[8. KHỐI TỔNG THẦU EPC] ──(Thi công khung giàn/pin/inverter, HSE, Đo Megger, Đóng điện)
       │
       ├──► [BIÊN BẢN NGHIỆM THU ĐÓNG ĐIỆN & BÀN GIAO]
       ▼
[9. TRUNG TÂM O&M SAJ CENTER] ──(Giám sát SCADA 24/7, Bảo dưỡng định kỳ, Bảo hành SAJ)
       │
       ▼
[10. PHÒNG CHĂM SÓC KHÁCH HÀNG] ──(Tiếp nhận Hotline, Hỗ trợ app eSolar, Đo CSAT)
```

---

# 5. CẤU TRÚC GIAO DIỆN KHÔNG GIAN PHÒNG BAN (DEPARTMENT WORKSPACE ARCHITECTURE)

Mọi phòng ban được hiển thị qua trang chuẩn `/department-workspace` với **11 phân khu trực quan**:

### 5.1. Dashboard Tổng Quan & Thống Kê Nhanh:
* Hiển thị 4 thẻ chỉ số nhanh: **Tổng công việc**, **Hoàn thành**, **Đang xử lý**, **Quá hạn / Cần chú ý**.
* Tỷ lệ hoàn thành đúng hạn (SLA %) và biểu đồ phân bổ tải việc nhân sự trong phòng.

### 5.2. Hàng Đợi Công Việc (Work Queue - 8 Bộ Lọc Thông Minh):
1. `ALL`: Tất cả công việc của phòng.
2. `MY_TASKS`: Việc được phân công cho chính tôi.
3. `TEAM_TASKS`: Việc của đội nhóm chuyên môn.
4. `UNASSIGNED`: Việc chưa có người nhận trách nhiệm.
5. `DUE_TODAY`: Việc phải hoàn thành trong ngày hôm nay.
6. `OVERDUE`: Việc đã quá hạn (báo động đỏ).
7. `BLOCKED`: Việc đang bị tắc nghẽn chờ gỡ vướng.
8. `PENDING_APPROVAL`: Việc đã hoàn thành đang chờ Trưởng/Phó phòng duyệt.

### 5.3. Hộp Yêu Cầu Liên Phòng (Cross-department Request Box):
* **Tab Yêu cầu đến (Incoming):** Các phiếu yêu cầu từ phòng khác gửi sang phòng mình ➔ Có nút **"1-Click Chuyển Đổi Thành Task"** tự động gán cho nhân sự phòng xử lý.
* **Tab Yêu cầu gửi đi (Outgoing):** Theo dõi tiến độ xử lý các phiếu mình đã gửi sang phòng khác kèm trạng thái và thời gian SLA.

### 5.4. Trung Tâm Mẫu Quy Trình (Task Templates Engine):
* Cho phép Trưởng/Phó phòng sinh hàng loạt công việc mẫu theo chuẩn quy trình ngành Solar chỉ bằng **1 Cú Nhấp Chuột** (Ví dụ: Mẫu khảo sát PVSyst 100kWp, Mẫu nghiệm thu đóng điện 1MWp, Mẫu bảo trì quét nhiệt FLIR...).

---

# 6. HỆ THỐNG CƠ SỞ DỮ LIỆU & QUAN HỆ THỰC THỂ (MYSQL SCHEMA)

Tất cả bảng đều sử dụng kiểu bảng `InnoDB`, bảng mã ký tự `utf8mb4_unicode_ci`.

### 6.1. Bảng Tổ Chức & Nhân Sự:
* `departments`: `id (VARCHAR 64 PK)`, `code`, `name`, `description`, `color`, `icon`, `sortOrder`, `managerId`, `isActive`, `createdAt`.
* `teams`: `id (VARCHAR 64 PK)`, `departmentId (FK)`, `code`, `name`, `description`, `color`, `managerId`, `isActive`, `createdAt`, `updatedAt`.
* `positions`: `id (VARCHAR 64 PK)`, `departmentId (FK)`, `teamId (FK)`, `code`, `name`, `description`, `level (1-5)`, `isManager (TINYINT)`, `isActive`, `createdAt`.
* `roles`: `id (VARCHAR 64 PK)`, `name`, `description`, `color`, `permissions (JSON)`, `isSystem (TINYINT)`.
* `users`: `id (VARCHAR 64 PK)`, `name`, `email (UK)`, `password`, `role`, `department`, `departmentId (FK)`, `teamId (FK)`, `positionId (FK)`, `managerId (FK)`, `avatar`, `phone`, `dob`, `hometown`, `bio`, `isLocked (TINYINT)`, `createdAt`.

### 6.2. Bảng Công Việc & Quy Trình:
* `tasks`: `id (VARCHAR 64 PK)`, `title`, `description`, `startDate`, `dueDate`, `estimatedEndAt`, `priority (Low/Medium/High/Urgent)`, `status (Todo/In Progress/Done)`, `createdBy (FK)`, `department`, `departmentId (FK)`, `teamId (FK)`, `projectId (FK)`, `completedAt`, `createdAt`.
* `task_assignees`: `taskId (FK)`, `userId (FK)`.
* `task_comments`: `id (VARCHAR 64 PK)`, `taskId (FK)`, `userId (FK)`, `content`, `createdAt`.
* `task_attachments`: `id (VARCHAR 64 PK)`, `taskId (FK)`, `fileName`, `fileUrl`, `fileSize`, `uploadedBy (FK)`, `createdAt`.
* `task_templates`: `id (VARCHAR 64 PK)`, `departmentId (FK)`, `name`, `code`, `category`, `description`, `priority`, `estimatedHours`, `checklist (JSON)`, `isActive`, `createdAt`.

### 6.3. Bảng Luân Chuyển Liên Phòng & Phê Duyệt:
* `department_requests`: `id (VARCHAR 64 PK)`, `code (UK)`, `title`, `description`, `sourceDepartmentId (FK)`, `targetDepartmentId (FK)`, `requesterId (FK)`, `assignedTo (FK)`, `priority (Low/Medium/High/Urgent)`, `status (Pending/Accepted/In_Progress/Completed/Rejected/Cancelled)`, `relatedEntityType`, `relatedEntityId`, `dueDate`, `completedAt`, `convertedTaskId`, `createdAt`, `updatedAt`.
* `approvals`: `id (VARCHAR 64 PK)`, `code (UK)`, `title`, `description`, `entityType (Quotation/PO/Contract/Payment/Technical/Leave/Task)`, `entityId`, `departmentId (FK)`, `requestedBy (FK)`, `approverId (FK)`, `status (Pending/Approved/Rejected/Cancelled)`, `priority (Low/Medium/High/Urgent)`, `amount (DECIMAL 18,2)`, `feedback`, `decidedAt`, `createdAt`, `updatedAt`.

---

# 7. HỆ THỐNG BACKEND API ENDPOINTS

### 7.1. Authentication & Users (`/api/auth`, `/api/users`):
* `POST /api/auth/login`: Xác thực email/mật khẩu, trả về JWT Token và User Context đầy đủ (Department, Team, Position, Role, Permissions).
* `GET /api/users`: Danh sách nhân sự kèm quan hệ phòng ban/chức danh.
* `POST /api/users` & `PUT /api/users/:id`: Thêm/sửa nhân sự, phân bổ chức vụ và người quản lý trực tiếp (`managerId`).

### 7.2. Organization (`/api/departments`, `/api/teams`, `/api/positions`, `/api/roles`):
* `GET /api/departments`: Danh sách 13 phòng ban kèm thống kê nhân sự và ID Trưởng phòng.
* `GET /api/teams`: Danh sách các đội nhóm chuyên trách theo từng phòng ban.
* `GET /api/positions`: Danh sách chức danh phân cấp từ cấp 1 (Kỹ thuật viên) đến cấp 5 (Ban Giám Đốc).
* `GET /api/roles`: Danh sách vai trò và tập quyền hạn JSON (`permissions`).

### 7.3. Tasks & Templates (`/api/tasks`, `/api/task-templates`):
* `GET /api/tasks`: Lấy danh sách công việc có lọc theo `departmentId`, `teamId`, `status`, `priority`, `assigneeId`.
* `POST /api/tasks`: Tạo công việc mới, kích hoạt Socket.io bắn thông báo realtime cho người nhận việc.
* `GET /api/task-templates`: Lấy danh sách mẫu công việc theo phòng ban.
* `POST /api/task-templates/:id/instantiate`: 1-Click tạo nhanh Task từ template mẫu.

### 7.4. Department Requests & Approvals (`/api/department-requests`, `/api/approvals`):
* `GET /api/department-requests`: Lấy danh sách yêu cầu liên phòng (lọc theo `targetDepartmentId` hoặc `sourceDepartmentId`).
* `POST /api/department-requests`: Tạo phiếu yêu cầu gửi sang phòng ban khác.
* `POST /api/department-requests/:id/convert-to-task`: Chuyển phiếu yêu cầu thành Task chính thức của phòng nhận.
* `GET /api/approvals`: Lấy danh sách phiếu phê duyệt (lọc theo trạng thái `Pending`, `Approved`, `Rejected`).
* `POST /api/approvals/:id/decide`: Phê duyệt hoặc từ chối phiếu kèm nội dung ý kiến chỉ đạo.

---

# 8. QUY CHUẨN THIẾT KẾ GIAO DIỆN (TRANLE SOLAR DESIGN SYSTEM)

Giao diện TranLe Tasks tuân thủ nghiêm ngặt bộ nhận diện thương hiệu Năng Lượng Xanh:

### 8.1. Bảng Màu Thương Hiệu (Color Palette):
* **Màu chủ đạo (Primary - Energy Green):** `#16a34a` (Green 600) & `#15803d` (Green 700) — Biểu trưng cho năng lượng sạch, bền vững.
* **Màu điểm nhấn (Accent - Solar Gold):** `#f59e0b` (Amber 500) & `#d97706` (Amber 600) — Biểu trưng cho bức xạ mặt trời, nhiệt huyết và thịnh vượng.
* **Màu nền tối & Lãnh đạo (Dark / Executive Navy):** `#0f172a` (Slate 900) & `#1e293b` (Slate 800) — Mang lại cảm giác cao cấp, sang trọng và tin cậy.
* **Màu phó phòng (Sky Blue):** `#0284c7` (Sky 600) — Phân biệt rõ nét trên bảng phân quyền và danh sách nhân sự.

### 8.2. Phong Cách Thiết Kế (Aesthetics & Components):
* **Hiệu ứng Kính (Glassmorphism):** Sử dụng nền mờ `backdrop-blur-md`, viền tinh tế `border-white/10` hoặc `border-slate-200/80` trên nền chuyển sắc mượt (Smooth Gradients).
* **Kiểu chữ (Typography):** Sử dụng phông chữ hiện đại **Inter / Outfit**, phân cấp chữ rõ ràng, độ tương phản cao, dễ đọc trên mọi thiết bị.
* **Tương tác vi mô (Micro-animations):** Hiệu ứng hover nhấc nổi nhẹ (`hover:-translate-y-0.5 hover:shadow-lg`), chuyển đổi trạng thái mượt mà (`transition-all duration-200`).

---

# 9. LỘ TRÌNH TRIỂN KHAI & TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE)

### 9.1. Lộ Trình 5 Giai Đoạn Hoàn Thiện:
1. **Giai đoạn 1 — Cơ sở hạ tầng & Dữ liệu nền tảng:** Hoàn thiện Database MySQL, Seed 13 phòng ban, 21 teams, 35 chức danh và 72 nhân viên chuẩn hóa. *(Đã hoàn thành 100%)*
2. **Giai đoạn 2 — Không gian phòng ban & Luân chuyển liên phòng:** Triển khai `/department-workspace`, Work Queue 8 trạng thái, Hộp yêu cầu liên phòng `department_requests`, Trung tâm phê duyệt `/approvals` và Mẫu công việc `task_templates`. *(Đã hoàn thành 100%)*
3. **Giai đoạn 3 — Chuyên biệt hóa các Module nghiệp vụ:** Nâng cấp chi tiết giao diện cho từng khối (Kinh doanh CRM, Kỹ thuật PVSyst, Khối EPC thi công, Kho & Logistics Serial, O&M SAJ Center).
4. **Giai đoạn 4 — Báo cáo thông minh, Phân tích KPI & Trợ lý Gemini AI:** Tích hợp dashboard KPI đa chiều, xuất báo cáo PDF/Excel và trợ lý AI gợi ý giải pháp kỹ thuật/tự động hóa phân loại task.
5. **Giai đoạn 5 — Kiểm thử toàn diện & Triển khai Production:** Chạy bộ kiểm thử tự động, tối ưu hóa truy vấn cơ sở dữ liệu, đóng gói Docker Compose và bàn giao tài liệu vận hành.

### 9.2. Tiêu Chuẩn Hoàn Thành (Definition of Done - DoD):
* [x] Cơ sở dữ liệu chạy ổn định trên MySQL 8.0, toàn bộ khóa ngoại và chỉ mục (Indexes) được tạo chuẩn xác.
* [x] Backend Express 5 + TypeScript vượt qua 100% các bài kiểm tra tự động (`npm test`).
* [x] Frontend React 19 + TypeScript biên dịch thành công 0 lỗi (`tsc -b && vite build`).
* [x] Không gian làm việc của 13 phòng ban hiển thị chính xác theo dữ liệu nhân sự, chức danh và quyền hạn.
* [x] Luồng luân chuyển yêu cầu liên phòng (Department Requests) và phê duyệt (Approvals) hoạt động thông suốt hai chiều.

---
*Tài liệu được biên soạn và chuẩn hóa cho toàn bộ dự án TranLe Tasks — Bản quyền thuộc Công ty Cổ phần Tư vấn Xây dựng Điện Trần Lê.*
