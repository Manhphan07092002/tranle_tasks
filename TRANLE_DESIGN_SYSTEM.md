# TRAN LE — DESIGN SYSTEM & COLOR TOKENS

> Purpose: Nguồn cấu hình giao diện chuẩn cho website Tran Le Electricity.
> Dùng cho Claude Code, Antigravity, Cursor hoặc frontend developers.
> Nguồn nhận diện: https://tranlecorp.com/
>
> IMPORTANT:
> - Ưu tiên giữ tinh thần nhận diện hiện có của Tran Le Electricity.
> - Không tự ý đổi palette sang phong cách khác nếu chưa có yêu cầu.
> - Các màu trong file được tổ chức thành token để dễ thay đổi đồng bộ.
> - Khi triển khai lại website từ giao diện live mà không có source CSS, cần coi các token đánh dấu `INFERRED` là màu tái tạo theo giao diện, không phải mã CSS gốc của server.

---

# 1. BRAND DIRECTION

## 1.1. Brand

**Tên:** Tran Le Electricity  
**Tên tiếng Việt:** Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê  
**Lĩnh vực:** Năng lượng tái tạo / Điện mặt trời  
**Website:** https://tranlecorp.com/

## 1.2. Brand message

- Mang năng lượng sạch đến mọi nhà.
- Uy tín.
- Chất lượng.
- Bền vững.
- Công nghệ.
- Hiệu quả năng lượng.
- Phát triển xanh.

## 1.3. Design personality

Giao diện phải truyền tải:

**Modern + Clean + Technical + Sustainable + Trustworthy + Premium**

Không sử dụng phong cách:
- Quá màu mè.
- Quá neon.
- Gaming.
- Cartoon.
- Glassmorphism nặng.
- Gradient quá mạnh.
- Card bo góc quá lớn.
- Shadow quá đậm.

---

# 2. CORE COLOR SYSTEM

## 2.1. Primary — Energy Green

> `INFERRED`: palette tái tạo theo nhận diện và ngôn ngữ hình ảnh của website live. Khi lấy được CSS gốc, thay token này bằng giá trị xác minh.

```css
--color-primary-50:  #F0FDF4;
--color-primary-100: #DCFCE7;
--color-primary-200: #BBF7D0;
--color-primary-300: #86EFAC;
--color-primary-400: #4ADE80;
--color-primary-500: #22C55E;
--color-primary-600: #16A34A;
--color-primary-700: #15803D;
--color-primary-800: #166534;
--color-primary-900: #14532D;
```

### Primary usage

```text
Primary 600 → CTA chính
Primary 700 → Hover
Primary 800 → Active / dark variant
Primary 50  → Background xanh rất nhạt
Primary 100 → Badge / soft section
Primary 900 → Heading/brand accent trên nền sáng
```

**Default brand color: `#16A34A`**

---

# 3. SECONDARY COLOR — SOLAR / SUN

Màu phụ đại diện cho mặt trời, năng lượng và điểm nhấn thương mại.

```css
--color-secondary-50:  #FFFBEB;
--color-secondary-100: #FEF3C7;
--color-secondary-200: #FDE68A;
--color-secondary-300: #FCD34D;
--color-secondary-400: #FBBF24;
--color-secondary-500: #F59E0B;
--color-secondary-600: #D97706;
--color-secondary-700: #B45309;
```

**Default solar accent: `#F59E0B`**

### Không lạm dụng màu vàng

Màu vàng/cam chỉ dùng cho:
- Điểm nhấn.
- Icon năng lượng.
- Highlight.
- KPI.
- Badge.
- Một số trạng thái/visual liên quan Solar.

Không dùng vàng cho toàn bộ button hoặc background chính.

---

# 4. DARK / NAVY SYSTEM

Dùng cho heading, header, footer và các vùng cần độ tương phản cao.

```css
--color-dark-950: #020617;
--color-dark-900: #0F172A;
--color-dark-800: #1E293B;
--color-dark-700: #334155;
--color-dark-600: #475569;
--color-dark-500: #64748B;
```

### Recommended

