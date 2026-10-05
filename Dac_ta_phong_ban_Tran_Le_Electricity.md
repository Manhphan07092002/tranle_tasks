# ĐẶC TẢ PHÒNG BAN – CÔNG TY CỔ PHẦN THIẾT BỊ ĐIỆN TRẦN LÊ (TRAN LE ELECTRICITY)

> Nguồn: Hồ sơ năng lực PROFILE_TLEC_VN 2026 (trang "Bộ máy tổ chức & nhân sự", "Lĩnh vực hoạt động kinh doanh", "Nguồn lực", "Cơ sở hạ tầng", "Lịch sử hình thành").
> Dùng cho: dev cập nhật bảng `departments` của hệ thống Tran Le Tasks.

## 0. Lưu ý cho người đọc và dev

PDF chỉ cho **tên các phòng ban và sơ đồ cấp bậc**, không mô tả chi tiết chức năng, nhiệm vụ. Vì vậy:

- Phần **[PDF]** là thông tin lấy trực tiếp từ hồ sơ.
- Phần **[ĐỀ XUẤT]** là chức năng, nhiệm vụ, KPI do suy ra từ 5 lĩnh vực kinh doanh, năng lực EPC/O&M/phân phối và trang thiết bị trong PDF. **Ban lãnh đạo cần duyệt trước khi dùng làm quy chế chính thức.**
- Các mục đánh dấu **(CẦN XÁC NHẬN)** là chỗ PDF chưa rõ.

---

## 1. Sơ đồ tổ chức [PDF]

```
Đại hội cổ đông (ĐHCĐ)
 ├── Ban Kiểm soát (BKS)          ← báo cáo trực tiếp ĐHCĐ, giám sát HĐQT và Ban TGĐ
 └── Hội đồng quản trị (HĐQT)
      └── Ban Tổng giám đốc (BTGĐ)
           └── Các phòng quản lý
                ├── Phòng Tài chính Tổng hợp
                ├── Phòng Kinh doanh
                ├── Phòng Marketing
                ├── Phòng Kỹ thuật và Bảo hành
                └── Phòng Dự án
```

### 1.1 Địa điểm hoạt động [PDF]
| Loại | Địa điểm |
|---|---|
| Trụ sở chính | 275-279 Diên Hồng, P. Hòa Xuân, Đà Nẵng |
| Văn phòng (3) | Hà Nội, Đà Nẵng, TP. Hồ Chí Minh |
| Văn phòng miền Nam / Trung tâm dịch vụ | Số 02, Đường 27, P. Hiệp Bình, TP.HCM (SAJ Service Center) |
| Trung tâm dịch vụ | 3 trung tâm (PDF chỉ nêu tên trung tâm tại TP.HCM) **(CẦN XÁC NHẬN: 2 trung tâm còn lại)** |
| Kho 3 miền | Bắc: Vân Trì, Vân Nội, Đông Anh, Hà Nội. Trung: CN1 275-279 Diên Hồng; CN2 Võ An Ninh – Phan Triêm, Hòa Xuân. Nam: CN1 02 Nguyễn Ảnh Thủ, Q.12; CN2 Ngã 3 Sáu Dẫu, Ấp 1, xã Châu Pha, TP.HCM |

### 1.2 Quy mô nhân sự [PDF]
50+ nhân sự (số liệu tại thời điểm lập hồ sơ). Cần bộ phận Nhân sự cập nhật số thực tế.

### 1.3 Năm lĩnh vực kinh doanh [PDF] – căn cứ để chia nhiệm vụ
1. Tư vấn, lập dự án đầu tư lĩnh vực điện và điện năng lượng tái tạo.
2. Nhà phân phối thiết bị điện năng lượng tái tạo chính hãng.
3. Thi công lắp đặt trọn gói công trình điện năng lượng tái tạo (EPC).
4. Vận hành, bảo trì, bảo dưỡng công trình điện và điện năng lượng tái tạo (O&M).
5. Đầu tư dự án điện năng lượng mặt trời.

---

## 2. Phân loại đơn vị (cho dev)

