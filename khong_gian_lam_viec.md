# Phân Tích Tab Không Gian Phòng Ban (Department Workspace)

> Ngày phân tích: 13/09/2026 — Đối chiếu ảnh chụp màn hình `Ban Giám Đốc (EXEC)` với source code thực tế.
> Phạm vi: `frontend/pages/DepartmentWorkspace/`, `frontend/components/DepartmentWorkspace/`, `backend/routes/departmentWorkspace.ts`, `frontend/services/departmentWorkspaceService.ts`.

---

## 1. Tổng quan Tab làm gì

**Không gian phòng ban** là màn hình trung tâm điều hành theo từng phòng ban (route `Department-Workspace`, sidebar `Không gian phòng ban` đang active trong ảnh).

Khung trang gồm 4 tầng cố định + 1 vùng nội dung đổi theo tab:

1. **DepartmentHeader** — tên ban + mã ban + mô tả + dropdown chọn phòng ban (`frontend/components/DepartmentWorkspace/DepartmentHeader.tsx:29-81`).
2. **StatCards** — 4 thẻ số liệu động từ MySQL (`StatCards.tsx:11-61`).
3. **QuickJumpBar** — 5 nút nhảy nhanh (`QuickJumpBar.tsx:7-13`): Hợp Đồng `/contracts`, Dự Án EPC `/projects`, Kho & Thiết Bị `/products`, Trung Tâm Phê Duyệt `/approvals`, Báo Cáo Phòng `/reports`.
4. **TabNavigation** — 11 tabs (`TabNavigation.tsx:14-26`).
5. **Vùng nội dung** — render có điều kiện theo `activeTab` (`pages/DepartmentWorkspace/index.tsx:108-246`).

State toàn trang do hook `useDepartmentWorkspace()` quản lý (`pages/DepartmentWorkspace/hooks/useDepartmentWorkspace.ts:65-237`): `selectedDeptId`, `activeTab` (mặc định `'domain'`), `queueFilter`, `requestTab`, `searchQuery`, form tạo yêu cầu liên ban, `selectedTask` + `TaskModal`.

Phân quyền: `isAdminOrDirector = role Admin/Director hoặc có permission admin_panel` (`useDepartmentWorkspace.ts:76`). Admin/Director thấy dropdown tất cả phòng ban; nhân viên thường bị khóa về phòng mình + `useEffect` ép `selectedDeptId = userDept.id` (`useDepartmentWorkspace.ts:97-101`, `DepartmentHeader.tsx:60-77`).

---

## 2. Giải mã ảnh chụp (Ban Giám Đốc — EXEC)

| Vùng trong ảnh | Source sinh ra | Dữ liệu thực |
|---|---|---|
| Header `Ban Giám Đốc [EXEC]` + mô tả `Hội đồng quản trị & Ban Tổng Giám đốc...` | `DepartmentHeader.tsx:37-56`, `currentDept` lấy từ bảng `departments` theo `selectedDeptId` (`useDepartmentWorkspace.ts:103`) | Tên/mã/mô tả/icon (`Crown`)/màu từ DB, không hardcode |
| Dropdown `PHÒNG BAN: Ban Giám Đốc (EXEC)` | `DepartmentHeader.tsx:61-71`, options từ `allowedDepartments` | Ảnh đang đăng nhập `Admin Tran Le / Admin` nên thấy full danh sách |
| 4 thẻ `0 Tổng Công Việc / 100% Tỷ Lệ Hoàn Thành / 0 Phiếu Yêu Cầu Đến / 6 Thành Viên & 0 Nhóm` | `StatCards.tsx:19-59`, props từ `index.tsx:89-95` | `totalTasks=0`, `completionRate=100%`, `incomingRequests.length=0`, `deptMembers.length=6` — DB đang trống task/request của EXEC |
| `TRUY CẬP NHANH: Hợp Đồng, Dự Án EPC, Kho & Thiết Bị, Trung Tâm Phê Duyệt, Báo Cáo Phòng` | `QuickJumpBar.tsx:7-28` | `navigate()` sang route tương ứng |
| Thanh tab `Tổng quan, Công việc 0, Yêu cầu 0, Nghiệp vụ [Đặc thù], Quy trình, Lịch biểu, Tài liệu, Phê duyệt, Báo cáo, KPI, Lịch sử` | `TabNavigation.tsx:14-26`, badge `queue/incoming pending` ghi đè ở `index.tsx:102-105` | Tab active là `Nghiệp vụ` (gạch xanh + badge `Đặc thù`) = `activeTab === 'domain'` |
| Banner tối `Executive Cockpit...` + 3 nút xanh | `departments/ExecutiveWorkspace.tsx:130-161` | Nút 1 `navigate('/approvals')`, nút 2/3 mở modal OKR/Meeting tại chỗ |
| 4 thẻ `0 đ Tổng Hợp Đồng Ký Kết / 0 đ Doanh Thu Thực Tế / 0/0 OKR / 0 dự án` | `ExecutiveWorkspace.tsx:163-224` | `dynamicContractValue`, `totalRevenue`, `okrs`, `projects` đều rỗng → hiển thị 0, đúng nguyên tắc zero-hardcode |
| 2 panel dưới `Quản Trị Mục Tiêu (OKRs) (0)` + `Cuộc Họp & Action Items (0)` | `ExecutiveWorkspace.tsx:227-318` | `okrs.length/meetings.length = 0` nên rơi vào nhánh empty-state (`:245-246`, `:288-289`) |