```text
Heading:   #0F172A
Body:      #334155
Muted:     #64748B
Footer:    #020617 / #0F172A
```

---

# 5. NEUTRAL SYSTEM

```css
--color-neutral-0:   #FFFFFF;
--color-neutral-50:  #F8FAFC;
--color-neutral-100: #F1F5F9;
--color-neutral-200: #E2E8F0;
--color-neutral-300: #CBD5E1;
--color-neutral-400: #94A3B8;
--color-neutral-500: #64748B;
--color-neutral-600: #475569;
--color-neutral-700: #334155;
--color-neutral-800: #1E293B;
--color-neutral-900: #0F172A;
```

---

# 6. SEMANTIC COLORS

```css
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error:   #EF4444;
--color-info:    #0EA5E9;
```

Soft backgrounds:

```css
--color-success-soft: #F0FDF4;
--color-warning-soft: #FFFBEB;
--color-error-soft:   #FEF2F2;
--color-info-soft:    #F0F9FF;
```

---

# 7. DESIGN TOKEN — CSS VARIABLES

Dùng bộ token sau làm lớp abstraction chính:

```css
:root {
  /* Brand */
  --brand-primary: #16A34A;
  --brand-primary-hover: #15803D;
  --brand-primary-active: #166534;
  --brand-primary-soft: #F0FDF4;

  --brand-secondary: #F59E0B;
  --brand-secondary-hover: #D97706;
  --brand-secondary-soft: #FFFBEB;

  /* Text */
  --text-heading: #0F172A;
  --text-body: #334155;
  --text-muted: #64748B;
  --text-inverse: #FFFFFF;

  /* Surface */
  --surface: #FFFFFF;
  --surface-soft: #F8FAFC;
  --surface-muted: #F1F5F9;
  --surface-dark: #0F172A;

  /* Border */
  --border: #E2E8F0;
  --border-strong: #CBD5E1;

  /* Status */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #0EA5E9;
}
```

---

# 8. TYPOGRAPHY

## 8.1. Font direction

Ưu tiên một sans-serif hiện đại, dễ đọc, hỗ trợ tiếng Việt tốt.

Recommended stack:

```css
font-family:
  Inter,
  "Segoe UI",
  Roboto,
  Arial,
  sans-serif;
```

Nếu triển khai bằng Google Fonts, ưu tiên **Inter** hoặc **Manrope**.

## 8.2. Font weights

```text
400 → Body
500 → Label / navigation
600 → Button / card title
700 → Heading
800 → Hero heading / số liệu nổi bật
```

## 8.3. Type scale

```css
--text-xs: 12px;
--text-sm: 14px;
--text-md: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
--text-4xl: 36px;
--text-5xl: 48px;
--text-6xl: 60px;
```

Desktop headings:

```text
H1: 48–60px / 1.05–1.15
H2: 36–44px / 1.15
H3: 24–30px / 1.2
H4: 20–24px / 1.3
```

Mobile:

```text
H1: 32–40px
H2: 28–34px
H3: 22–26px
```

---

# 9. SPACING SYSTEM

Dùng hệ số 4px:

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;
```

Section spacing:

```text
Desktop: 80–120px
Tablet:  64–88px
Mobile:  48–64px
```

---

# 10. LAYOUT

## Container

```css
--container-max: 1280px;
--container-padding: 24px;
```

Recommended breakpoints:

```text
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## Grid

Product / project / article:

```text
Desktop: 4 → 3 columns
Tablet:  2 columns
Mobile:  1 column
```

Solution cards:

```text
Desktop: 3 columns
Tablet:  2 columns
Mobile:  1 column
```

---

# 11. BORDER RADIUS