| Mã | Tên | `type` | Cấp | Có trong PDF |
|---|---|---|---|---|
| `DHCD` | Đại hội cổ đông | `governance` | 0 | Có |
| `HDQT` | Hội đồng quản trị | `governance` | 1 | Có |
| `BKS` | Ban Kiểm soát | `governance` | 1 (song song HĐQT) | Có |
| `BTGD` | Ban Tổng giám đốc | `executive` | 2 | Có |
| `TCTH` | Phòng Tài chính Tổng hợp | `department` | 3 | Có |
| `KD` | Phòng Kinh doanh | `department` | 3 | Có |
| `MKT` | Phòng Marketing | `department` | 3 | Có |
| `KTBH` | Phòng Kỹ thuật và Bảo hành | `department` | 3 | Có |
| `DA` | Phòng Dự án | `department` | 3 | Có |

**Khuyến nghị:** `DHCD`, `HDQT`, `BKS` là cơ quan quản trị, không phải nơi giao task hằng ngày. Dev nên đặt `type = governance` và mặc định ẩn khỏi danh sách "phòng ban giao việc". Quan hệ `parent_id` theo sơ đồ ở mục 1.

---

## 3. Chi tiết từng đơn vị

### 3.1 Ban Tổng giám đốc (`BTGD`)
**Chức năng:** Điều hành toàn bộ hoạt động hằng ngày theo nghị quyết HĐQT; chịu trách nhiệm kết quả kinh doanh.

**Nhiệm vụ [ĐỀ XUẤT]:**
- Xây dựng kế hoạch kinh doanh, ngân sách năm; trình HĐQT phê duyệt.
- Phê duyệt hợp đồng EPC, hợp đồng phân phối và báo giá vượt hạn mức phân quyền.
- Quyết định nhân sự cấp trưởng/phó phòng, quy chế lương thưởng.
- Quản lý quan hệ với đối tác chiến lược (SAJ, TCL Solar, Huawei, Sungrow, Dyness…) và ngân hàng đối tác (MB, Techcombank, BIDV).
- Phê duyệt đầu tư dự án điện mặt trời tự đầu tư.
- Giám sát tiến độ, chất lượng, an toàn của dự án trọng điểm.
- Tổng hợp báo cáo định kỳ (tuần/tháng/quý) báo cáo HĐQT.

**Quyền trong hệ thống:** xem toàn bộ dashboard, báo cáo doanh thu, hợp đồng, dự án; duyệt các yêu cầu cấp công ty.

---

### 3.2 Phòng Tài chính Tổng hợp (`TCTH`)
**Chức năng:** Quản lý tài chính, kế toán, pháp lý, hành chính và nhân sự của toàn công ty. Tên "Tổng hợp" cho thấy phòng đảm nhiệm cả các mảng hỗ trợ **(CẦN XÁC NHẬN: Hành chính – Nhân sự và Pháp chế có tách riêng hay không)**.

**Nhóm nhiệm vụ [ĐỀ XUẤT]:**

*A. Kế toán – Tài chính*
- Hạch toán, lập báo cáo tài chính, báo cáo thuế; quyết toán cuối năm.
- Quản lý công nợ phải thu (khách hàng, đại lý) và phải trả (nhà cung cấp, nhà thầu phụ); đối chiếu và nhắc nợ định kỳ.
- Lập hóa đơn VAT đầu ra; kiểm soát hóa đơn đầu vào.
- Quản lý dòng tiền, kế hoạch thanh toán, hạn mức vay và bảo lãnh ngân hàng (MB, Techcombank, BIDV).
- Theo dõi chi phí dự án so với ngân sách, lãi/lỗ theo từng hợp đồng.
- Thanh toán quốc tế và theo dõi chi phí nhập khẩu (thuế, vận chuyển, bảo hiểm).
- Quản lý tồn kho về mặt giá trị, kiểm kê định kỳ cùng bộ phận kho.

*B. Hành chính – Nhân sự*
- Tuyển dụng, onboarding, hợp đồng lao động, bảo hiểm, chấm công, lương thưởng.
- Đào tạo nội bộ và đào tạo an toàn lao động (phối hợp Phòng Kỹ thuật và Phòng Dự án).
- Quản lý tài sản, văn phòng phẩm, xe, thiết bị văn phòng 3 miền.
- Quản lý hồ sơ nhân sự và danh bạ nội bộ (dữ liệu nhạy cảm, quyền hạn chế).

