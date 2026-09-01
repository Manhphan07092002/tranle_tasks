import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSeed() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQL_PASSWORD || 'TranLe@Root2026!';
  const database = process.env.MYSQL_DATABASE || 'tranletask';

  console.log(`Connecting to MySQL at ${host}:${port}...`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user: 'root',
      password: process.env.MYSQL_ROOT_PASSWORD || 'TranLe@Root2026!',
      database,
      charset: 'utf8mb4',
    });
  } catch (err: any) {
    console.log('Trying with tranle user...');
    conn = await mysql.createConnection({
      host,
      port,
      user: process.env.MYSQL_USER || 'tranle',
      password: process.env.MYSQL_PASSWORD || 'TranLe@Pass2026!',
      database,
      charset: 'utf8mb4',
    });
  }

  console.log('Connected to MySQL successfully!');

  const now = new Date().toISOString();
  const adminPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'Tranle@123';
  const hashedPassword = await bcrypt.hash(adminPwd, 10);

  // 1. Roles
  const INITIAL_ROLES = [
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Toàn quyền quản trị hệ thống Tran Le Electricity.',
      color: '#ef4444',
      permissions: JSON.stringify([
        'admin_panel', 'manage_users', 'manage_meetings', 'view_all_tasks',
        'manage_dept_tasks', 'view_own_tasks', 'view_all_reports', 'approve_dept_reports',
        'director_feedback', 'create_report', 'view_dept_users', 'join_meetings',
        'create_revenue_report', 'approve_dept_revenue', 'approve_all_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-director',
      name: 'Director',
      description: 'Ban Giám đốc — Phê duyệt dự án điện mặt trời, kế hoạch tài chính và chiến lược phát triển.',
      color: '#0f172a',
      permissions: JSON.stringify([
        'view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings',
        'join_meetings', 'approve_all_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-manager',
      name: 'Manager',
      description: 'Quản lý khối kỹ thuật/phòng ban, điều phối dự án EPC/O&M, phân công nhiệm vụ và duyệt báo cáo.',
      color: '#16a34a',
      permissions: JSON.stringify([
        'manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings',
        'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-deputy-manager',
      name: 'Phó Phòng',
      description: 'Phó Trưởng phòng phụ trách chuyên môn, hỗ trợ điều hành công việc và giám sát tiến độ dự án.',
      color: '#0284c7',
      permissions: JSON.stringify([
        'manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings',
        'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-employee',
      name: 'Employee',
      description: 'Kỹ sư & nhân viên thực thi dự án, tư vấn thiết kế, thi công lắp đặt, O&M và báo cáo tiến độ.',
      color: '#f59e0b',
      permissions: JSON.stringify([
        'view_own_tasks', 'create_report', 'join_meetings', 'create_revenue_report'
      ]),
      isSystem: 1
    },
  ];

  for (const r of INITIAL_ROLES) {
    const [rows]: any = await conn.query('SELECT id FROM roles WHERE name = ?', [r.name]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.description, r.color, r.permissions, r.isSystem]
      );
    } else {
      await conn.query(
        'UPDATE roles SET description = ?, color = ?, permissions = ? WHERE name = ?',
        [r.description, r.color, r.permissions, r.name]
      );
    }
  }

  // 2. Departments
  const TRANLE_DEPTS = [
    { id: 'dept-exec', code: 'EXEC', name: 'Ban Giám Đốc', description: 'Ban Lãnh đạo điều hành chiến lược, phê duyệt dự án trọng điểm và định hướng phát triển tập đoàn.', color: '#ef4444', icon: 'Shield', sortOrder: 1 },
    { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh Doanh', description: 'Phát triển khách hàng B2B, dự án điện mặt trời mái nhà công nghiệp, trang trại và phân phối thiết bị AIKO, SAJ.', color: '#f59e0b', icon: 'TrendingUp', sortOrder: 2 },
    { id: 'dept-eng', code: 'ENG', name: 'Phòng Kỹ Thuật Solar', description: 'Khảo sát, thiết kế 3D PVSyst, bóc tách BOM/BOQ, giải pháp hòa lưới, hybrid và lưu trữ BESS.', color: '#8b5cf6', icon: 'Cpu', sortOrder: 3 },
    { id: 'dept-epc', code: 'EPC', name: 'Khối Tổng Thầu EPC & Thi Công', description: 'Chỉ huy thi công xây lắp công trình điện mặt trời trọn gói, an toàn HSE và nghiệm thu đóng điện.', color: '#10b981', icon: 'HardHat', sortOrder: 4 },
    { id: 'dept-om', code: 'OM', name: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', description: 'Vận hành bảo dưỡng định kỳ, kiểm tra phân tích quét nhiệt FLIR, trạm bảo hành ủy quyền Inverter SAJ tại Việt Nam.', color: '#0ea5e9', icon: 'Wrench', sortOrder: 5 },
    { id: 'dept-proc', code: 'PROC', name: 'Phòng Mua Hàng & Cung Ứng', description: 'Nhập khẩu thiết bị pin AIKO, biến tần SAJ/Huawei, đàm phán hợp đồng cung ứng và quản lý nhà sản xuất.', color: '#d97706', icon: 'ShoppingCart', sortOrder: 6 },
    { id: 'dept-wh', code: 'WH', name: 'Phòng Kho & Logistics', description: 'Quản lý tồn kho 3 miền (Hà Nội, Đà Nẵng, TP.HCM), bảo quản thiết bị năng lượng và điều phối xe tải công trình.', color: '#059669', icon: 'Package', sortOrder: 7 },
    { id: 'dept-mkt', code: 'MKT', name: 'Phòng Marketing & Truyền Thông', description: 'Quảng bá giải pháp năng lượng xanh, tổ chức hội thảo năng lượng tái tạo và quản trị thương hiệu Tran Le.', color: '#ec4899', icon: 'Megaphone', sortOrder: 8 },
    { id: 'dept-cs', code: 'CS', name: 'Phòng Chăm Sóc Khách Hàng', description: 'Hỗ trợ kỹ thuật 24/7, giám sát sản lượng điện qua app eSolar, tiếp nhận bảo hành và khảo sát CSAT.', color: '#06b6d4', icon: 'PhoneCall', sortOrder: 9 },
    { id: 'dept-fin', code: 'FIN', name: 'Phòng Tài Chính – Kế Toán', description: 'Quản lý dòng tiền dự án EPC, tài trợ tín dụng xanh từ ngân hàng, kế toán thuế và thanh quyết toán hợp đồng.', color: '#14b8a6', icon: 'DollarSign', sortOrder: 10 },
    { id: 'dept-hr', code: 'HR', name: 'Phòng Hành Chính – Nhân Sự', description: 'Quản trị nguồn nhân lực, tuyển dụng kỹ sư, đào tạo nội bộ và văn hóa doanh nghiệp xanh.', color: '#f43f5e', icon: 'Users', sortOrder: 11 },
    { id: 'dept-it', code: 'IT', name: 'Phòng IT & Chuyển Đổi Số', description: 'Hạ tầng số, nền tảng giám sát IoT Solar eSolar/FusionSolar và hệ thống phần mềm nội bộ.', color: '#6366f1', icon: 'Server', sortOrder: 12 },
    { id: 'dept-legal', code: 'LEGAL', name: 'Phòng Pháp Chế & Hợp Đồng', description: 'Thẩm định pháp lý, hợp đồng EPC, thỏa thuận đấu nối điện lực và hồ sơ thầu.', color: '#64748b', icon: 'Scale', sortOrder: 13 },
  ];

  for (const d of TRANLE_DEPTS) {
    const [rows]: any = await conn.query('SELECT id FROM departments WHERE id = ?', [d.id]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO departments (id, code, name, description, color, icon, sortOrder, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [d.id, d.code, d.name, d.description, d.color, d.icon, d.sortOrder, now]
      );
    } else {
      await conn.query(
        'UPDATE departments SET code = ?, name = ?, description = ?, color = ?, icon = ?, sortOrder = ?, isActive = 1 WHERE id = ?',
        [d.code, d.name, d.description, d.color, d.icon, d.sortOrder, d.id]
      );
    }
  }

  // 2. Teams
  const TRANLE_TEAMS = [
    { id: 'team-sales-b2b', departmentId: 'dept-sales', code: 'B2B', name: 'Nhóm Kinh Doanh B2B & Công Nghiệp', description: 'Tư vấn giải pháp điện mặt trời áp mái nhà máy, KCN và dự án thương mại.', color: '#f59e0b' },
    { id: 'team-sales-dist', departmentId: 'dept-sales', code: 'DIST', name: 'Nhóm Phân Phối Thiết Bị & Đại Lý', description: 'Phân phối chính hãng tấm pin AIKO, biến tần SAJ/Huawei và pin Dyness cho mạng lưới đại lý.', color: '#f97316' },
    { id: 'team-sales-resi', departmentId: 'dept-sales', code: 'RESI', name: 'Nhóm Điện Mặt Trời Dân Dụng', description: 'Tư vấn hệ thống On-grid & Hybrid cho hộ gia đình và biệt thự.', color: '#fbbf24' },
    { id: 'team-eng-solar', departmentId: 'dept-eng', code: 'SOLAR', name: 'Nhóm Thiết Kế Solar & PVSyst', description: 'Mô phỏng 3D, tính toán sản lượng điện PVSyst và lập báo cáo kỹ thuật khả thi.', color: '#8b5cf6' },
    { id: 'team-eng-elec', departmentId: 'dept-eng', code: 'ELEC', name: 'Nhóm Thiết Kế Điện AC/DC & TBA', description: 'Thiết kế tủ điện phân phối, tuyến cáp, trạm biến áp và hệ thống tiếp địa chống sét.', color: '#a855f7' },
    { id: 'team-eng-support', departmentId: 'dept-eng', code: 'SUPPORT', name: 'Nhóm Hỗ Trợ Kỹ Thuật Dự Án', description: 'Giải đáp vướng mắc kỹ thuật hiện trường và đào tạo kỹ thuật đối tác.', color: '#c084fc' },
    { id: 'team-epc-pm', departmentId: 'dept-epc', code: 'PM', name: 'Ban Chỉ Huy & Quản Lý Dự Án', description: 'Điều phối tiến độ tổng thể, quản trị rủi ro và quản lý ngân sách dự án EPC.', color: '#16a34a' },
    { id: 'team-epc-const', departmentId: 'dept-epc', code: 'CONST', name: 'Đội Thi Công Xây Lắp Công Trình', description: 'Trực tiếp lắp đặt khung giàn, tấm pin, đấu nối tủ điện và inverter tại công trường.', color: '#22c55e' },
    { id: 'team-epc-qaqc', departmentId: 'dept-epc', code: 'QAQC', name: 'Nhóm Kiểm Soát Chất Lượng & Nghiệm Thu', description: 'Thử nghiệm cách điện, quét nhiệt hồng ngoại, đo kiểm IV Curve và đóng điện nghiệm thu.', color: '#4ade80' },
    { id: 'team-epc-hse', departmentId: 'dept-epc', code: 'HSE', name: 'Nhóm An Toàn Lao Động & Môi Trường', description: 'Đảm bảo tuyệt đối an toàn thi công trên cao và quy chuẩn PCCC.', color: '#86efac' },
    { id: 'team-om-solar', departmentId: 'dept-om', code: 'OM', name: 'Đội Vận Hành & Bảo Trì 24/7', description: 'Giám sát sản lượng từ xa qua cloud, vệ sinh tấm pin định kỳ và xử lý sự cố.', color: '#0ea5e9' },
    { id: 'team-om-saj', departmentId: 'dept-om', code: 'SAJ_CENTER', name: 'Trung Tâm Bảo Hành Ủy Quyền SAJ', description: 'Tiếp nhận, chẩn đoán lỗi, thay thế linh kiện bo mạch chính hãng SAJ tại Việt Nam.', color: '#38bdf8' },
    { id: 'team-wh-central', departmentId: 'dept-wh', code: 'STOCK', name: 'Bộ Phận Quản Lý Kho 3 Miền', description: 'Kiểm kê xuất nhập tồn, quản lý mã SKU và serial number thiết bị.', color: '#10b981' },
    { id: 'team-wh-logistics', departmentId: 'dept-wh', code: 'LOG', name: 'Bộ Phận Giao Nhận & Vận Chuyển', description: 'Điều phối xe vận tải hàng hóa đến các công trình trên toàn quốc an toàn, đúng hạn.', color: '#34d399' },
    { id: 'team-proc-intl', departmentId: 'dept-proc', code: 'PROC_INTL', name: 'Nhóm Mua Hàng Quốc Tế (AIKO/SAJ)', description: 'Phụ trách đàm phán hợp đồng cung ứng và nhập khẩu thiết bị năng lượng.', color: '#d97706' },
    { id: 'team-mkt-digital', departmentId: 'dept-mkt', code: 'MKT_DIGITAL', name: 'Nhóm Digital Marketing & Media', description: 'Sáng tạo nội dung truyền thông, SEO và phát triển nhận diện thương hiệu xanh.', color: '#ec4899' },
    { id: 'team-cs-service', departmentId: 'dept-cs', code: 'CS_SERVICE', name: 'Nhóm Dịch Vụ Khách Hàng 24/7', description: 'Tiếp nhận yêu cầu, hotline kỹ thuật và khảo sát mức độ hài lòng khách hàng.', color: '#06b6d4' },
    { id: 'team-fin-acc', departmentId: 'dept-fin', code: 'FIN_ACC', name: 'Nhóm Kế Toán Quản Trị & Thuế', description: 'Kế toán dự án EPC, thanh quyết toán và quản lý dòng tiền doanh nghiệp.', color: '#059669' },
    { id: 'team-hr-talent', departmentId: 'dept-hr', code: 'HR_TALENT', name: 'Nhóm Tuyển Dụng & Phát Triển Nhân Tài', description: 'Tuyển dụng kỹ sư, đào tạo chuyên môn và chăm lo chế độ phúc lợi.', color: '#f43f5e' },
    { id: 'team-it-digital', departmentId: 'dept-it', code: 'IT_DIGITAL', name: 'Nhóm Chuyển Đổi Số & Ứng Dụng', description: 'Phát triển nền tảng TranLe Tasks, quản trị hệ thống IoT và máy chủ.', color: '#6366f1' },
    { id: 'team-legal-corp', departmentId: 'dept-legal', code: 'LEGAL_CORP', name: 'Nhóm Pháp Lý & Quản Trị Hợp Đồng', description: 'Rà soát hợp đồng EPC trọn gói, thủ tục đấu nối EVN và thẩm định pháp lý.', color: '#64748b' },
  ];

  for (const t of TRANLE_TEAMS) {
    const [rows]: any = await conn.query('SELECT id FROM teams WHERE id = ?', [t.id]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO teams (id, departmentId, code, name, description, color, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [t.id, t.departmentId, t.code, t.name, t.description, t.color, now]
      );
    } else {
      await conn.query(
        'UPDATE teams SET departmentId = ?, name = ?, description = ?, color = ?, isActive = 1 WHERE id = ?',
        [t.departmentId, t.name, t.description, t.color, t.id]
      );
    }
  }

  // 3. Positions
  const TRANLE_POSITIONS = [
    { id: 'pos-general-deputy', departmentId: null, teamId: null, code: 'PHO_PHONG', name: 'Phó Phòng', description: 'Phó Trưởng phòng phụ trách chuyên môn, hỗ trợ điều hành và quản lý hoạt động phòng ban.', level: 3, isManager: 1 },
    { id: 'pos-exec-dir', departmentId: 'dept-exec', teamId: null, code: 'DIR', name: 'Tổng Giám Đốc / Thành Viên HĐQT', description: 'Lãnh đạo toàn diện hoạt động sản xuất kinh doanh công ty.', level: 5, isManager: 1 },
    { id: 'pos-exec-deputy', departmentId: 'dept-exec', teamId: null, code: 'DEP_DIR', name: 'Phó Tổng Giám Đốc', description: 'Hỗ trợ Tổng Giám Đốc chỉ đạo chuyên môn kỹ thuật hoặc kinh doanh.', level: 5, isManager: 1 },
    { id: 'pos-sales-mgr', departmentId: 'dept-sales', teamId: null, code: 'SALES_MGR', name: 'Trưởng Phòng Kinh Doanh', description: 'Quản trị mục tiêu doanh số và phát triển thị trường năng lượng tái tạo.', level: 4, isManager: 1 },
    { id: 'pos-sales-deputy', departmentId: 'dept-sales', teamId: 'team-sales-dist', code: 'SALES_DEP', name: 'Phó Phòng Kinh Doanh & Phân Phối', description: 'Phụ trách kênh phân phối đại lý thiết bị solar AIKO/SAJ.', level: 3, isManager: 1 },
    { id: 'pos-sales-lead', departmentId: 'dept-sales', teamId: 'team-sales-b2b', code: 'SALES_LEAD', name: 'Trưởng Nhóm Kinh Doanh B2B', description: 'Chỉ đạo nhóm B2B phát triển dự án công nghiệp.', level: 3, isManager: 1 },
    { id: 'pos-sales-exec', departmentId: 'dept-sales', teamId: 'team-sales-b2b', code: 'SALES_EXEC', name: 'Chuyên Viên Kinh Doanh Năng Lượng', description: 'Tìm kiếm khách hàng, tư vấn giải pháp và xúc tiến hợp đồng.', level: 2, isManager: 0 },
    { id: 'pos-eng-mgr', departmentId: 'dept-eng', teamId: null, code: 'ENG_MGR', name: 'Trưởng Phòng Kỹ Thuật Solar', description: 'Chịu trách nhiệm toàn diện về giải pháp kỹ thuật, thiết kế và tối ưu hệ thống.', level: 4, isManager: 1 },
    { id: 'pos-eng-deputy', departmentId: 'dept-eng', teamId: 'team-eng-elec', code: 'ENG_DEP', name: 'Phó Phòng Kỹ Thuật & Thiết Kế Điện', description: 'Phụ trách thiết kế điện AC/DC, trạm biến áp và bảo vệ relay.', level: 3, isManager: 1 },
    { id: 'pos-eng-solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', code: 'ENG_SOLAR', name: 'Kỹ Sư Thiết Kế Hệ Thống Solar & PVSyst', description: 'Thiết kế bố trí tấm pin, chuỗi string, inverter và mô phỏng sản lượng.', level: 2, isManager: 0 },
    { id: 'pos-eng-elec', departmentId: 'dept-eng', teamId: 'team-eng-elec', code: 'ENG_ELEC', name: 'Kỹ Sư Điện AC/DC & Trạm Biến Áp', description: 'Thiết kế sơ đồ nguyên lý 1 sợi, tủ điện AC/DC và trạm biến áp.', level: 2, isManager: 0 },
    { id: 'pos-epc-mgr', departmentId: 'dept-epc', teamId: null, code: 'EPC_MGR', name: 'Giám Đốc Khối Tổng Thầu EPC', description: 'Quản lý toàn bộ quá trình thi công xây lắp các công trình điện mặt trời.', level: 4, isManager: 1 },
    { id: 'pos-epc-deputy', departmentId: 'dept-epc', teamId: 'team-epc-pm', code: 'EPC_DEP', name: 'Phó Khối EPC / Chỉ Huy Phó Hiện Trường', description: 'Điều hành thi công hiện trường và an toàn thi công.', level: 3, isManager: 1 },
    { id: 'pos-epc-pm', departmentId: 'dept-epc', teamId: 'team-epc-pm', code: 'EPC_PM', name: 'Chỉ Huy Trưởng Công Trình / Quản Lý Dự Án', description: 'Chỉ huy công trường, điều phối nhà thầu phụ và quản lý tiến độ thi công.', level: 3, isManager: 1 },
    { id: 'pos-epc-qaqc', departmentId: 'dept-epc', teamId: 'team-epc-qaqc', code: 'EPC_QAQC', name: 'Kỹ Sư Giám Sát & QA/QC', description: 'Kiểm soát chất lượng vật tư, lắp đặt và lập hồ sơ nghiệm thu.', level: 2, isManager: 0 },
    { id: 'pos-epc-hse', departmentId: 'dept-epc', teamId: 'team-epc-hse', code: 'EPC_HSE', name: 'Cán Bộ An Toàn Lao Động & Môi Trường HSE', description: 'Đảm bảo quy chuẩn an toàn lao động và PCCC công trình.', level: 2, isManager: 0 },
    { id: 'pos-om-mgr', departmentId: 'dept-om', teamId: null, code: 'OM_MGR', name: 'Trưởng Trung Tâm Dịch Vụ & Bảo Hành SAJ', description: 'Điều hành trung tâm dịch vụ O&M và Trung tâm Bảo hành SAJ tại Việt Nam.', level: 4, isManager: 1 },
    { id: 'pos-om-deputy', departmentId: 'dept-om', teamId: 'team-om-solar', code: 'OM_DEP', name: 'Phó Phòng Vận Hành & Bảo Dưỡng O&M', description: 'Lên lịch bảo trì định kỳ, điều phối kỹ sư quét nhiệt và vệ sinh tấm pin.', level: 3, isManager: 1 },
    { id: 'pos-om-saj', departmentId: 'dept-om', teamId: 'team-om-saj', code: 'OM_SAJ', name: 'Kỹ Sư Trưởng Ủy Quyền SAJ Service Center', description: 'Chẩn đoán lỗi biến tần, thay thế bo mạch chính hãng SAJ.', level: 2, isManager: 0 },
    { id: 'pos-proc-mgr', departmentId: 'dept-proc', teamId: null, code: 'PROC_MGR', name: 'Trưởng Phòng Mua Hàng & Cung Ứng', description: 'Quản lý chuỗi cung ứng thiết bị solar và hợp đồng xuất nhập khẩu.', level: 4, isManager: 1 },
    { id: 'pos-proc-deputy', departmentId: 'dept-proc', teamId: 'team-proc-intl', code: 'PROC_DEP', name: 'Phó Phòng Mua Hàng Quốc Tế', description: 'Phụ trách thương thảo giá và đàm phán hợp đồng cung ứng quốc tế.', level: 3, isManager: 1 },
    { id: 'pos-wh-mgr', departmentId: 'dept-wh', teamId: null, code: 'WH_MGR', name: 'Trưởng Phòng Kho & Logistics', description: 'Chịu trách nhiệm an toàn kho hàng, kiểm kê và giao nhận thiết bị.', level: 4, isManager: 1 },
    { id: 'pos-wh-deputy', departmentId: 'dept-wh', teamId: 'team-wh-logistics', code: 'WH_DEP', name: 'Phó Phòng Điều Phối Giao Nhận & Vận Tải', description: 'Quản lý lịch trình xe tải và logistics 3 miền.', level: 3, isManager: 1 },
    { id: 'pos-mkt-mgr', departmentId: 'dept-mkt', teamId: null, code: 'MKT_MGR', name: 'Trưởng Phòng Marketing & Truyền Thông', description: 'Hoạch định chiến lược thương hiệu và phát triển kênh số.', level: 4, isManager: 1 },
    { id: 'pos-mkt-deputy', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', code: 'MKT_DEP', name: 'Phó Phòng Digital Marketing', description: 'Quản lý nội dung số, SEO website và sự kiện năng lượng.', level: 3, isManager: 1 },
    { id: 'pos-cs-mgr', departmentId: 'dept-cs', teamId: null, code: 'CS_MGR', name: 'Trưởng Phòng Chăm Sóc Khách Hàng', description: 'Quản trị trải nghiệm khách hàng và dịch vụ sau bán hàng.', level: 4, isManager: 1 },
    { id: 'pos-cs-deputy', departmentId: 'dept-cs', teamId: 'team-cs-service', code: 'CS_DEP', name: 'Phó Phòng Dịch Vụ Khách Hàng', description: 'Giám sát xử lý ticket, khiếu nại và tổng đài CSKH.', level: 3, isManager: 1 },
    { id: 'pos-fin-cfo', departmentId: 'dept-fin', teamId: null, code: 'FIN_CFO', name: 'Kế Toán Trưởng / Giám Đốc Tài Chính', description: 'Quản trị tài chính công ty, kế toán thuế và dòng tiền dự án.', level: 4, isManager: 1 },
    { id: 'pos-fin-deputy', departmentId: 'dept-fin', teamId: 'team-fin-acc', code: 'FIN_DEP', name: 'Phó Phòng Kế Toán Tổng Hợp', description: 'Kiểm soát sổ sách kế toán, hóa đơn và báo cáo tài chính định kỳ.', level: 3, isManager: 1 },
    { id: 'pos-hr-mgr', departmentId: 'dept-hr', teamId: null, code: 'HR_MGR', name: 'Trưởng Phòng Hành Chính – Nhân Sự', description: 'Hoạch định nhân lực, tuyển dụng, đào tạo và quản trị hành chính.', level: 4, isManager: 1 },
    { id: 'pos-hr-deputy', departmentId: 'dept-hr', teamId: 'team-hr-talent', code: 'HR_DEP', name: 'Phó Phòng Tuyển Dụng & Đào Tạo', description: 'Tuyển dụng nhân sự chuyên môn và đào tạo văn hóa doanh nghiệp.', level: 3, isManager: 1 },
    { id: 'pos-it-mgr', departmentId: 'dept-it', teamId: null, code: 'IT_MGR', name: 'Trưởng Phòng IT & Chuyển Đổi Số', description: 'Quản trị hệ thống máy chủ, ứng dụng web và hạ tầng công nghệ thông tin.', level: 4, isManager: 1 },
    { id: 'pos-it-deputy', departmentId: 'dept-it', teamId: 'team-it-digital', code: 'IT_DEP', name: 'Phó Phòng Hệ Thống & Hạ Tầng Mạng', description: 'Quản trị hệ thống mạng nội bộ, máy chủ và an toàn thông tin.', level: 3, isManager: 1 },
    { id: 'pos-legal-mgr', departmentId: 'dept-legal', teamId: null, code: 'LEGAL_MGR', name: 'Trưởng Phòng Pháp Chế & Hợp Đồng', description: 'Rà soát tính pháp lý hợp đồng EPC, thỏa thuận đối tác và thủ tục đấu nối.', level: 4, isManager: 1 },
    { id: 'pos-legal-deputy', departmentId: 'dept-legal', teamId: 'team-legal-corp', code: 'LEGAL_DEP', name: 'Phó Phòng Quản Trị Hợp Đồng EPC', description: 'Thẩm định hồ sơ thầu và hợp đồng mua sắm thiết bị.', level: 3, isManager: 1 },
  ];

  for (const p of TRANLE_POSITIONS) {
    const [rows]: any = await conn.query('SELECT id FROM positions WHERE id = ?', [p.id]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO positions (id, departmentId, teamId, code, name, description, level, isManager, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [p.id, p.departmentId, p.teamId, p.code, p.name, p.description, p.level, p.isManager, now]
      );
    } else {
      await conn.query(
        'UPDATE positions SET departmentId = ?, teamId = ?, name = ?, description = ?, level = ?, isManager = ?, isActive = 1 WHERE id = ?',
        [p.departmentId, p.teamId, p.name, p.description, p.level, p.isManager, p.id]
      );
    }
  }

  // 4. Complete Personnel Directory: 74 Staff across 13 Departments
  const INITIAL_USERS = [
    // 1. BAN GIÁM ĐỐC (dept-exec)
    { id: 'u4', name: 'Nguyễn Văn Duy', email: 'vanduy@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: null, avatar: 'https://i.pravatar.cc/150?u=u4', phone: '0939792428', dob: '1980-02-20', hometown: 'Đà Nẵng', bio: 'Tổng Giám Đốc Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê.' },
    { id: 'u-exec-01', name: 'Trần Đình Khôi', email: 'dinhkhoi@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-deputy', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec1', phone: '0912345601', dob: '1982-05-12', hometown: 'Hà Nội', bio: 'Phó Tổng Giám Đốc Kỹ Thuật & Giải Pháp Công Nghệ Solar.' },
    { id: 'u-exec-02', name: 'Lê Thị Mai Hương', email: 'maihuong@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-deputy', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec2', phone: '0912345602', dob: '1984-08-25', hometown: 'TP.HCM', bio: 'Phó Tổng Giám Đốc Kinh Doanh & Quan Hệ Đối Tác Chiến Lược.' },
    { id: 'u1', name: 'Admin Tran Le', email: 'admin@tranlecorp.com.vn', role: 'Admin', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=u1', phone: '0939792428', dob: '1990-01-01', hometown: 'Đà Nẵng', bio: 'Quản trị viên cấp cao hệ thống Tran Le Electricity.' },
    { id: 'u-exec-03', name: 'Đỗ Hoàng Nam', email: 'hoangnam@tranlecorp.com.vn', role: 'Employee', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec3', phone: '0912345603', dob: '1992-11-18', hometown: 'Đà Nẵng', bio: 'Thư ký Hội đồng Quản trị & Điều phối Ban Điều hành.' },
    { id: 'u-exec-04', name: 'Vũ Bích Ngọc', email: 'bichngoc@tranlecorp.com.vn', role: 'Employee', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec4', phone: '0912345604', dob: '1995-03-30', hometown: 'Quảng Nam', bio: 'Chuyên viên Quản trị Chiến lược & Rủi ro Doanh nghiệp.' },

    // 2. PHÒNG KINH DOANH (dept-sales)
    { id: 'u-sales-01', name: 'Trịnh Văn Hùng', email: 'vanhung.sales@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-b2b', positionId: 'pos-sales-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=sales1', phone: '0913456701', dob: '1986-04-10', hometown: 'Nghệ An', bio: 'Trưởng Phòng Kinh Doanh - Quản lý mục tiêu doanh số toàn quốc.' },
    { id: 'u-sales-02', name: 'Đặng Quốc Bảo', email: 'quocbao.sales@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-deputy', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales2', phone: '0913456702', dob: '1988-09-14', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kinh Doanh phụ trách Kênh Phân phối thiết bị AIKO & SAJ.' },
    { id: 'u-sales-03', name: 'Hoàng Minh Tuấn', email: 'minhtuan.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-b2b', positionId: 'pos-sales-exec', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales3', phone: '0913456703', dob: '1993-01-22', hometown: 'Hà Tĩnh', bio: 'Chuyên viên Kinh doanh B2B phụ trách Dự án Điện mặt trời Nhà xưởng KCN.' },
    { id: 'u-sales-04', name: 'Nguyễn Thùy Linh', email: 'thuylinh.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-exec', managerId: 'u-sales-02', avatar: 'https://i.pravatar.cc/150?u=sales4', phone: '0913456704', dob: '1996-07-08', hometown: 'TP.HCM', bio: 'Chuyên viên Phát triển mạng lưới đại lý Inverter SAJ & Pin AIKO Miền Nam.' },
    { id: 'u-sales-05', name: 'Phạm Quang Huy', email: 'quanghuy.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-resi', positionId: 'pos-sales-exec', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales5', phone: '0913456705', dob: '1997-12-05', hometown: 'Quảng Ngãi', bio: 'Chuyên viên Tư vấn Hệ thống Điện mặt trời Dân dụng & Hybrid Biệt thự.' },
    { id: 'u-sales-06', name: 'Bùi Thu Hà', email: 'thuha.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-exec', managerId: 'u-sales-02', avatar: 'https://i.pravatar.cc/150?u=sales6', phone: '0913456706', dob: '1998-06-19', hometown: 'Đà Nẵng', bio: 'Chuyên viên Kinh doanh Phân phối khu vực Miền Trung & Tây Nguyên.' },

    // 3. PHÒNG KỸ THUẬT SOLAR (dept-eng)
    { id: 'u-eng-01', name: 'Võ Thành Long', email: 'thanhlong@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=eng1', phone: '0914567801', dob: '1985-03-15', hometown: 'Thừa Thiên Huế', bio: 'Trưởng Phòng Kỹ Thuật Solar - Chuyên gia giải pháp kỹ thuật & mô phỏng PVSyst.' },
    { id: 'u-eng-02', name: 'Lâm Quốc Trọng', email: 'quoctrong@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-elec', positionId: 'pos-eng-deputy', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng2', phone: '0914567802', dob: '1987-10-20', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kỹ Thuật phụ trách Thiết kế Tủ điện AC/DC, Trạm Biến Áp & Scada.' },
    { id: 'u3', name: 'Phan Xuân Mạnh', email: 'xuanmanh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=u3', phone: '0123456789', dob: '2002-09-07', hometown: 'Đà Nẵng', bio: 'Kỹ sư Thiết kế PVSyst 3D & Giải pháp Năng lượng tái tạo.' },
    { id: 'u-eng-03', name: 'Trần Đức Anh', email: 'ducanh.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-elec', positionId: 'pos-eng-elec', managerId: 'u-eng-02', avatar: 'https://i.pravatar.cc/150?u=eng3', phone: '0914567803', dob: '1994-08-11', hometown: 'Quảng Nam', bio: 'Kỹ sư Thiết kế Hệ thống Điện AC/DC, Tiếp địa và Chống sét lan truyền.' },
    { id: 'u-eng-04', name: 'Đỗ Minh Trí', email: 'minhtri.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng4', phone: '0914567804', dob: '1996-02-28', hometown: 'Bình Định', bio: 'Kỹ sư Bóc tách Khối lượng BOM/BOQ và Tính toán hiệu suất hệ thống.' },
    { id: 'u-eng-05', name: 'Ngô Văn Hiếu', email: 'vanhieu.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng5', phone: '0914567805', dob: '1998-11-04', hometown: 'Đà Nẵng', bio: 'Kỹ sư Khảo sát Hiện trường, Đo đạc Kết cấu mái và Phân tích phụ tải điện.' },

    // 4. KHỐI TỔNG THẦU EPC & THI CÔNG (dept-epc)
    { id: 'u2', name: 'Nguyễn Văn Đạt', email: 'vandat@tranlecorp.com.vn', role: 'Manager', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-pm', positionId: 'pos-epc-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=u2', phone: '0987654321', dob: '1985-06-15', hometown: 'Đà Nẵng', bio: 'Giám Đốc Khối Tổng Thầu EPC - Chỉ huy trưởng các đại dự án Solar.' },
    { id: 'u-epc-01', name: 'Lê Hoàng Sơn', email: 'hoangson.epc@tranlecorp.com.vn', role: 'Manager', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-pm', positionId: 'pos-epc-deputy', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc1', phone: '0915678901', dob: '1987-04-18', hometown: 'Quảng Trị', bio: 'Phó Khối EPC - Chỉ huy phó hiện trường thi công và điều phối nhà thầu phụ.' },
    { id: 'u-epc-02', name: 'Trương Quốc Cường', email: 'quoccuong.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-qaqc', positionId: 'pos-epc-qaqc', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc2', phone: '0915678902', dob: '1991-09-25', hometown: 'Đà Nẵng', bio: 'Kỹ Sư Trưởng QA/QC - Kiểm soát chất lượng vật tư, đo Megger và nghiệm thu đóng điện.' },
    { id: 'u-epc-03', name: 'Đoàn Ngọc Hải', email: 'ngochai.hse@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-hse', positionId: 'pos-epc-hse', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc3', phone: '0915678903', dob: '1993-07-14', hometown: 'Quảng Nam', bio: 'Cán Bộ An Toàn Lao Động HSE - Đảm bảo tuyệt đối an toàn thi công trên cao và PCCC.' },
    { id: 'u-epc-04', name: 'Vũ Đình Trọng', email: 'dinhtrong.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-const', positionId: 'pos-epc-pm', managerId: 'u-epc-01', avatar: 'https://i.pravatar.cc/150?u=epc4', phone: '0915678904', dob: '1995-12-02', hometown: 'Hà Tĩnh', bio: 'Kỹ sư Giám sát Thi công Điện, Đấu nối chuỗi string và Tủ điện Inverter.' },
    { id: 'u-epc-05', name: 'Nguyễn Thành Nam', email: 'thanhnam.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-const', positionId: 'pos-epc-pm', managerId: 'u-epc-01', avatar: 'https://i.pravatar.cc/150?u=epc5', phone: '0915678905', dob: '1997-05-20', hometown: 'Đà Nẵng', bio: 'Kỹ sư Thi công Cơ khí Giàn khung nhôm & Lắp đặt Module Tấm pin Solar.' },

    // 5. TRUNG TÂM DỊCH VỤ & BẢO HÀNH O&M SAJ CENTER (dept-om)
    { id: 'u-om-01', name: 'Bùi Anh Tuấn', email: 'anhtuan.om@tranlecorp.com.vn', role: 'Manager', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=om1', phone: '0916789001', dob: '1986-01-20', hometown: 'TP.HCM', bio: 'Trưởng Trung Tâm O&M & Bảo Hành Ủy Quyền SAJ Center tại Việt Nam.' },
    { id: 'u-om-02', name: 'Mai Đức Thắng', email: 'ducthang.om@tranlecorp.com.vn', role: 'Manager', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-deputy', managerId: 'u-om-01', avatar: 'https://i.pravatar.cc/150?u=om2', phone: '0916789002', dob: '1989-08-16', hometown: 'Đà Nẵng', bio: 'Phó Phòng Vận Hành & Bảo Dưỡng O&M - Giám sát sản lượng hệ thống điện mặt trời.' },
    { id: 'u-om-03', name: 'Đinh Quang Vinh', email: 'quangvinh.saj@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-saj', managerId: 'u-om-01', avatar: 'https://i.pravatar.cc/150?u=om3', phone: '0916789003', dob: '1992-04-12', hometown: 'Bình Định', bio: 'Kỹ Sư Trưởng Ủy Quyền SAJ Center - Chuyên gia chẩn đoán và sửa chữa Inverter SAJ.' },
    { id: 'u-om-04', name: 'Nguyễn Thế Bảo', email: 'thebao.om@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-saj', managerId: 'u-om-02', avatar: 'https://i.pravatar.cc/150?u=om4', phone: '0916789004', dob: '1994-10-30', hometown: 'Quảng Ngãi', bio: 'Kỹ sư O&M - Chuyên viên Quét nhiệt hồng ngoại FLIR và Vệ sinh tấm pin robot.' },
    { id: 'u-om-05', name: 'Trần Hải Đăng', email: 'haidang.saj@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-saj', managerId: 'u-om-03', avatar: 'https://i.pravatar.cc/150?u=om5', phone: '0916789005', dob: '1996-03-18', hometown: 'Đà Nẵng', bio: 'Kỹ thuật viên Sửa chữa Bo mạch Công suất IGBT và Bo điều khiển CPU Inverter.' },
    { id: 'u-om-06', name: 'Dương Quốc Việt', email: 'quocviet.om@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-saj', managerId: 'u-om-02', avatar: 'https://i.pravatar.cc/150?u=om6', phone: '0916789006', dob: '1998-07-24', hometown: 'Khánh Hòa', bio: 'Kỹ sư Giám sát Vận hành SCADA & Nền tảng IoT eSolar Air 24/7.' },

    // 6. PHÒNG MUA HÀNG & CUNG ỨNG (dept-proc)
    { id: 'u-proc-01', name: 'Chu Thị Thanh Tâm', email: 'thanhtam.proc@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=proc1', phone: '0917890101', dob: '1987-06-11', hometown: 'Hà Nội', bio: 'Trưởng Phòng Mua Hàng & Cung Ứng - Quản trị quan hệ chuỗi cung ứng toàn cầu.' },
    { id: 'u-proc-02', name: 'Nguyễn Đức Huy', email: 'duchuy.proc@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-deputy', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc2', phone: '0917890102', dob: '1989-11-23', hometown: 'Đà Nẵng', bio: 'Phó Phòng Mua Hàng Quốc Tế - Phụ trách nhập khẩu thiết bị AIKO & SAJ.' },
    { id: 'u-proc-03', name: 'Vũ Phương Thảo', email: 'phuongthao.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc3', phone: '0917890103', dob: '1993-02-14', hometown: 'Hải Phòng', bio: 'Chuyên viên Mua hàng Tấm pin N-Type ABC và Khung giàn nhôm Solar.' },
    { id: 'u-proc-04', name: 'Tạ Quang Minh', email: 'quangminh.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-02', avatar: 'https://i.pravatar.cc/150?u=proc4', phone: '0917890104', dob: '1995-09-09', hometown: 'Đà Nẵng', bio: 'Chuyên viên Mua hàng Biến tần SAJ, Pin lưu trữ Dyness & Cáp điện DC Solar.' },
    { id: 'u-proc-05', name: 'Lương Bích Trâm', email: 'bichtram.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc5', phone: '0917890105', dob: '1997-12-19', hometown: 'Quảng Nam', bio: 'Chuyên viên Đàm phán Hợp đồng Cung ứng và Theo dõi tiến độ giao nhận ETA.' },

    // 7. PHÒNG KHO & LOGISTICS (dept-wh)
    { id: 'u-wh-01', name: 'Đặng Văn Quyền', email: 'vanquyen.wh@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=wh1', phone: '0918901201', dob: '1984-07-07', hometown: 'Thanh Hóa', bio: 'Trưởng Phòng Kho & Logistics - Quản trị hệ thống kho bãi 3 miền Bắc - Trung - Nam.' },
    { id: 'u-wh-02', name: 'Lưu Thế Tài', email: 'thetai.wh@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-logistics', positionId: 'pos-wh-deputy', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh2', phone: '0918901202', dob: '1988-02-18', hometown: 'Đà Nẵng', bio: 'Phó Phòng phụ trách Điều phối Giao nhận Vận tải Công trình toàn quốc.' },
    { id: 'u-wh-03', name: 'Phan Nhật Linh', email: 'nhatlinh.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh3', phone: '0918901203', dob: '1992-05-30', hometown: 'TP.HCM', bio: 'Thủ kho Tổng TP.HCM - Quản lý nhập xuất tấm pin AIKO và Inverter SAJ.' },
    { id: 'u-wh-04', name: 'Hoàng Bá Hưng', email: 'bahung.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh4', phone: '0918901204', dob: '1994-11-12', hometown: 'Đà Nẵng', bio: 'Thủ kho Chi nhánh Miền Trung - Đà Nẵng phụ trách cấp phát vật tư thi công.' },
    { id: 'u-wh-05', name: 'Nguyễn Cẩm Ly', email: 'camly.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh5', phone: '0918901205', dob: '1996-08-25', hometown: 'Quảng Trị', bio: 'Chuyên viên Quản lý Serial Number, Mã vạch và Kiểm tra chất lượng QC nhập kho.' },
    { id: 'u-wh-06', name: 'Võ Văn Kiệt', email: 'vankiet.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-logistics', positionId: 'pos-wh-mgr', managerId: 'u-wh-02', avatar: 'https://i.pravatar.cc/150?u=wh6', phone: '0918901206', dob: '1998-01-15', hometown: 'Quảng Nam', bio: 'Chuyên viên Điều phối Vận tải đường bộ và Giao nhận hàng hóa công trường.' },

    // 8. PHÒNG MARKETING & TRUYỀN THÔNG (dept-mkt)
    { id: 'u-mkt-01', name: 'Trần Quỳnh Nga', email: 'quynhnga.mkt@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=mkt1', phone: '0919012301', dob: '1988-03-24', hometown: 'Hà Nội', bio: 'Trưởng Phòng Marketing & Truyền Thông - Định vị thương hiệu Năng Lượng Trần Lê.' },
    { id: 'u-mkt-02', name: 'Hoàng Việt Hưng', email: 'viethung.mkt@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-deputy', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt2', phone: '0919012302', dob: '1990-08-15', hometown: 'Đà Nẵng', bio: 'Phó Phòng Digital Marketing - Quản trị hiệu quả quảng cáo và phát triển Lead gen.' },
    { id: 'u-mkt-03', name: 'Đỗ Khánh Linh', email: 'khanhlinh.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt3', phone: '0919012303', dob: '1994-06-18', hometown: 'TP.HCM', bio: 'Chuyên viên Sáng tạo Nội dung, Viết bài PR giải pháp Solar và Quản trị SEO.' },
    { id: 'u-mkt-04', name: 'Nguyễn Đình Bảo', email: 'dinhbao.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-02', avatar: 'https://i.pravatar.cc/150?u=mkt4', phone: '0919012304', dob: '1996-10-09', hometown: 'Đà Nẵng', bio: 'Chuyên viên Thiết kế Đồ họa, Video Media và Hồ sơ Năng lực Công ty.' },
    { id: 'u-mkt-05', name: 'Lê Thanh Huyền', email: 'thanhhuyen.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt5', phone: '0919012305', dob: '1997-04-03', hometown: 'Quảng Nam', bio: 'Chuyên viên Tổ chức Sự kiện, Triển lãm Năng lượng Tái tạo và Hội nghị Khách hàng.' },

    // 9. PHÒNG CHĂM SÓC KHÁCH HÀNG (dept-cs)
    { id: 'u-cs-01', name: 'Nguyễn Diệu Hương', email: 'dieuhuong.cs@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=cs1', phone: '0920123401', dob: '1987-12-08', hometown: 'Hà Nội', bio: 'Trưởng Phòng Chăm Sóc Khách Hàng - Chuẩn hóa dịch vụ khách hàng 5 sao.' },
    { id: 'u-cs-02', name: 'Phạm Văn Chung', email: 'vanchung.cs@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-deputy', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs2', phone: '0920123402', dob: '1990-05-19', hometown: 'Đà Nẵng', bio: 'Phó Phòng Hỗ Trợ Kỹ Thuật Sau Bán Hàng & Giám sát SLA Ticket.' },
    { id: 'u-cs-03', name: 'Hoàng Ngọc Ánh', email: 'ngocanh.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs3', phone: '0920123403', dob: '1994-09-14', hometown: 'Thừa Thiên Huế', bio: 'Chuyên viên Tiếp nhận Hotline 24/7 và Xử lý Ticket bảo hành Inverter SAJ.' },
    { id: 'u-cs-04', name: 'Lê Mỹ Duyên', email: 'myduyen.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs4', phone: '0920123404', dob: '1996-01-27', hometown: 'Đà Nẵng', bio: 'Chuyên viên Chăm sóc Khách hàng Dự án Doanh nghiệp và Hợp đồng Bảo trì.' },
    { id: 'u-cs-05', name: 'Vũ Hoài An', email: 'hoaian.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-02', avatar: 'https://i.pravatar.cc/150?u=cs5', phone: '0920123405', dob: '1998-08-31', hometown: 'Quảng Nam', bio: 'Chuyên viên Khảo sát Mức độ Hài lòng Khách hàng (CSAT) và Chăm sóc định kỳ.' },

    // 10. PHÒNG TÀI CHÍNH – KẾ TOÁN (dept-fin)
    { id: 'u-fin-01', name: 'Lê Thị Thu Thủy', email: 'thuthuy.fin@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=fin1', phone: '0921234501', dob: '1983-09-02', hometown: 'Hà Nội', bio: 'Kế Toán Trưởng / Giám Đốc Tài Chính - Quản trị nguồn vốn và tài chính EPC.' },
    { id: 'u-fin-02', name: 'Nguyễn Văn Thành', email: 'vanthanh.fin@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-deputy', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin2', phone: '0921234502', dob: '1987-11-15', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kế Toán Tổng Hợp & Thuế Doanh Nghiệp.' },
    { id: 'u-fin-03', name: 'Trịnh Hoài Thu', email: 'hoaithu.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin3', phone: '0921234503', dob: '1991-03-22', hometown: 'Quảng Trị', bio: 'Kế toán Quản trị Chi phí Dự án EPC Điện mặt trời và Nghiệm thu thanh toán.' },
    { id: 'u-fin-04', name: 'Phạm Thảo My', email: 'thaomy.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-02', avatar: 'https://i.pravatar.cc/150?u=fin4', phone: '0921234504', dob: '1994-07-17', hometown: 'Đà Nẵng', bio: 'Kế toán Công nợ Phải thu (AR) và Quản lý Doanh thu Hợp đồng Phân phối.' },
    { id: 'u-fin-05', name: 'Đặng Đình Long', email: 'dinhlong.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-02', avatar: 'https://i.pravatar.cc/150?u=fin5', phone: '0921234505', dob: '1995-10-04', hometown: 'Bình Định', bio: 'Kế toán Thanh toán (AP) và Mua hàng Thiết bị Nhập khẩu L/C & T/T.' },
    { id: 'u-fin-06', name: 'Vũ Minh Tâm', email: 'minhtam.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin6', phone: '0921234506', dob: '1997-06-12', hometown: 'Quảng Nam', bio: 'Chuyên viên Kế hoạch Ngân sách, Dòng tiền và Tín dụng Ngân hàng Xanh.' },

    // 11. PHÒNG HÀNH CHÍNH – NHÂN SỰ (dept-hr)
    { id: 'u-hr-01', name: 'Ngô Thị Mai Lan', email: 'mailan.hr@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=hr1', phone: '0922345601', dob: '1985-08-30', hometown: 'Hà Nội', bio: 'Trưởng Phòng Hành Chính – Nhân Sự - Hoạch định tổ chức và phát triển văn hóa xanh.' },
    { id: 'u-hr-02', name: 'Đỗ Quang Dũng', email: 'quangdung.hr@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-deputy', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr2', phone: '0922345602', dob: '1988-12-05', hometown: 'Đà Nẵng', bio: 'Phó Phòng Tuyển Dụng & Đào Tạo Kỹ Sư Năng Lượng.' },
    { id: 'u-hr-03', name: 'Trần Thị Kim Oanh', email: 'kimoanh.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr3', phone: '0922345603', dob: '1992-04-26', hometown: 'Hà Tĩnh', bio: 'Chuyên viên Tiền lương, Bảo hiểm xã hội, Thuế TNCN và Chế độ Phúc lợi (C&B).' },
    { id: 'u-hr-04', name: 'Bùi Phương Linh', email: 'phuonglinh.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-02', avatar: 'https://i.pravatar.cc/150?u=hr4', phone: '0922345604', dob: '1995-10-15', hometown: 'Đà Nẵng', bio: 'Chuyên viên Tuyển dụng Kỹ sư Solar, Onboarding và Quản trị Hồ sơ Nhân sự.' },
    { id: 'u-hr-05', name: 'Phạm Minh Vương', email: 'minhvuong.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr5', phone: '0922345605', dob: '1997-02-18', hometown: 'Quảng Nam', bio: 'Chuyên viên Hành chính Quản trị Văn phòng, Mua sắm nội bộ và Đội xe Công ty.' },

    // 12. PHÒNG IT & CHUYỂN ĐỔI SỐ (dept-it)
    { id: 'u-it-01', name: 'Nguyễn Thành Trung', email: 'thanhtrung.it@tranlecorp.com.vn', role: 'Manager', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=it1', phone: '0923456701', dob: '1986-05-09', hometown: 'Hải Dương', bio: 'Trưởng Phòng IT & Chuyển Đổi Số - Kiến trúc sư trưởng Nền tảng TranLe Tasks.' },
    { id: 'u-it-02', name: 'Vũ Hoàng Long', email: 'hoanglong.it@tranlecorp.com.vn', role: 'Manager', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-deputy', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it2', phone: '0923456702', dob: '1989-01-28', hometown: 'Đà Nẵng', bio: 'Phó Phòng Hệ Thống Máy Chủ & Hạ Tầng Mạng Doanh Nghiệp.' },
    { id: 'u-it-03', name: 'Trương Minh Trí', email: 'minhtri.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it3', phone: '0923456703', dob: '1994-11-20', hometown: 'TP.HCM', bio: 'Kỹ sư Lập trình Fullstack Web - Phát triển các tính năng quản trị công việc & AI.' },
    { id: 'u-it-04', name: 'Lê Quốc Bảo', email: 'quocbao.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-02', avatar: 'https://i.pravatar.cc/150?u=it4', phone: '0923456704', dob: '1996-07-12', hometown: 'Đà Nẵng', bio: 'Kỹ sư Quản trị Hệ thống Cloud, Docker, Sao lưu dữ liệu & Bảo mật An ninh mạng.' },
    { id: 'u-it-05', name: 'Đặng Văn Hiệp', email: 'vanhiep.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it5', phone: '0923456705', dob: '1998-03-05', hometown: 'Quảng Bình', bio: 'Chuyên viên IT Helpdesk - Hỗ trợ kỹ thuật người dùng và quản lý thiết bị văn phòng.' },

    // 13. PHÒNG PHÁP CHẾ & HỢP ĐỒNG (dept-legal)
    { id: 'u-legal-01', name: 'Luật Sư Trần Minh Tuấn', email: 'minhtuan.legal@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=legal1', phone: '0924567801', dob: '1984-10-14', hometown: 'Hà Nội', bio: 'Trưởng Phòng Pháp Chế & Hợp Đồng - Luật sư trưởng bảo trợ pháp lý dự án năng lượng.' },
    { id: 'u-legal-02', name: 'Nguyễn Bích Phương', email: 'bichphuong.legal@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-deputy', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal2', phone: '0924567802', dob: '1988-06-03', hometown: 'Đà Nẵng', bio: 'Phó Phòng Quản Trị Hợp Đồng EPC & Thỏa thuận Hợp tác Quốc tế.' },
    { id: 'u-legal-03', name: 'Hoàng Văn Sơn', email: 'vanson.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal3', phone: '0924567803', dob: '1992-08-19', hometown: 'Thừa Thiên Huế', bio: 'Chuyên viên Pháp lý Đấu thầu Năng lượng và Thỏa thuận Đấu nối Điện lực EVN.' },
    { id: 'u-legal-04', name: 'Lê Quỳnh Chi', email: 'quynhchi.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-02', avatar: 'https://i.pravatar.cc/150?u=legal4', phone: '0924567804', dob: '1995-12-30', hometown: 'Đà Nẵng', bio: 'Chuyên viên Rà soát Hợp đồng Mua bán Thiết bị và Hợp đồng Tổng thầu EPC.' },
    { id: 'u-legal-05', name: 'Đỗ Thanh Tùng', email: 'thanhtung.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal5', phone: '0924567805', dob: '1997-09-17', hometown: 'Quảng Nam', bio: 'Chuyên viên Pháp lý Doanh nghiệp, Giấy phép Xây dựng và Sở hữu Trí tuệ.' },
  ];

  console.log(`Upserting ${INITIAL_USERS.length} users into MySQL database tranletask...`);

  for (const u of INITIAL_USERS) {
    const [rows]: any = await conn.query('SELECT id FROM users WHERE id = ? OR email = ?', [u.id, u.email]);
    if (rows.length === 0) {
      await conn.query(
        'INSERT INTO users (id, name, email, password, role, department, departmentId, teamId, positionId, managerId, avatar, phone, dob, hometown, bio, status, employmentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, hashedPassword, u.role, u.department, u.departmentId, u.teamId, u.positionId, u.managerId, u.avatar, u.phone, u.dob, u.hometown, u.bio, 'active', 'full_time']
      );
    } else {
      await conn.query(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ?, department = ?, departmentId = ?, teamId = ?, positionId = ?, managerId = ?, avatar = ?, phone = ?, dob = ?, hometown = ?, bio = ?, status = ? WHERE id = ?',
        [u.name, u.email, hashedPassword, u.role, u.department, u.departmentId, u.teamId, u.positionId, u.managerId, u.avatar, u.phone, u.dob, u.hometown, u.bio, 'active', rows[0].id]
      );
    }
  }

  // 5. Update Department Managers
  const DEPT_MANAGERS = [
    { deptId: 'dept-exec', managerId: 'u4' },
    { deptId: 'dept-sales', managerId: 'u-sales-01' },
    { deptId: 'dept-eng', managerId: 'u-eng-01' },
    { deptId: 'dept-epc', managerId: 'u2' },
    { deptId: 'dept-om', managerId: 'u-om-01' },
    { deptId: 'dept-proc', managerId: 'u-proc-01' },
    { deptId: 'dept-wh', managerId: 'u-wh-01' },
    { deptId: 'dept-mkt', managerId: 'u-mkt-01' },
    { deptId: 'dept-cs', managerId: 'u-cs-01' },
    { deptId: 'dept-fin', managerId: 'u-fin-01' },
    { deptId: 'dept-hr', managerId: 'u-hr-01' },
    { deptId: 'dept-it', managerId: 'u-it-01' },
    { deptId: 'dept-legal', managerId: 'u-legal-01' },
  ];

  for (const dm of DEPT_MANAGERS) {
    await conn.query('UPDATE departments SET managerId = ? WHERE id = ?', [dm.managerId, dm.deptId]);
  }

  // 6. Update Team Managers
  const TEAM_MANAGERS = [
    { teamId: 'team-sales-b2b', managerId: 'u-sales-01' },
    { teamId: 'team-sales-dist', managerId: 'u-sales-02' },
    { teamId: 'team-sales-resi', managerId: 'u-sales-05' },
    { teamId: 'team-eng-solar', managerId: 'u-eng-01' },
    { teamId: 'team-eng-elec', managerId: 'u-eng-02' },
    { teamId: 'team-epc-pm', managerId: 'u2' },
    { teamId: 'team-epc-const', managerId: 'u-epc-01' },
    { teamId: 'team-epc-qaqc', managerId: 'u-epc-02' },
    { teamId: 'team-epc-hse', managerId: 'u-epc-03' },
    { teamId: 'team-om-saj', managerId: 'u-om-01' },
    { teamId: 'team-om-solar', managerId: 'u-om-02' },
    { teamId: 'team-proc-intl', managerId: 'u-proc-01' },
    { teamId: 'team-wh-central', managerId: 'u-wh-01' },
    { teamId: 'team-wh-logistics', managerId: 'u-wh-02' },
    { teamId: 'team-mkt-digital', managerId: 'u-mkt-01' },
    { teamId: 'team-cs-service', managerId: 'u-cs-01' },
    { teamId: 'team-fin-acc', managerId: 'u-fin-01' },
    { teamId: 'team-hr-talent', managerId: 'u-hr-01' },
    { teamId: 'team-it-digital', managerId: 'u-it-01' },
    { teamId: 'team-legal-corp', managerId: 'u-legal-01' },
  ];

  for (const tm of TEAM_MANAGERS) {
    await conn.query('UPDATE teams SET managerId = ? WHERE id = ?', [tm.managerId, tm.teamId]);
  }

  const [countResult]: any = await conn.query('SELECT COUNT(*) as total FROM users');
  console.log(`✅ SEED COMPLETED! Total users in database: ${countResult[0].total}`);

  await conn.end();
}

runSeed().catch(err => {
  console.error('❌ Error executing seed:', err);
  process.exit(1);
});