Phong cách cần hiện đại nhưng không quá “app”.

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 18px;
--radius-full: 9999px;
```

Recommended:
- Button: 8–10px
- Card: 12–16px
- Input: 8–10px
- Badge: 9999px
- Image: 12–16px

---

# 12. SHADOW

Dùng shadow nhẹ:

```css
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 4px 14px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.10);
```

Không dùng:
- Glow mạnh.
- Neon shadow.
- Shadow đen nặng.

---

# 13. BUTTON SYSTEM

## Primary button

```css
background: #16A34A;
color: #FFFFFF;
border-radius: 10px;
font-weight: 600;
```

Hover:

```css
background: #15803D;
```

Active:

```css
background: #166534;
```

## Secondary button

```css
background: #FFFFFF;
color: #16A34A;
border: 1px solid #16A34A;
```

## Solar CTA

```css
background: #F59E0B;
color: #FFFFFF;
```

Chỉ sử dụng cho CTA liên quan:
- Tư vấn hệ thống.
- Tiết kiệm điện.
- Solar calculator.
- Năng lượng mặt trời.

---

# 14. HEADER

Header cần thể hiện tính doanh nghiệp.

## Desktop

```text
[LOGO] [Sản phẩm] [Giải pháp] [Dự án] [Dịch vụ] [Về chúng tôi] [Tin tức] [Liên hệ]
                                              [CTA]
```

Đặc điểm:
- Background trắng hoặc rất sáng.
- Logo rõ.
- Menu chữ dark.
- Active menu dùng `#16A34A`.
- Header sticky.
- Shadow/border nhẹ khi scroll.

## Mobile

```text
[LOGO]                         [MENU]
```

Menu mobile dạng drawer.

---

# 15. HERO

Hero phải tạo cảm giác:

**Clean Energy + Technology + Trust**

Layout:

```text
┌─────────────────────────────────────────┐
│ Eyebrow                                 │
│ Heading lớn                              │
│ Mô tả                                    │
│ [CTA primary] [CTA secondary]            │
│                                          │
│                         Hình solar/solar  │
│                         installation     │
└─────────────────────────────────────────┘
```

Ưu tiên hình ảnh:
- Solar panels.
- Nhà máy.
- Hệ thống điện.
- Pin lưu trữ.
- Kỹ thuật viên.
- Công trình thực tế.

Không dùng hình ảnh stock quá giả hoặc hình AI rõ nét giả tạo.

---

# 16. PRODUCT CARD

Product card cần có:

```text
[IMAGE]
Brand
Product name
Short specification
Key KPI
Price / Contact
[View detail]
```

Style:
- White background.
- Border `#E2E8F0`.
- Radius 14–16px.
- Hover nhẹ.
- Ảnh sản phẩm là trung tâm.
- Không nhồi quá nhiều text.

Hover:

```text
translateY(-2px)
shadow-md
border-color → primary
```

---

# 17. SOLUTION CARD

Các nhóm chính:

- Residential
- Commercial
- Utility
- On-Grid
- Hybrid
- Solar Pump
- Off-Grid

Card nên có:
- Hình.
- Icon.
- Tên giải pháp.
- 1–2 dòng mô tả.
- Link “Xem chi tiết”.

Accent:
- Green cho solution chính.
- Solar yellow cho điểm nhấn.

---

# 18. PROJECT CARD

Thông tin:

```text
Project image
Project name
Location
Capacity
Project type
View project
```

Ví dụ:

```text
Cocotex
4.5 MWp
Hồ Chí Minh
Industrial
```

Capacity cần làm nổi bật bằng typography lớn.

---

# 19. PARTNER LOGOS

Logo đối tác nằm trên nền sáng.

Quy tắc:
- Không bóp méo logo.
- Giữ aspect ratio.
- Chiều cao logo đồng nhất.
- Có khoảng trắng đủ lớn.
- Có thể dùng grayscale nhẹ; hover chuyển về màu nguyên bản.

Các thương hiệu xuất hiện trong nội dung website gồm:

```text
Huawei
SAJ
AIKO
Jinko Solar
JA Solar
Canadian Solar
SunPower
TCL Solar
Dyness
LONGi
```

---

# 20. INVESTMENT CALCULATOR

Calculator là component quan trọng.

Input:
- Tiền điện hàng tháng.
- Điện năng tiêu thụ.
- Khu vực.
- Công suất tấm pin.
- Loại hình lắp đặt.
- Tỷ lệ sử dụng điện ban ngày.
- Hệ khung.
- Số pha.
- Dung lượng lưu trữ.
- Số lượng tấm pin.
- Công suất inverter.