*C. Pháp lý – Hợp đồng*
- Soạn thảo, rà soát hợp đồng EPC, hợp đồng mua bán, hợp đồng nhà thầu phụ.
- Lưu trữ giấy phép kinh doanh, chứng nhận nhà phân phối, theo dõi ngày hết hạn (xem mục 5).
- Theo dõi thay đổi đăng ký doanh nghiệp, địa chỉ, người đại diện.

**Đầu ra / KPI [ĐỀ XUẤT]:** báo cáo tài chính đúng hạn; tỷ lệ thu hồi công nợ đúng hạn; số ngày công nợ bình quân (DSO); sai lệch ngân sách dự án; tỷ lệ hồ sơ pháp lý còn hiệu lực.

**Liên quan module hiện có:** Contracts, Revenue, Inventory (giá trị), Reports, Users (nhân sự).

---

### 3.3 Phòng Kinh doanh (`KD`)
**Chức năng:** Phát triển thị trường, bán giải pháp điện mặt trời và phân phối thiết bị chính hãng; chịu trách nhiệm doanh số.

**Nhóm nhiệm vụ [ĐỀ XUẤT]:**

*A. Kinh doanh giải pháp (Residential, Commercial, Utility)*
- Tìm kiếm, chăm sóc khách hàng hộ gia đình, doanh nghiệp, khu công nghiệp (FDI và trong nước).
- Tiếp nhận nhu cầu, tư vấn sơ bộ, hẹn khảo sát cùng Phòng Kỹ thuật.
- Lập báo giá, đàm phán, ký hợp đồng; bàn giao cho Phòng Dự án triển khai.
- Quản lý pipeline (lead → khảo sát → báo giá → đàm phán → ký → bàn giao).
- Sử dụng công cụ dự toán chi phí và lợi nhuận đầu tư trên website cho khách hàng.

*B. Phân phối thiết bị (Master Distributor / Authorized Distributor)*
- Quản lý hệ thống đại lý 3 miền: ký hợp đồng đại lý, chính sách giá, chiết khấu, hạn mức công nợ.
- Làm việc với hãng (SAJ, TCL Solar, Huawei, Sungrow, Solis, Dyness, Sigenergy, Jinko, JA Solar, Canadian Solar, AIKO, AESOLAR, Sunova…) về giá, hạn mức, chỉ tiêu doanh số.
- Lập kế hoạch nhập hàng theo dự báo bán; đặt hàng, theo dõi lô hàng về cảng/kho.
- Quản lý chứng nhận CO, CQ, bảo hành chính hãng cho từng lô.

*C. Kho vận và logistics* **(CẦN XÁC NHẬN: PDF có 3 miền kho nhưng không nêu phòng quản lý kho)**
- Nhập, xuất, tồn kho tại 6 kho; kiểm kê; điều chuyển giữa các kho.
- Giao hàng đến công trình và đại lý.
- Vận hành xe nâng, thiết bị bốc xếp theo quy định an toàn.

**Đầu ra / KPI [ĐỀ XUẤT]:** doanh số theo tháng/quý/miền; số lead và tỷ lệ chốt; doanh số theo hãng; số đại lý hoạt động; vòng quay tồn kho; tỷ lệ giao hàng đúng hẹn; sai lệch kiểm kê.

**Liên quan module hiện có:** Contracts (báo giá, hợp đồng bán, hóa đơn xuất), Inventory, Clients, Products, Revenue.

**Đề xuất tổ chức nội bộ (nhóm con):** `KD-DA` Kinh doanh dự án (C&I, Utility); `KD-DD` Kinh doanh dân dụng; `KD-PP` Phân phối và đại lý; `KD-KHO` Kho vận (nếu được duyệt).

---

### 3.4 Phòng Marketing (`MKT`)
**Chức năng:** Xây dựng và quảng bá thương hiệu TRAN LE ELECTRICITY; tạo nguồn khách hàng tiềm năng cho Phòng Kinh doanh.