Kết luận từ số liệu ảnh: đây là **DB mới/trống** (chưa có contract, revenue, OKR, meeting, task EXEC), chỉ có 6 users thuộc EXEC. Tỷ lệ 100% khi 0 task là hành vi có chủ đích của công thức (xem mục 5).

---

## 3. Kiến trúc code của Tab

```
pages/DepartmentWorkspace/index.tsx (263 dòng — điều phối)
 ├─ hooks/useDepartmentWorkspace.ts (237 dòng — state + derived data)
 ├─ DepartmentDomainView.tsx (201 dòng — router 13 workspace theo departmentId)
 ├─ components/DepartmentWorkspace/
 │   ├─ DepartmentHeader.tsx / StatCards.tsx / QuickJumpBar.tsx / TabNavigation.tsx
 │   ├─ WorkQueueTab.tsx + WorkQueueTaskItem.tsx
 │   ├─ RequestsTab.tsx / KPITab.tsx
 ├─ tabs/ (6 tab chuẩn): Dashboard, Calendar, Docs, Approvals, Reports, Audit
 ├─ departments/ (13 workspace đặc thù)
 └─ TaskModal (tạo/sửa task từ mọi tab)
```

Luồng dữ liệu chung:

- Danh mục nền (`departments, teams, users, tasks, projects, contracts, approvals, revenueReports, departmentRequests, taskTemplates`) lấy qua `DataContext` (React Query) trong hook (`useDepartmentWorkspace.ts:68-74`).
- Dữ liệu đặc thù từng ban gọi riêng qua `departmentWorkspaceService.getRecords(deptId, type)` / `getKpis(deptId)` → `GET /api/department-workspace/:deptId/records?type=...` (`services/departmentWorkspaceService.ts:6-13`).
- Lọc theo phòng hiện tại: `deptTeams/deptMembers/deptTasks` filter theo `selectedDeptId` (`useDepartmentWorkspace.ts:103-106`); `incoming/outgoingRequests` filter theo `target/sourceDepartmentId` (`:140-141`).

---

## 4. 11 Tabs — mỗi tab là gì, file nào

Tab mặc định khi vào trang là **`domain` (Nghiệp vụ)** (`useDepartmentWorkspace.ts:81`), đúng trạng thái trong ảnh.