Output:
- Công suất hệ thống.
- Công suất inverter.
- Dung lượng lưu trữ.
- Số lượng tấm pin.
- Mức đầu tư.
- Tiết kiệm dự kiến.
- Thời gian hoàn vốn.
- CO2 giảm.

UI:
- Form rõ ràng.
- Label dễ đọc.
- Input cao khoảng 44–48px.
- Result cards nổi bật.
- Green cho kết quả tích cực.
- Yellow cho energy highlight.

---

# 21. FORMS

Input:

```css
height: 44–48px;
border: 1px solid #CBD5E1;
border-radius: 8–10px;
background: #FFFFFF;
```

Focus:

```css
border-color: #16A34A;
box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
```

Textarea:
- Min-height 120px.
- Resize vertical.

Error:
```css
border-color: #EF4444;
```

---

# 22. FOOTER

Footer phải mang tính doanh nghiệp.

Structure:

```text
Logo
Giới thiệu ngắn
────────────────────────────
Sản phẩm
Giải pháp
Dịch vụ
Dự án
────────────────────────────
Liên hệ
Hotline
Email
Địa chỉ
────────────────────────────
Social
Facebook
────────────────────────────
Copyright
```

Background:

```css
#0F172A
```

Text:

```css
#CBD5E1
```

Heading:

```css
#FFFFFF
```

Link hover:

```css
#4ADE80
```

---

# 23. IMAGE DIRECTION

Hình ảnh phải ưu tiên:

1. Công trình điện mặt trời thực tế.
2. Pin solar trên mái.
3. Nhà máy / commercial rooftop.
4. Battery energy storage.
5. Inverter.
6. Đội ngũ kỹ thuật.
7. Kỹ sư khảo sát/lắp đặt.
8. Hình ảnh dự án trước/sau.

Tông ảnh:
- Ánh sáng tự nhiên.
- Xanh lá / xanh trời.
- Industrial sạch.
- Nhiều ánh sáng.
- Contrast vừa phải.

Không dùng:
- Ảnh quá tối.
- Ảnh cyberpunk.
- Neon xanh.
- Ảnh quá “stock corporate”.

---

# 24. ICONOGRAPHY

Icon:
- Line icon.
- 1.5–2px stroke.
- Hình đơn giản.
- Phù hợp engineering/energy.

Ưu tiên:
- Lucide Icons.
- Phosphor Icons.
- Material Symbols nếu project đã dùng Google ecosystem.

Không dùng quá nhiều icon trong một card.

---

# 25. MOTION

Animation tinh tế.

Default:

```css
transition: 180ms ease;
```

Hover card:

```css
transform: translateY(-2px);
```

Button:

```css
transform: translateY(-1px);
```

Section reveal:
- Fade up.
- 250–450ms.
- Không dùng animation liên tục.

Accessibility:
- Respect `prefers-reduced-motion`.

---

# 26. ACCESSIBILITY

Minimum:
- WCAG-friendly contrast.
- Keyboard focus rõ.
- Không truyền tải thông tin chỉ bằng màu.
- Image có alt.
- Button có accessible name.
- Form có label.
- Heading hierarchy đúng.

Focus ring:

```css
outline: 3px solid rgba(22, 163, 74, 0.25);
outline-offset: 2px;
```

---

# 27. SEO / UI CONTENT DIRECTION

Tone of voice:

**Chuyên nghiệp + kỹ thuật + dễ hiểu + đáng tin cậy**

Không viết:
- “Siêu rẻ”.
- “Số 1 tuyệt đối” nếu không có chứng cứ.
- Claim kỹ thuật không có nguồn.

Ưu tiên:
- Công suất.
- Hiệu suất.
- Tiết kiệm.
- Độ bền.
- Bảo hành.
- Kỹ thuật.
- Dịch vụ sau bán hàng.
- Dự án thực tế.

---

# 28. BRAND COLOR CHEAT SHEET

