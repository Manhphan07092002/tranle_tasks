import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initDbMysql } from './db_mysql.js';

interface DeptRecord {
  id: string;
  code: string;
  name: string;
}

function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function runDepartmentMigration() {
  console.log('🚀 Starting Department ID Migration...');
  const db = await initDbMysql();

  // 1. Fetch all departments
  const depts: DeptRecord[] = await db.all('SELECT id, code, name FROM departments');
  console.log(`📋 Found ${depts.length} departments in database:`);
  depts.forEach(d => console.log(`   - [${d.id}] (${d.code}) ${d.name}`));

  // Mapping rules / aliases
  const aliasMap: Record<string, string> = {
    'kinh doanh': 'dept-sales',
    'phong kinh doanh': 'dept-sales',
    'sales': 'dept-sales',
    'kd': 'dept-sales',

    'ky thuat': 'dept-eng',
    'ky thuat solar': 'dept-eng',
    'phong ky thuat': 'dept-eng',
    'phong ky thuat solar': 'dept-eng',
    'engineering': 'dept-eng',
    'eng': 'dept-eng',

    'ban giam doc': 'dept-exec',
    'giam doc': 'dept-exec',
    'hoi dong quan tri va ban lanh dao cong ty': 'dept-exec',
    'admin': 'dept-exec',
    'ban lanh dao': 'dept-exec',
    'exec': 'dept-exec',

    'khoi tong thau epc thi cong': 'dept-epc',
    'khoi tong thau epc & thi cong': 'dept-epc',
    'epc': 'dept-epc',
    'thi cong': 'dept-epc',
    'khoi epc': 'dept-epc',

    'trung tam dich vu bao hanh o m saj center': 'dept-om',
    'trung tam dich vu & bao hanh o&m saj center': 'dept-om',
    'o m': 'dept-om',
    'o&m': 'dept-om',
    'saj center': 'dept-om',
    'bao hanh': 'dept-om',
    'om': 'dept-om',

    'phong mua hang cung ung': 'dept-proc',
    'phong mua hang & cung ung': 'dept-proc',
    'phong mua hang cung 3': 'dept-proc',
    'phong mua hang & cung 3': 'dept-proc',
    'mua hang': 'dept-proc',
    'cung ung': 'dept-proc',
    'procurement': 'dept-proc',
    'proc': 'dept-proc',

    'phong kho logistics': 'dept-wh',
    'phong kho & logistics': 'dept-wh',
    'kho': 'dept-wh',
    'kho logistics': 'dept-wh',
    'kho & logistics': 'dept-wh',
    'warehouse': 'dept-wh',
    'logistics': 'dept-wh',
    'wh': 'dept-wh',

    'phong marketing truyen thong': 'dept-mkt',
    'phong marketing & truyen thong': 'dept-mkt',
    'marketing': 'dept-mkt',
    'mkt': 'dept-mkt',
    'truyen thong': 'dept-mkt',

    'phong cham soc khach hang': 'dept-cs',
    'cham soc khach hang': 'dept-cs',
    'cskh': 'dept-cs',
    'cs': 'dept-cs',

    'phong tai chinh ke toan': 'dept-fin',
    'phong tai chinh - ke toan': 'dept-fin',
    'phong tai chinh – ke toan': 'dept-fin',
    'tai chinh ke toan': 'dept-fin',
    'ke toan': 'dept-fin',
    'tai chinh': 'dept-fin',
    'finance': 'dept-fin',
    'fin': 'dept-fin',

    'phong hanh chinh nhan su': 'dept-hr',
    'phong hanh chinh - nhan su': 'dept-hr',
    'phong hanh chinh – nhan su': 'dept-hr',
    'hanh chinh nhan su': 'dept-hr',
    'nhan su': 'dept-hr',
    'hcns': 'dept-hr',
    'hr': 'dept-hr',

    'phong it chuyen doi so': 'dept-it',
    'phong it & chuyen doi so': 'dept-it',
    'it': 'dept-it',
    'cong nghe thong tin': 'dept-it',
    'chuyen doi so': 'dept-it',

    'phong phap che hop dong': 'dept-legal',
    'phong phap che & hop dong': 'dept-legal',
    'phap che': 'dept-legal',
    'hop dong': 'dept-legal',
    'legal': 'dept-legal',
  };

  function resolveDepartmentId(deptRaw: string | undefined | null): string | null {
    if (!deptRaw) return null;
    const raw = String(deptRaw).trim();
    if (!raw) return null;

    // Direct match on ID
    const byId = depts.find(d => d.id && d.id.toLowerCase() === raw.toLowerCase());
    if (byId) return byId.id;

    // Direct match on Code
    const byCode = depts.find(d => d.code && d.code.toLowerCase() === raw.toLowerCase());
    if (byCode) return byCode.id;

    // Direct match on Name
    const byName = depts.find(d => d.name && d.name.toLowerCase() === raw.toLowerCase());
    if (byName) return byName.id;

    // Normalized lookup
    const norm = normalizeStr(raw);
    if (aliasMap[norm]) return aliasMap[norm];

    // Normalized search in depts
    const byNormName = depts.find(d => d.name && normalizeStr(d.name) === norm);
    if (byNormName) return byNormName.id;

    // Substring contains
    for (const d of depts) {
      if (!d.name) continue;
      const normDName = normalizeStr(d.name);
      if (norm.includes(normDName) || normDName.includes(norm)) {
        return d.id;
      }
    }

    return null;
  }

  const tables = [
    { name: 'users', query: 'SELECT id, department, departmentId FROM users' },
    { name: 'tasks', query: 'SELECT id, department, departmentId FROM tasks' },
    { name: 'projects', query: 'SELECT id, department, departmentId FROM projects' },
    { name: 'contracts', query: 'SELECT id, department, departmentId FROM contracts' },
    { name: 'revenue_reports', query: 'SELECT id, department, departmentId FROM revenue_reports' },
    { name: 'reports', query: 'SELECT id, department, departmentId FROM reports' },
  ];

  console.log('\n🔄 Processing Tables...');

  for (const t of tables) {
    try {
      const rows: any[] = await db.all(t.query);
      let updatedCount = 0;
      let alreadySetCount = 0;
      let unmappedList: { id: string; dept: string }[] = [];

      for (const row of rows) {
        const resolvedId = resolveDepartmentId(row.department || row.departmentId);
        if (resolvedId) {
          if (row.departmentId !== resolvedId) {
            await db.run(`UPDATE \`${t.name}\` SET departmentId = ? WHERE id = ?`, [resolvedId, row.id]);
            updatedCount++;
          } else {
            alreadySetCount++;
          }
        } else if (row.department) {
          unmappedList.push({ id: row.id, dept: row.department });
        }
      }

      console.log(`\n📊 Table: ${t.name}`);
      console.log(`   - Total records: ${rows.length}`);
      console.log(`   - Updated with departmentId: ${updatedCount}`);
      console.log(`   - Already had correct departmentId: ${alreadySetCount}`);
      if (unmappedList.length > 0) {
        console.warn(`   - ⚠️ Unmapped records (${unmappedList.length}):`);
        unmappedList.slice(0, 5).forEach(u => console.warn(`     • ID ${u.id}: "${u.dept}"`));
        if (unmappedList.length > 5) console.warn(`     • ... and ${unmappedList.length - 5} more`);
      }
    } catch (err: any) {
      console.error(`❌ Error migrating table ${t.name}:`, err.message);
    }
  }

  console.log('\n✅ Department ID Migration Completed Successfully!\n');
}

runDepartmentMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