| # | Tab (label + id) | File render | Chức năng |
|---|---|---|---|
| 1 | Tổng quan `dashboard` | `tabs/DepartmentDashboardTab.tsx` + props ở `index.tsx:181-198` | Pie trạng thái task, bar ưu tiên, việc khẩn, yêu cầu liên ban, nút tạo task/request |
| 2 | Công việc `queue` (badge = số task) | `components/DepartmentWorkspace/WorkQueueTab.tsx` + `index.tsx:116-132` | Hàng đợi việc phòng ban, filter 8 chế độ (`all/my/team/unassigned/today/overdue/blocked/review` — `useDepartmentWorkspace.ts:119-136`), search tiêu đề/mô tả, click mở `TaskModal` |
| 3 | Yêu cầu `requests` (badge = pending đến) | `components/DepartmentWorkspace/RequestsTab.tsx` + `index.tsx:134-162` | 2 sub-tab Đến/Đi, tạo phiếu liên ban (`sourceDepartmentId → targetDepartmentId`), nút `handleConvert` biến phiếu thành task |
| 4 | **Nghiệp vụ `domain` (badge `Đặc thù`, active trong ảnh)** | `DepartmentDomainView.tsx` + `index.tsx:108-114` | Router `switch(departmentId)` 13 workspace (`DepartmentDomainView.tsx:98-189`): `dept-exec → ExecutiveWorkspace`, `dept-sales → SalesWorkspace`, ... `default → null` |
| 5 | Quy trình `workflow` | `components/workflow/CrossDepartmentWorkflowTracker` + `index.tsx:164-169` | Theo dõi chuỗi liên phòng ban end-to-end |
| 6 | Lịch biểu `calendar` | `tabs/DepartmentCalendarTab.tsx` + `index.tsx:200-208` | Deadline task + sự kiện phòng ban |
| 7 | Tài liệu `docs` | `tabs/DepartmentDocsTab.tsx` + `index.tsx:210-216` | Kho CAD/PDF/BBNT theo `departmentId` |
| 8 | Phê duyệt `approvals` | `tabs/DepartmentApprovalsTab.tsx` + `index.tsx:218-226` | Tờ trình phòng ban, duyệt/từ chối, `refreshData` sau duyệt |
| 9 | Báo cáo `reports` | `tabs/DepartmentReportsTab.tsx` + `index.tsx:228-238` | SLA, năng suất, xuất Excel `.xlsx` (truyền cả `contracts`, `revenueReports`) |
| 10 | KPI `kpi` | `components/DepartmentWorkspace/KPITab.tsx` + `index.tsx:170-179` | KPI từ `deptTasks/deptMembers/deptTemplates/overdue/completionRate` |
| 11 | Lịch sử `audit` | `tabs/DepartmentAuditTab.tsx` + `index.tsx:240-246` | Timeline tạo/sửa/xóa/đổi trạng thái theo `departmentId` |

---

## 5. Deep-dive: Executive Cockpit (nội dung ảnh)

File: `frontend/pages/DepartmentWorkspace/departments/ExecutiveWorkspace.tsx` (460 dòng). Props nhận từ `DepartmentDomainView.tsx:101-109`: `contracts, projects, approvals, revenueReports, totalContractValue, totalRevenue, formatVND`.

### 5.1. Banner (dòng 130-161)

- Nền gradient `slate-900 → indigo-950`, 2 vòng blur amber/indigo trang trí, icon `Crown` amber.
- 3 CTA: (1) `Phê Duyệt Đang Chờ (n)` — `navigate('/approvals')`, số = `execKpis.pendingApprovals || approvals.filter(pending).length` (`:149`); (2) `Giao Mục Tiêu (OKR)` — mở modal OKR (`:151`); (3) `Lịch Giao Ban HĐQT` — mở modal họp (`:155`).

### 5.2. 4 thẻ KPI (dòng 163-224)

1. **Tổng Hợp Đồng Ký Kết** — `dynamicContractValue = execKpis.totalContractValue || totalContractValue` (`:125`), hiển thị `formatVND()` (`vi-VN/VND` — `DepartmentDomainView.tsx:92-94`), sub `n hợp đồng trong CSDL`.
2. **Doanh Thu Thực Tế** — `totalRevenue = Σ(actualRevenue||amount||revenue)` (`DepartmentDomainView.tsx:88-90`), sub `Dữ liệu ghi nhận từ báo cáo tài chính`.
3. **OKR Hoàn Thành** — `okrsCompleted / okrs.length`, `okrsCompleted = execKpis.okrsCompleted || filter(completed)` (`:203`).
4. **Dự Án Đang Triển Khai** — `execKpis.totalProjects || projects.length` (`:218`), sub `Tổng hợp EPC & O&M`.