**Nhiệm vụ [ĐỀ XUẤT]:**
- Quản lý bộ nhận diện thương hiệu (logo, màu, thông điệp "Solar Energy – Where the future begins").
- Quản trị website tranlecorp.com (song ngữ Việt/Anh), SEO, nội dung, datasheet, tài liệu sản phẩm.
- Quản lý kênh mạng xã hội, quảng cáo trả phí, email marketing; chuyển lead về KD.
- Biên soạn và cập nhật hồ sơ năng lực, brochure, case study dự án (kể cả dự án cộng đồng).
- Tổ chức sự kiện: hội thảo khách hàng/đại lý (ví dụ SolarTech Revolution 2025 Đà Nẵng), lễ ký kết với hãng, khai trương văn phòng/trung tâm, tham gia triển lãm (ví dụ SNEC).
- Truyền thông các hợp tác chiến lược (SAJ, TCL Solar, Huawei…).
- Triển khai chương trình cộng đồng (điểm trường vùng cao có điện mặt trời): lập kế hoạch, vận động nhà tài trợ, truyền thông kết quả.
- Phối hợp pháp chế khi dùng logo, hình ảnh và tên hãng (tránh dùng sai chứng nhận hết hạn).

**Đầu ra / KPI [ĐỀ XUẤT]:** số lead đạt chuẩn; chi phí mỗi lead; lưu lượng website và tỷ lệ chuyển đổi; số sự kiện/quý; số bài viết, case study phát hành.

**Liên quan module hiện có:** Tasks, Calendar (lịch sự kiện), Documents.

---

### 3.5 Phòng Kỹ thuật và Bảo hành (`KTBH`)
**Chức năng:** Tư vấn và thiết kế kỹ thuật; vận hành, bảo trì (O&M); bảo hành và hỗ trợ kỹ thuật sau bán hàng; quản lý Trung tâm Dịch vụ.

**Nhóm nhiệm vụ [ĐỀ XUẤT]:**

*A. Tư vấn – Thiết kế kỹ thuật*
- Khảo sát hiện trạng (mái, đất, hệ thống điện, hồ sơ phụ tải); dùng flycam, camera nhiệt, máy đo khoảng cách.
- Thiết kế hệ thống On-grid, Hybrid, Off-grid, Solar Pump, Utility; mô phỏng sản lượng; lập bản vẽ, sơ đồ đơn tuyến, bảng khối lượng (BOQ).
- Chọn thiết bị theo yêu cầu kỹ thuật (tấm pin, inverter, pin lưu trữ, cáp, phụ kiện).
- Lập hồ sơ kỹ thuật phục vụ đấu nối với điện lực và cấp phép.
- Lập dự án đầu tư, tính toán hiệu quả tài chính cho khách hàng.

*B. Vận hành và bảo trì (O&M)*
- Giám sát vận hành từ xa; xử lý cảnh báo, sự cố.
- Bảo trì định kỳ: vệ sinh tấm pin, kiểm tra điểm nối, đo điện trở cách điện, đo điện trở đất, phân tích đường cong I-V, chụp nhiệt.
- Lập báo cáo vận hành, sản lượng, hiệu suất cho khách hàng.
- Ký và theo dõi hợp đồng O&M.

*C. Bảo hành và Trung tâm Dịch vụ*
- Tiếp nhận yêu cầu bảo hành, phân loại, giao kỹ thuật viên, theo dõi đến khi đóng.
- Làm việc với hãng để RMA, đổi trả bảo hành chính hãng.
- Vận hành SAJ Service Center tại Việt Nam (bảo hành chuyên sâu, đào tạo kỹ thuật, mở rộng mạng lưới dịch vụ).
- Hỗ trợ kỹ thuật 24/7: hotline, trực ca, quy trình leo thang sự cố.
- Đào tạo kỹ thuật cho đại lý, khách hàng, đội thi công.

*D. Quản lý thiết bị đo kiểm* [PDF: danh mục trang thiết bị]
- Quản lý tài sản: đồng hồ đo dòng điện/điện áp, đo thứ tự pha, Fluke 1623-2, PVA-1500, HIOKI IR4053-10, Fluke 124B, camera nhiệt Fluke TiS55+, DJI Mini 4 Pro, bộ công cụ Stäubli, thiết bị đo lực…
- Hiệu chuẩn định kỳ, cấp phát, thu hồi, ghi nhật ký sử dụng.

**Đầu ra / KPI [ĐỀ XUẤT]:** thời gian phản hồi sự cố; thời gian xử lý bảo hành trung bình; tỷ lệ xử lý lần đầu; số ca bảo hành mở/đóng; tỷ lệ hoàn thành bảo trì định kỳ; độ chính xác thiết kế so với thực tế.