```text
PRIMARY GREEN       #16A34A
PRIMARY HOVER       #15803D
PRIMARY ACTIVE      #166534
PRIMARY SOFT        #F0FDF4

SOLAR GOLD          #F59E0B
SOLAR HOVER         #D97706
SOLAR SOFT          #FFFBEB

HEADING             #0F172A
BODY TEXT           #334155
MUTED TEXT          #64748B

BACKGROUND          #FFFFFF
BACKGROUND SOFT     #F8FAFC
BORDER              #E2E8F0

SUCCESS             #22C55E
WARNING             #F59E0B
ERROR               #EF4444
INFO                #0EA5E9
```

---

# 29. AI IMPLEMENTATION RULES

Khi yêu cầu Claude/Antigravity xây UI cho Tran Le:

```text
1. Đọc file TRANLE-DESIGN-SYSTEM.md trước.
2. Không tự tạo palette mới.
3. Dùng design tokens thay vì hard-code màu rải rác.
4. Primary = Energy Green.
5. Secondary = Solar Gold.
6. Background chủ yếu là white / slate-50.
7. Typography hiện đại, sạch, technical.
8. Card radius vừa phải.
9. Shadow nhẹ.
10. Animation tối giản.
11. Ưu tiên responsive mobile-first.
12. Không phá vỡ tính doanh nghiệp.
13. Không dùng gradient/neon nếu không được yêu cầu.
14. Không claim dữ liệu doanh nghiệp nếu chưa có nguồn.
15. Giữ component nhất quán trên Product / Solution / Project / Blog.
```

---

# 30. COPY/PASTE PROMPT CHO CLAUDE / ANTIGRAVITY

```text
You are implementing the Tran Le Electricity website.

Before coding, read TRANLE-DESIGN-SYSTEM.md and treat it as the single source of truth for visual design.

Brand:
- Tran Le Electricity
- Renewable Energy / Solar Energy

Visual direction:
Modern, clean, technical, sustainable, trustworthy and premium.

Color:
- Primary Energy Green: #16A34A
- Primary Hover: #15803D
- Primary Active: #166534
- Solar Accent: #F59E0B
- Heading: #0F172A
- Body: #334155
- Muted: #64748B
- Background: #FFFFFF
- Soft Background: #F8FAFC
- Border: #E2E8F0

Rules:
- Use CSS variables/design tokens.
- Do not invent a different palette.
- Keep cards, buttons, forms, header and footer visually consistent.
- Use light shadows and moderate border radius.
- Avoid neon, excessive gradients and oversized rounded cards.
- Use responsive mobile-first layouts.
- Prioritize accessibility.
- Use real Tran Le business/product/project data whenever available.
- Never fabricate technical specifications.
```

---

# 31. IMPLEMENTATION STARTER CSS

```css
:root {
  --brand-primary: #16A34A;
  --brand-primary-hover: #15803D;
  --brand-primary-active: #166534;
  --brand-primary-soft: #F0FDF4;

  --brand-secondary: #F59E0B;
  --brand-secondary-hover: #D97706;
  --brand-secondary-soft: #FFFBEB;

  --text-heading: #0F172A;
  --text-body: #334155;
  --text-muted: #64748B;
  --text-inverse: #FFFFFF;

  --surface: #FFFFFF;
  --surface-soft: #F8FAFC;
  --surface-muted: #F1F5F9;
  --surface-dark: #0F172A;

  --border: #E2E8F0;
  --border-strong: #CBD5E1;

  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #0EA5E9;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 14px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.10);

  --container-max: 1280px;
  --container-padding: 24px;
}

body {
  font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
  color: var(--text-body);
  background: var(--surface);
}

h1, h2, h3, h4, h5, h6 {
  color: var(--text-heading);
}

a {
  color: inherit;
}

button {
  border-radius: var(--radius-md);
}
```

---

# 32. FINAL DESIGN PRINCIPLE

**“Clean Energy, Clean Interface.”**

Mọi màn hình của website Tran Le phải tạo cảm giác:

> Một công ty năng lượng tái tạo chuyên nghiệp, có năng lực kỹ thuật, có dự án thực tế, có sản phẩm chính hãng và có hệ thống dịch vụ đáng tin cậy.

Khi phải lựa chọn giữa “đẹp” và “đáng tin cậy”, ưu tiên **đáng tin cậy**.

---