Trong ảnh cả 4 = 0 vì DB trống — hành vi đúng, không phải lỗi render.

### 5.3. Panel OKRs (dòng 230-270)

- Nút `+ Giao Mục Tiêu` mở modal (`:235`). Mỗi OKR: `objective`, `Chủ trì: dept`, badge `%`, progress bar màu theo trạng thái (`completed=emerald, at_risk=rose, on_track=blue` — `:254-263`).
- Tạo mới (`handleCreateOkr`, `:79-100`): `POST dept-exec/okrs {objective, progress, dept, status}`; status tự suy ra: `>=100 → completed, <50 → at_risk, còn lại → on_track` (`:89`); xong `fetchExecData()` reload. Form reset `objective/progress`, đóng modal.
- Chú ý: `okrDept` khởi tạo `'P. Kinh Doanh & Sales'` (`:47`) là chuỗi cố định trong code — điểm duy nhất trong file đi ngược quy chuẩn zero-hardcode của repo, nên chuyển sang load từ `departments`.

### 5.4. Panel Họp & Action Items (dòng 273-317)

- Mỗi meeting: khối ngày (`m.date` tách theo dấu `,`), `title`, `n Action Items`, badge `Cần Làm (pending>0, rose)` hoặc `Hoàn Thành (pending=0, emerald)` (`:299-311`).
- Tạo mới (`handleCreateMeeting`, `:102-123`): `POST dept-exec/meetings {title, date, actions, pending=actions}`; `date` trống thì mặc định `new Date().toLocaleDateString('vi-VN')` (`:110`). `meetingDate` là input text tự do (`:423-429`) nên định dạng ngày không chuẩn hóa — nên đổi sang date-picker.

### 5.5. Dữ liệu EXEC từ backend

`fetchExecData()` (`:55-73`) gọi song song 4 API:

```
GET /api/department-workspace/dept-exec/records?type=metrics     → executive_metrics
GET /api/department-workspace/dept-exec/records?type=okrs        → company_okrs
GET /api/department-workspace/dept-exec/records?type=meetings    → executive_meetings
GET /api/department-workspace/dept-exec/kpis                     → KPI tổng hợp
```

Backend `backend/routes/departmentWorkspace.ts` (1025 dòng, 8 endpoints: 4 records CRUD có `zod` validate `{type, data}` + 1 kpis + 3 automation `convert-lead-to-project / design-to-pr / milestone-to-ar`):

- `GET records` rẽ nhánh theo `departmentId + type` (`:43-130`): EXEC map đúng 3 bảng trên (`:54-61`); các ban khác map bảng riêng (sales→`sales_leads/performance`, eng→`engineering_requests/designs`, epc→`epc_subcontractors`, om→`om_alarms/schedules`, proc→`procurement_prs/pos`, wh→`warehouse_inventory/inbound/outbound`, fin→`finance_ap/ar`, hr→`hr_recruitment/employees`, it→`it_tickets/assets/systems`, legal→`legal_contracts/approvals/library`, mkt→`marketing_campaigns/leads`, cs→`customer_tickets/contract_renewals`).
- `POST records` insert `company_okrs (id, objective, progress, dept, status, createdAt)` và `executive_meetings (id, title, date, actions, pending, createdAt)` (`:181-187`); `PUT/DELETE` tương ứng (`:398-404`, `:605-607`).
- `GET kpis` trả `totalContractValue/totalContracts/totalProjects/pendingApprovals/okrsCompleted` (VD đếm `company_okrs WHERE status='completed'` ở `:794`) — chính là `execKpis` frontend ưu tiên hiển thị.
- Có chuẩn hóa alias ID cũ (`dept-finance → dept-fin`...) (`:16-26`) và helper `isManagerOrAbove` (`:28-32`).

---

## 6. Công thức tính toán cần biết