**Liên quan module hiện có:** Tasks (ticket bảo hành), Projects (giai đoạn khảo sát/thiết kế), Documents (bản vẽ), Calendar (lịch bảo trì).

**Đề xuất nhóm con:** `KTBH-TK` Tư vấn thiết kế; `KTBH-OM` Vận hành và bảo trì; `KTBH-BH` Bảo hành – Trung tâm dịch vụ (theo từng trung tâm/miền); `KTBH-HT` Hỗ trợ kỹ thuật 24/7.

---

### 3.6 Phòng Dự án (`DA`)
**Chức năng:** Quản lý và triển khai thi công các dự án EPC từ khi ký hợp đồng đến nghiệm thu, bàn giao.

**Nhiệm vụ [ĐỀ XUẤT]:**

*A. Quản lý dự án*
- Nhận bàn giao hợp đồng từ KD; lập kế hoạch dự án (tiến độ, nguồn lực, ngân sách, rủi ro).
- Chỉ định chỉ huy trưởng/quản lý dự án (PM) cho từng dự án.
- Họp tiến độ định kỳ; báo cáo tuần/tháng cho BTGĐ và khách hàng.
- Quản lý thay đổi khối lượng, phát sinh và biên bản liên quan.
- Kiểm soát chi phí thực tế so với ngân sách (phối hợp TCTH).

*B. Mua sắm và cung ứng cho dự án*
- Lập danh mục vật tư theo BOQ; đề xuất mua hàng; yêu cầu xuất kho từ kho 3 miền.
- Điều phối giao hàng đến công trường; kiểm tra số lượng, chất lượng khi nhận.
- Quản lý nhà thầu phụ và nhà cung cấp dịch vụ.

*C. Thi công và giám sát*
- Điều hành đội thi công lắp đặt (khung giá đỡ, tấm pin, inverter, pin lưu trữ, cáp, tủ điện, tiếp địa).
- Giám sát chất lượng theo bản vẽ và tiêu chuẩn kỹ thuật.
- Thực hiện kiểm tra, thử nghiệm trước đóng điện (đo cách điện, đo điện trở đất, kiểm tra thứ tự pha, I-V).
- Quản lý an toàn lao động (HSE): làm việc trên cao, trang bị bảo hộ (dây an toàn, mũ…), huấn luyện, báo cáo sự cố.
- Quản lý tài sản thi công: xe nâng, máy khoan pin, công cụ lắp đặt.

*D. Nghiệm thu – Bàn giao – Hậu dự án*
- Nghiệm thu nội bộ và với chủ đầu tư; hoàn thiện hồ sơ hoàn công; làm thủ tục đấu nối.
- Bàn giao hệ thống cho Phòng Kỹ thuật và Bảo hành (O&M, bảo hành).
- Đóng dự án: quyết toán với TCTH, tổng kết bài học kinh nghiệm.
- Cung cấp hình ảnh, số liệu hoàn thành cho Marketing làm case study.

*E. Đầu tư dự án điện mặt trời* **(CẦN XÁC NHẬN: PDF có lĩnh vực này nhưng không nêu đơn vị phụ trách)**
- Đề xuất: Phòng Dự án phối hợp BTGĐ và TCTH đánh giá hiệu quả và triển khai các dự án tự đầu tư.

**Đầu ra / KPI [ĐỀ XUẤT]:** tỷ lệ dự án đúng tiến độ; chênh lệch chi phí so với ngân sách; số sự cố an toàn (mục tiêu 0); điểm hài lòng của chủ đầu tư khi nghiệm thu; thời gian từ ký hợp đồng đến đóng điện.

**Liên quan module hiện có:** Projects, Tasks, Contracts (đầu ra), Inventory (xuất kho), Reports.

---

### 3.7 Cơ quan quản trị (chỉ để hiển thị cơ cấu, không giao task)

| Đơn vị | Chức năng [ĐỀ XUẤT] |
|---|---|
| **Đại hội cổ đông** | Cơ quan quyền lực cao nhất: thông qua định hướng, báo cáo tài chính, phân phối lợi nhuận; bầu/miễn nhiệm HĐQT và BKS. |
| **Hội đồng quản trị** | Quyết định chiến lược, kế hoạch kinh doanh, đầu tư lớn; bổ nhiệm, giám sát Ban TGĐ. |
| **Ban Kiểm soát** | Kiểm tra tính hợp pháp, trung thực của hoạt động quản lý và báo cáo tài chính; báo cáo ĐHCĐ. |

---

## 4. Ma trận phối hợp giữa các phòng

| Quy trình | Bắt đầu | Phối hợp | Kết thúc |
|---|---|---|---|
| Bán dự án EPC | KD (lead, báo giá) | KTBH (khảo sát, thiết kế), TCTH (điều khoản thanh toán, pháp lý) | BTGĐ duyệt, ký hợp đồng |
| Triển khai dự án | DA (nhận bàn giao) | KD (kho, cung ứng), KTBH (hỗ trợ kỹ thuật), TCTH (thanh toán) | Nghiệm thu, bàn giao KTBH |
| Bán hàng phân phối | KD | TCTH (công nợ, hóa đơn), kho | Giao hàng, thu tiền |
| Bảo hành / O&M | KTBH | KD (thông tin hợp đồng), hãng | Đóng ticket |
| Truyền thông dự án | MKT | DA (hình ảnh), KD (khách hàng đồng ý) | Đăng bài, case study |
| Hết hạn chứng nhận đối tác | TCTH (theo dõi) | KD, MKT | Gia hạn hoặc gỡ khỏi tài liệu |

---

## 5. Dữ liệu cho dev

### 5.1 Trường dữ liệu đề xuất cho bảng `departments`
```
id               string  (vd: "dept-kd")
code             string  (vd: "KD")
name_vi          string
name_en          string
type             enum    governance | executive | department | team
parent_id        string  nullable
head_user_id     string  nullable   (trưởng phòng)
deputy_user_ids  string[]
description      text
responsibilities json     (mảng nhóm nhiệm vụ)
kpis             json
locations        string[] (hn, dn, hcm)
can_assign_tasks boolean  (false với DHCD, HDQT, BKS)
color            string
sort_order       int
is_active        boolean
```

### 5.2 Dữ liệu khởi tạo (seed)
```json
[
  {"id":"dept-dhcd","code":"DHCD","name_vi":"Đại hội cổ đông","name_en":"General Meeting of Shareholders","type":"governance","parent_id":null,"can_assign_tasks":false,"sort_order":1},
  {"id":"dept-hdqt","code":"HDQT","name_vi":"Hội đồng quản trị","name_en":"Board of Directors","type":"governance","parent_id":"dept-dhcd","can_assign_tasks":false,"sort_order":2},
  {"id":"dept-bks","code":"BKS","name_vi":"Ban Kiểm soát","name_en":"Supervisory Board","type":"governance","parent_id":"dept-dhcd","can_assign_tasks":false,"sort_order":3},
  {"id":"dept-btgd","code":"BTGD","name_vi":"Ban Tổng giám đốc","name_en":"Executive Board","type":"executive","parent_id":"dept-hdqt","can_assign_tasks":true,"sort_order":4},
  {"id":"dept-tcth","code":"TCTH","name_vi":"Phòng Tài chính Tổng hợp","name_en":"Finance & General Affairs","type":"department","parent_id":"dept-btgd","can_assign_tasks":true,"sort_order":5},
  {"id":"dept-kd","code":"KD","name_vi":"Phòng Kinh doanh","name_en":"Sales & Distribution","type":"department","parent_id":"dept-btgd","can_assign_tasks":true,"sort_order":6},
  {"id":"dept-mkt","code":"MKT","name_vi":"Phòng Marketing","name_en":"Marketing","type":"department","parent_id":"dept-btgd","can_assign_tasks":true,"sort_order":7},
  {"id":"dept-ktbh","code":"KTBH","name_vi":"Phòng Kỹ thuật và Bảo hành","name_en":"Technical & Warranty","type":"department","parent_id":"dept-btgd","can_assign_tasks":true,"sort_order":8},
  {"id":"dept-da","code":"DA","name_vi":"Phòng Dự án","name_en":"Project Management","type":"department","parent_id":"dept-btgd","can_assign_tasks":true,"sort_order":9}
]
```