- `completionRate = total>0 ? round(done/total*100) : 100` (`useDepartmentWorkspace.ts:147`) → **0 task vẫn hiện 100%** như trong ảnh. Nếu muốn phản ánh "chưa có việc", nên hiển thị `—` hoặc `0%` khi `total=0`.
- `totalContractValue`: ưu tiên hợp đồng đã lọc theo phòng, rỗng thì fallback toàn công ty (`DepartmentDomainView.tsx:83-86`) → EXEC đang dùng số toàn công ty (vẫn 0 vì chưa có hợp đồng nào).
- Badge tab: `Công việc = deptTasks.length`, `Yêu cầu = incoming pending` (`index.tsx:102-105`).
- `deptMembers` match theo `departmentId` hoặc tên phòng (`useDepartmentWorkspace.ts:105`) — số 6 trong ảnh là số users thỏa điều kiện này.

---

## 7. Điểm mạnh & vấn đề gợi ý cải tiến

**Điểm mạnh:** 1 header + 1 hook + 1 router phục vụ cả 13 ban; 6 tab chuẩn + 1 tab đặc thù tách bạch; CRUD EXEC đi qua API/MySQL có validate, không mock; empty-state đầy đủ; dark-mode classes nhất quán.

**Vấn đề nhỏ (độ ưu tiên thấp):**
1. `completionRate` 100% khi `totalTasks=0` gây hiểu nhầm — nên trả `0` hoặc `null` + label `Chưa có việc`.
2. `okrDept` mặc định hardcode tên phòng (`ExecutiveWorkspace.tsx:47`) — load từ API `departments`.
3. `meetingDate` input text tự do — đổi sang `flatpickr`/date input + lưu ISO để sort/block lịch đúng.
4. `DepartmentDomainView` switch thiếu case tường minh cho id lạ (rơi `default: null` → tab trắng) — nên có empty-state chung.
5. `ExecutiveWorkspace` chưa dùng `metrics`/`revenueReports` đã fetch (biểu đồ `recharts` import nhưng chưa vẽ) — hoặc vẽ trend dòng tiền, hoặc gỡ import cho nhẹ bundle.
6. Nút `Phê Duyệt Đang Chờ` đếm fallback client khi KPI null — nên thống nhất 1 nguồn `execKpis.pendingApprovals`.

---

## 8. Sơ đồ luồng Tab (tóm tắt)

```
Dropdown phòng ban → selectedDeptId
  → useDepartmentWorkspace lọc deptTeams/deptMembers/deptTasks/requests
  → Header + StatCards + QuickJump + 11 Tabs
  → Tab "Nghiệp vụ" → DepartmentDomainView switch(dept-exec)
      → ExecutiveWorkspace fetch 4 API dept-exec
        → Banner + 4 KPI + OKR list + Meeting list + 2 modal tạo mới
      → POST records → MySQL company_okrs / executive_meetings → reload
```

---

## 9. Nhật ký hoàn thiện (đã triển khai)

> `npm run typecheck` (backend + frontend) đạt, `npm run build` đạt (vite build 18.78s, chỉ cảnh báo chunk-size có sẵn).

| # | Vấn đề | Cách sửa | File |
|---|---|---|---|
| 1 | `completionRate` 100% khi 0 task | Trả `0`; `StatCards` hiện `—` + `Chưa có việc`; `KPITab`/`DepartmentReportsTab` (SLA + rate thành viên) mặc định `0`/`—` thay vì `100` | `hooks/useDepartmentWorkspace.ts:147`, `components/DepartmentWorkspace/StatCards.tsx`, `KPITab.tsx`, `tabs/DepartmentReportsTab.tsx:39,47` |
| 2 | `okrDept` hardcode tên phòng | Options lấy từ `useData().departments`; mặc định = phòng đầu tiên trong DB; giữ `OKR_DEPT_FALLBACK` chỉ khi API chưa tải được | `departments/ExecutiveWorkspace.tsx:26,38,86-91` |
| 3 | `meetingDate` text tự do | Input `type="date"`, lưu ISO `yyyy-mm-dd` (mặc định hôm nay); badge hiển thị `Tmm/yy + ngày`, tương thích dữ liệu cũ; danh sách sort mới-nhất-trước với ISO | `departments/ExecutiveWorkspace.tsx:126-140,176-197` |
| 4 | `departmentId` lạ → tab trắng | `default` trả panel empty-state (icon + tên/mã ban + hướng dẫn) thay vì `null` | `DepartmentDomainView.tsx:187-206` |
| 5 | `recharts` import nhưng chưa vẽ | Thêm mục 3 `Dòng Tiền & Lợi Nhuận Theo Tháng` (`ComposedChart`: Bar Doanh thu/Chi phí + Line Lợi nhuận): ưu tiên `executive_metrics`, fallback gom `revenueReports` theo `periodStart`, empty-state hướng về Phòng Tài chính | `departments/ExecutiveWorkspace.tsx:149-174` + JSX mục 3 |
| 6 | Đếm phê duyệt 2 nguồn (`\|\|`) | `execKpis` khởi tạo `null`; mọi KPI dùng `??` (server khi xong, client khi đang tải) — giữ đúng số `0` thật | `departments/ExecutiveWorkspace.tsx:44,142-147` |

---

## 10. Chuẩn hóa dữ liệu cũ (đã chạy trên DB thực)

Script: `backend/migrate_executive.ts` — chạy `npx tsx migrate_executive.ts` (dry-run) / thêm `--apply` để ghi. Kết quả:

- `executive_meetings`: **0 bản ghi** → không có ngày legacy cần chuyển. Logic chuyển đổi chỉ nhận chuỗi thuần `d/m/yyyy` (vi-VN) đã validate lịch thật → ISO `yyyy-mm-dd`, trong transaction + rollback khi lỗi; chuỗi khác (VD `THỨ HAI, 09:00`) giữ nguyên và liệt kê báo cáo.
- `executive_metrics`: bảng trống → **đã seed 6 tháng mẫu T4–T9/2026** (doanh thu 0.95–1.55 tỷ, chi phí 65%, lợi nhuận 35%). Chạy lại idempotent (đủ 6 bản ghi thì bỏ qua).
- `company_okrs`: trống, không có `dept` legacy cần đối chiếu.

> Lưu ý: (1) Số metrics là **số mẫu** — Phòng Tài chính cần thay bằng số thực tế. (2) Cột `revenue/cost/profit` đang là `INT` (tối đa ~2.1 tỷ); doanh thu tháng vượt ngưỡng này cần đổi sang `BIGINT`.

---

## 11. Triển khai P0 → P1 → P2 (đã hoàn tất, typecheck + build đạt)

**P0 — sửa sai dữ liệu / chức năng chết:**
- HR: bảng mới `hr_leaves` + CRUD backend (`departmentWorkspace.ts`, KPI `pendingLeaves`); đơn nghỉ tạo đúng bảng, tab Đơn riêng (duyệt/từ chối), duyệt phép năm trừ tồn `pto` (chặn âm), thêm input ngày bắt đầu, badge trạng thái 3 loại.
- Finance: input diễn giải AR (hết gửi rỗng), amount kiểu số có validate > 0 + hiển thị VNĐ, bật 2 modal chết bằng nút "Đề Nghị Xuất HĐ Theo Mốc" / "Sổ Theo Dõi Tuổi Nợ", KPI tiền chờ thu/chi từ server, RBAC (nhân viên chỉ xem).
- CSKH: layout master-detail — click ticket → panel chat (dùng logic gửi/đóng/chuyển O&M sẵn có), agent = user đăng nhập, time ISO, bỏ avatar cứng, KPI đếm đúng ticket chưa xong.
- Kho: phiếu nhập/xuất theo dòng SKU × số lượng, tự cộng/trừ tồn, chặn xuất vượt tồn, badge Hết hàng/Sắp hết (≤ min), bỏ ảnh cứng, `requestedBy` bắt buộc.
- Mua hàng: chặn PO 0đ (validate + báo lỗi inline), ETA `type=date` bắt buộc, reset form đầy đủ, progress `?? 25`.