### 5.3 Nhóm con đề xuất (`type = team`, tạo sau khi ban lãnh đạo duyệt)
```
KD-DA   Kinh doanh dự án (C&I, Utility)        parent: dept-kd
KD-DD   Kinh doanh dân dụng                     parent: dept-kd
KD-PP   Phân phối và đại lý                     parent: dept-kd
KD-KHO  Kho vận (CẦN XÁC NHẬN)                  parent: dept-kd
KTBH-TK Tư vấn – Thiết kế                       parent: dept-ktbh
KTBH-OM Vận hành và bảo trì (O&M)               parent: dept-ktbh
KTBH-BH Bảo hành – Trung tâm dịch vụ            parent: dept-ktbh
KTBH-HT Hỗ trợ kỹ thuật 24/7                    parent: dept-ktbh
TCTH-KT Kế toán – Tài chính                     parent: dept-tcth
TCTH-HC Hành chính – Nhân sự (CẦN XÁC NHẬN)     parent: dept-tcth
TCTH-PC Pháp lý – Hợp đồng                      parent: dept-tcth
```

### 5.4 Ánh xạ từ phòng ban hiện có trong repo sang cấu trúc mới

| Phòng ban hiện tại (`db_mysql.ts`) | Chuyển sang |
|---|---|
| Ban Lãnh Đạo (`dept-board`), Board | `BTGD` (HĐQT tách riêng, `governance`) |
| Khối Tổng Thầu EPC & Thi Công (`dept-epc`) | `DA` |
| Trung Tâm Dịch Vụ & Bảo Hành O&M (`dept-om`) | `KTBH-OM` + `KTBH-BH` |
| Phòng Tư Vấn & Thiết Kế Kỹ Thuật (`dept-design`) | `KTBH-TK` |
| Phòng Kinh Doanh & Phân Phối (`dept-sales`), Sales | `KD` |
| Phòng Kế Toán & Tài Chính (`dept-finance`), Finance | `TCTH-KT` |
| Phòng Hành Chính & Nhân Sự (`dept-hr`), HR | `TCTH-HC` |
| Marketing (`dept-marketing`) | `MKT` |
| Product (`dept-product`) | `KD` (quản lý danh mục sản phẩm) |
| IT (`dept-it`) | PDF không có phòng IT. Gắn tạm vào `TCTH` hoặc `MKT` **(CẦN XÁC NHẬN)** |

**Lưu ý migration:** các bản ghi đang gắn `department` bằng chuỗi tên (ví dụ `'Khối Tổng Thầu EPC & Thi Công'` trong bảng users và projects) cần chuyển sang tham chiếu `department_id`. Nên viết script ánh xạ theo bảng trên và giữ lại cột tên cũ cho đến khi kiểm tra xong. Đồng thời cập nhật `ctc_knowledge.ts` để bot AI trả lời đúng cơ cấu mới.

### 5.5 Gợi ý phân quyền theo vai trò hiện có (Admin, Director, Manager, Employee)
- **Director (BTGĐ):** xem mọi phòng, mọi dự án, mọi báo cáo; duyệt cấp công ty.
- **Manager (trưởng phòng):** quản lý user, task, báo cáo của phòng mình; xem dữ liệu phòng phối hợp theo ma trận mục 4.
- **Employee:** xem và xử lý task được giao; xem dự án mình tham gia.
- **Dữ liệu nhạy cảm:** hồ sơ nhân sự (CCCD, ngày sinh…) chỉ `TCTH-HC` và Admin được xem; công nợ và tài chính chỉ `TCTH`, BTGĐ.
- `governance` không có task; chỉ có quyền xem báo cáo tổng hợp được gán.

---

## 6. Danh sách cần ban lãnh đạo xác nhận trước khi go-live

1. Chức năng, nhiệm vụ ở mục 3 có đúng với thực tế vận hành không (đây là bản đề xuất).
2. Hành chính – Nhân sự và Pháp chế nằm trong Phòng Tài chính Tổng hợp hay tách riêng.
3. Ai quản lý kho (KD, DA hay một bộ phận riêng).
4. Phòng nào phụ trách đầu tư dự án điện mặt trời tự đầu tư.
5. Vị trí 3 Trung tâm dịch vụ và nhân sự từng trung tâm.
6. Có giữ IT như một phòng riêng không.
7. Tên trưởng phòng và nhân sự từng phòng để gán `head_user_id`.