**P1 — chuẩn hóa nền:**
- Timestamp ISO thay `'Vừa xong'` khi ghi DB (IT ticket, CSKH); hiển thị legacy cắt gọn, không fake.
- Toast lỗi ở 25 điểm mutation của 13 workspace (`useNotifications().showToast`).
- Fetch-all-tabs + refetch KPI cho Sales/Eng/EPC/OM/IT/Legal; dải KPI server cho IT/Legal (trước đó fetch bỏ).
- Reset form + giữ `''` khi xóa trắng ô số (Sales lead, Procurement PO...); clamp rating/sub/slots; chống chia 0 (Eng `dcAcRatio`); sửa `reverse()` mutate mảng (Sales).
- `frontend/utils/workspaceStatus.ts`: `statusLabel()` Việt hóa lớp hiển thị (fail-open), dùng ở Eng/Procurement/Finance/O&M/CSKH; backend fix KPI lệch (HR `IN ('open','Screening')`, Marketing `<> 'Đã Phát Hành'`); Legal có select mức khẩn (hết dead-state).

**P2 — mở rộng theo chuỗi tiền EPC → O&M → Finance → Sales:**
- EPC: bảng + API `epc_hse_logs`, tab HSE (ghi nhận sự cố/suýt soát/PCCC/toolbox + đóng biên bản), KPI an toàn từ dữ liệu thật (hết 100% cứng), lọc kanban Tất cả/Đang thi công/Hoàn thành, hiện đồng thời mô tả + % tiến độ.
- O&M: nút Tiếp nhận/Xong cho alarm, nút Hoàn thành cho PM, KPI "Tỷ lệ xử lý cảnh báo" và "Bảo trì hoàn thành" tính từ dữ liệu (hết PR 83.6% và 24/7 cứng).
- Finance: duyệt/từ chối AP-AR, đánh dấu Đã chi/Đã thu (RBAC quản lý), badge Quá hạn khi `dueDate` trễ.
- Sales: cột Lost + nút thua/mở lại, nút handoff "Tạo YC Khảo Sát" sang Engineering, stage lạ log warn thay vì mất im lặng, `formatVND` chống NaN.

**Còn lại sau đợt này:** pipeline tuyển dụng chi tiết (đã có advance/+CV/cancel — còn thiếu PV/lịch), RFQ/so sánh báo giá NCC, PR thực so PVsyst (cần SCADA), chấm công site, versioning báo giá nhiều bản.

---

## 12. Liên kết liên phòng ban P0 → P3 (đã triển khai, typecheck + build đạt)

**Phase 0 — nối lại chuỗi gãy:**
- Sửa vocab 3 automation cũ: lead `'Won'`→`'won'`, PR `'Chờ duyệt PO'`/`'Cao'`→`'pending'`/`'HIGH'`, AR `amount` lưu số (hết nối chuỗi VNĐ) + bổ sung `status='pending'` (trước đó INSERT thiếu cột NOT NULL).
- Nút "Tạo AR" trên mốc nghiệm thu hoàn thành trong `ProjectEditForm` (chống trùng qua `milestoneId`, hiện badge "Đã có AR").
- `CrossDepartmentWorkflowTracker` đọc KPI thật 6 trạm (badge số chờ xử lý + trạng thái Active/Ngoại tuyến).

**Phase 1 — chuỗi EPC end-to-end:**
- Cột liên kết DB mới: `projects.leadId`, `procurement_prs.designId`, `procurement_pos.prId`, `warehouse_inbound.poId`, `warehouse_outbound.projectId`, `finance_ar.milestoneId/projectId`, `engineering_designs.project`, `customer_tickets.category` (DDL + `ensureColumnExists` + CRUD nhận đủ trường).
- 4 endpoint automation mới (đều idempotent + realtime): `pr-to-po`, `po-to-inbound`, `cod-to-om` (kèm chuyển dự án sang `warranty`), `request-approval` (ngưỡng 2 tỷ, gửi Giám đốc + Pháp chế).
- Nút 1-click: PR→PO, PO→báo nhập kho, Bàn giao O&M (dự án xong), xuất kho chọn đúng `projects.id`; hồ sơ thiết kế gắn dự án.
- `ProjectChainTimeline` (11 mắt: lead→tái ký) + modal "Dòng đời" trên card EPC, mỗi mắt có nút hành động tiếp theo.
- Scheduler `chainReminders` (08:30 hằng ngày): nhắc PR kẹt >48h, nhắc tái ký hết hạn <90 ngày (chống gửi trùng trong ngày).

**Phase 2 — điều phối:** ticket CSKH phân loại (sự cố kỹ thuật tự sinh alarm O&M); PO/AP vượt 2 tỷ tự trình duyệt cấp cao (AP do Manager duyệt bị chặn và chuyển trình).

**Phase 3 — vệ tinh:** campaign→lead Sales (chống trùng tên); định biên HR theo phòng; lọc tài sản IT chưa cấp phát; panel tiến độ dự án trong Executive Cockpit.

---

## 14. Đợt vét tính năng tồn đọng (typecheck + build đạt)

- **Mua hàng — RFQ:** bảng `procurement_rfqs` + `procurement_quotes` (CRUD đủ), tab Chào giá RFQ (tạo RFQ, nhập báo giá NCC, tự highlight giá tốt nhất, trao thầu → sinh PO + đánh dấu các báo giá còn lại), modal RFQ/báo giá đầy đủ validate.
- **O&M — PR thực:** bảng `om_sites` (tên, công suất kWp, địa điểm) + tab sản lượng có thẻ PR từng trạm (suất kWh/kWp, TB 7 ngày, badge "Sản lượng thấp" khi < 70% TB), site trong phiếu sản lượng chuyển sang select.
- **EPC — chấm công:** bảng `epc_attendance` + tab Chấm Công Site (site, ngày, đội, số công, ghi chú) + modal đầy đủ, header đếm tổng lượt công.
- **Kho — serial:** cột `serials` (DDL + `ensureColumnExists` + CRUD), nhập serial khi thêm mã hàng, card hiện số serial đã lưu + sửa inline.

---

## 15. Vòng đời còn dở + test chuỗi (typecheck + build + 59 tests đạt)

- **Marketing:** campaign chuyển trạng thái Lên KH → Dựng Media → Đã Phát Hành (nút Tiếp →).
- **Engineering:** hết đóng băng progress 10% — slider kéo-thả (nháp cục bộ, thả ra mới lưu, chống spam API) + nút +10% + đổi giai đoạn (100% tự chuyển `completed`).
- **Kho:** điều chỉnh tồn kiểm kê (chốt số thực tế, toast hiện chênh lệch cũ → mới).
- **HR:** modal thêm hồ sơ nhân sự (tên, chức danh, phòng ban từ DB, tồn phép).
- **Backend tests:** file mới `chainAutomation.integration.test.ts` — 12 tests bao phủ CRUD types mới, vocab automation (`won`/`pending`/`HIGH`), amount AR số, idempotency 4 endpoint chuỗi, `request-approval` 400/201. Tổng **59/59 tests đạt**.

---

## 13. Hoàn thiện vòng đời & số liệu (đợt bổ sung, typecheck + build đạt)

- **IT:** ticket có vòng đời đóng/mở lại (nút trên từng dòng + hiển thị trạng thái).
- **Legal:** workflow thẩm định (Đang thẩm định → Đạt / Yêu cầu bổ sung / Trả về), badge màu theo bước, select mức khẩn đã nối (hết dead-state).
- **CSKH:** pipeline tái ký (`contacting` → `quoted` → `renewed`/`lost`), badge nhãn Việt; ticket hiển thị status Việt hóa.
- **Finance:** modal sửa AP/AR (diễn giải, đối tượng, số tiền > 0, ngày/hạn) + toast kết quả.
- **Marketing:** nguồn lead lưu `leadCount` + `conversion` số (cột DB mới + `ensureColumnExists`); list tính tỷ trọng thật, màu theo ngưỡng chốt (≥20/≥10), giữ chuỗi `%` cũ dạng ghi chú.
- **Sales:** versioning báo giá đã hoàn chỉnh sẵn — nhiều bản/dự án (tự tăng version), badge Nháp/Đã chốt/Hết hiệu lực, "Chốt theo bản này" (supersede các bản còn lại + chuyển Won theo giá bản chốt).
