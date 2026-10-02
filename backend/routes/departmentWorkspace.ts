import express from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { MysqlDb } from '../db_mysql.js';
import { sendNotification } from '../utils/notify.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireDepartmentManager, requireDepartmentMember } from '../middleware/auth.js';

// P1: body records luôn có dạng { type, data } — chặn type lạ và data không phải object.
const WorkspaceRecordSchema = z.object({
  type: z.string().trim().min(1, 'Thiếu loại bản ghi').max(64),
  data: z.record(z.string(), z.unknown()),
});

// Canonical department IDs (seeded in db_mysql.ts TRANLE_DEPTS).
// Legacy aliases from older frontend builds are normalized here for backward compatibility.
const DEPT_ID_ALIASES: Record<string, string> = {
  'dept-finance': 'dept-fin',
  'dept-marketing': 'dept-mkt',
  'dept-procurement': 'dept-proc',
  'dept-warehouse': 'dept-wh',
};

function normalizeDepartmentId(rawId: string | string[] | undefined): string {
  const id = Array.isArray(rawId) ? rawId[0] ?? '' : rawId ?? '';
  return DEPT_ID_ALIASES[id] || id;
}

function isManagerOrAbove(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'director' || r === 'giám đốc' || r === 'manager' || r === 'trưởng phòng' || r === 'phó phòng';
}

export function departmentWorkspaceRoutes(db: MysqlDb) {
  const router = express.Router();

  // Route: GET /api/department-workspace/:departmentId/records
  router.get('/:departmentId/records', requireDepartmentMember(), async (req, res) => {
    const departmentId = normalizeDepartmentId(req.params.departmentId);
    const { type } = req.query;

    try {
      let records: any[] = [];
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          records = await db.all('SELECT * FROM customer_tickets ORDER BY createdAt DESC');
        } else if (type === 'renewals') {
          records = await db.all('SELECT * FROM contract_renewals ORDER BY expiry ASC');
        }
      } else if (departmentId === 'dept-epc') {
        if (type === 'subcontractor') {
          records = await db.all('SELECT * FROM epc_subcontractors ORDER BY createdAt DESC');
        } else if (type === 'hse') {
          records = await db.all('SELECT * FROM epc_hse_logs ORDER BY createdAt DESC');
        } else if (type === 'attendance') {
          records = await db.all('SELECT * FROM epc_attendance ORDER BY date DESC');
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          records = await db.all('SELECT * FROM executive_metrics ORDER BY createdAt ASC');
        } else if (type === 'okrs') {
          records = await db.all('SELECT * FROM company_okrs ORDER BY createdAt ASC');
        } else if (type === 'meetings') {
          records = await db.all('SELECT * FROM executive_meetings ORDER BY createdAt ASC');
        }
      } else if (departmentId === 'dept-fin') {
        if (type === 'ap') {
          records = await db.all('SELECT * FROM finance_ap ORDER BY createdAt DESC');
        } else if (type === 'ar') {
          records = await db.all('SELECT * FROM finance_ar ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-hr') {
        if (type === 'recruitment') {
          records = await db.all('SELECT * FROM hr_recruitment ORDER BY createdAt DESC');
        } else if (type === 'employees') {
          records = await db.all('SELECT * FROM hr_employees ORDER BY createdAt DESC');
        } else if (type === 'leaves') {
          records = await db.all('SELECT * FROM hr_leaves ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-it') {
        if (type === 'tickets') {
          records = await db.all('SELECT * FROM it_tickets ORDER BY createdAt DESC');
        } else if (type === 'assets') {
          records = await db.all('SELECT * FROM it_assets ORDER BY createdAt DESC');
        } else if (type === 'infrastructure') {
          records = await db.all('SELECT * FROM it_systems ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-legal') {
        if (type === 'contracts') {
          records = await db.all('SELECT * FROM legal_contracts ORDER BY createdAt DESC');
        } else if (type === 'approvals') {
          records = await db.all('SELECT * FROM legal_approvals ORDER BY createdAt DESC');
        } else if (type === 'library') {
          records = await db.all('SELECT * FROM legal_library ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-mkt') {
        if (type === 'campaigns') {
          records = await db.all('SELECT * FROM marketing_campaigns ORDER BY createdAt DESC');
        } else if (type === 'leads') {
          records = await db.all('SELECT * FROM marketing_leads ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-om') {
        if (type === 'alarms') {
          records = await db.all('SELECT * FROM om_alarms ORDER BY createdAt DESC');
        } else if (type === 'pm') {
          records = await db.all('SELECT * FROM om_schedules ORDER BY createdAt DESC');
        } else if (type === 'production') {
          records = await db.all('SELECT * FROM om_production ORDER BY date DESC');
        } else if (type === 'sites') {
          records = await db.all('SELECT * FROM om_sites ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-proc') {
        if (type === 'prs') {
          records = await db.all('SELECT * FROM procurement_prs ORDER BY createdAt DESC');
        } else if (type === 'pos') {
          records = await db.all('SELECT * FROM procurement_pos ORDER BY createdAt DESC');
        } else if (type === 'rfqs') {
          records = await db.all('SELECT * FROM procurement_rfqs ORDER BY createdAt DESC');
        } else if (type === 'supplier_quotes') {
          records = await db.all('SELECT * FROM procurement_quotes ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-wh') {
        if (type === 'inventory') {
          records = await db.all('SELECT * FROM warehouse_inventory ORDER BY createdAt DESC');
        } else if (type === 'inbound') {
          records = await db.all('SELECT * FROM warehouse_inbound ORDER BY createdAt DESC');
        } else if (type === 'outbound') {
          records = await db.all('SELECT * FROM warehouse_outbound ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-sales') {
        if (type === 'leads') {
          records = await db.all('SELECT * FROM sales_leads ORDER BY createdAt DESC');
        } else if (type === 'performance') {
          records = await db.all('SELECT * FROM sales_performance ORDER BY createdAt DESC');
        } else if (type === 'quotes') {
          records = await db.all('SELECT * FROM sales_quotes ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          records = await db.all('SELECT * FROM engineering_requests ORDER BY createdAt DESC');
        } else if (type === 'design') {
          records = await db.all('SELECT * FROM engineering_designs ORDER BY createdAt DESC');
          // Parse tasks JSON back to array for frontend
          records = records.map(r => ({ ...r, tasks: r.tasks ? JSON.parse(r.tasks) : [] }));
        }
      }
      
      res.json(records);
    } catch (error: any) {
      console.error(`[GET /department-workspace/${departmentId}/records] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route: POST /api/department-workspace/:departmentId/records
  // Intent: mọi user đã đăng nhập đều được tạo/sửa records (Employee tạo PR, ticket, lead...).
  // Phê duyệt kiểm soát ở tầng approvals (canUserApprove); chỉ DELETE mới giới hạn Manager+.
  router.post('/:departmentId/records', requireDepartmentManager(), validate(WorkspaceRecordSchema), async (req, res) => {
    const departmentId = normalizeDepartmentId(req.params.departmentId);
    const { type, data } = req.body;
    const now = new Date().toISOString();
    const id = randomUUID();

    try {
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          const { customer, channel, title, status, time, agent, avatar, csat, category } = data;
          await db.run(
            'INSERT INTO customer_tickets (id, customer, channel, title, status, time, agent, avatar, csat, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customer, channel, title, status, time, agent, avatar, csat ?? null, category || null, now]
          );
        } else if (type === 'renewals') {
          const { customer, expiry, value, status } = data;
          await db.run(
            'INSERT INTO contract_renewals (id, customer, expiry, value, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, customer, expiry, value, status, now]
          );
        }
      } else if (departmentId === 'dept-epc') {
        if (type === 'subcontractor') {
          const { name, task: subTask, rating, status } = data;
          await db.run(
            'INSERT INTO epc_subcontractors (id, name, task, rating, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, subTask, rating, status, now]
          );
        } else if (type === 'hse') {
          const { site, category, title, severity, date, status, action } = data;
          await db.run(
            'INSERT INTO epc_hse_logs (id, site, category, title, severity, date, status, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, site, category, title, severity, date, status, action, now]
          );
        } else if (type === 'attendance') {
          const { site, date, team, workers, note } = data;
          await db.run(
            'INSERT INTO epc_attendance (id, site, date, team, workers, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, site, date, team, workers, note, now]
          );
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          const { month, revenue, cost, profit } = data;
          await db.run(
            'INSERT INTO executive_metrics (id, month, revenue, cost, profit, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, month, revenue, cost, profit, now]
          );
        } else if (type === 'okrs') {
          const { objective, progress, dept, status } = data;
          await db.run(
            'INSERT INTO company_okrs (id, objective, progress, dept, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, objective, progress, dept, status, now]
          );
        } else if (type === 'meetings') {
          const { title, date, actions, pending } = data;
          await db.run(
            'INSERT INTO executive_meetings (id, title, date, actions, pending, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, title, date, actions, pending, now]
          );
        }
      } else if (departmentId === 'dept-fin') {
        if (type === 'ap') {
          const { dept, desc_text, amount, vendor, date, status } = data;
          await db.run(
            'INSERT INTO finance_ap (id, dept, desc_text, amount, vendor, date, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, dept, desc_text, amount, vendor, date, status, now]
          );
        } else if (type === 'ar') {
          const { project, desc_text, amount, customer, dueDate, status, milestoneId, projectId } = data;
          await db.run(
            'INSERT INTO finance_ar (id, project, desc_text, amount, customer, dueDate, status, milestoneId, projectId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, project, desc_text, amount, customer, dueDate, status, milestoneId || null, projectId || null, now]
          );
        }
      } else if (departmentId === 'dept-hr') {
        if (type === 'recruitment') {
          const { title, dept, slots, applied, status } = data;
          await db.run(
            'INSERT INTO hr_recruitment (id, title, dept, slots, applied, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, dept, slots, applied, status, now]
          );
        } else if (type === 'employees') {
          const { name, position, dept, status, pto, timesheet } = data;
          await db.run(
            'INSERT INTO hr_employees (id, name, position, dept, status, pto, timesheet, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, position, dept, status, pto, timesheet, now]
          );
        } else if (type === 'leaves') {
          const { employeeName, type: leaveType, startDate, days, status } = data;
          await db.run(
            'INSERT INTO hr_leaves (id, employeeName, type, startDate, days, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, employeeName, leaveType, startDate, days, status, now]
          );
        }
      } else if (departmentId === 'dept-it') {
        if (type === 'tickets') {
          const { issue, requester, priority, status, time } = data;
          await db.run(
            'INSERT INTO it_tickets (id, issue, requester, priority, status, time, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, issue, requester, priority, status, time, now]
          );
        } else if (type === 'assets') {
          const { name, assignee, type: assetType, status } = data;
          await db.run(
            'INSERT INTO it_assets (id, name, assignee, type, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, assignee, assetType, status, now]
          );
        } else if (type === 'infrastructure') {
          const { name, status, uptime, load_pct } = data;
          await db.run(
            'INSERT INTO it_systems (id, name, status, uptime, load_pct, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, status, uptime, load_pct, now]
          );
        }
      } else if (departmentId === 'dept-legal') {
        if (type === 'contracts') {
          const { title, partner, type: contractType, value, status, expiry } = data;
          await db.run(
            'INSERT INTO legal_contracts (id, title, partner, type, value, status, expiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, partner, contractType, value, status, expiry, now]
          );
        } else if (type === 'approvals') {
          const { title, entity, requester, step, urgency } = data;
          await db.run(
            'INSERT INTO legal_approvals (id, title, entity, requester, step, urgency, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, entity, requester, step, urgency, now]
          );
        } else if (type === 'library') {
          const { title, category, date } = data;
          await db.run(
            'INSERT INTO legal_library (id, title, category, date, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, title, category, date, now]
          );
        }
      } else if (departmentId === 'dept-mkt') {
        if (type === 'campaigns') {
          const { title, channels, status } = data;
          await db.run(
            'INSERT INTO marketing_campaigns (id, title, channels, status, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, title, channels, status, now]
          );
        } else if (type === 'leads') {
          const { source, percentage, leadCount, conversion } = data;
          await db.run(
            'INSERT INTO marketing_leads (id, source, percentage, leadCount, conversion, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, source, percentage, Number(leadCount) || 0, Number(conversion) || 0, now]
          );
        }
      } else if (departmentId === 'dept-om') {
        if (type === 'alarms') {
          const { site, inverter, fault, time, severity, status } = data;
          await db.run(
            'INSERT INTO om_alarms (id, site, inverter, fault, time, severity, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, site, inverter, fault, time, severity, status, now]
          );
        } else if (type === 'pm') {
          const { site, task, date, team, status } = data;
          await db.run(
            'INSERT INTO om_schedules (id, site, task, date, team, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, site, task, date, team, status, now]
          );
        } else if (type === 'production') {
          const { site, date, kwh } = data;
          await db.run(
            'INSERT INTO om_production (id, site, date, kwh, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, site, date, kwh, now]
          );
        } else if (type === 'sites') {
          const { name, capacityKwp, location, sunHours, warrantyExpiry } = data;
          await db.run(
            'INSERT INTO om_sites (id, name, capacityKwp, location, sunHours, warrantyExpiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, capacityKwp, location, Number(sunHours) || 4.5, warrantyExpiry || null, now]
          );
        }
      } else if (departmentId === 'dept-proc') {
        if (type === 'prs') {
          const { project, items, date, status, priority, designId } = data;
          await db.run(
            'INSERT INTO procurement_prs (id, project, items, date, status, priority, designId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, project, items, date, status, priority, designId || null, now]
          );
        } else if (type === 'pos') {
          const { supplier, value, items, stage, progress, eta, status, prId } = data;
          await db.run(
            'INSERT INTO procurement_pos (id, supplier, value, items, stage, progress, eta, status, prId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, supplier, value, items, stage, progress, eta, status, prId || null, now]
          );
        } else if (type === 'rfqs') {
          const { title, items, deadline, status } = data;
          await db.run(
            'INSERT INTO procurement_rfqs (id, title, items, deadline, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, title, items, deadline, status, now]
          );
        } else if (type === 'supplier_quotes') {
          const { rfqId, supplier, price, warranty, leadTime, status } = data;
          await db.run(
            'INSERT INTO procurement_quotes (id, rfqId, supplier, price, warranty, leadTime, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, rfqId, supplier, price, warranty, leadTime, status, now]
          );
        }
      } else if (departmentId === 'dept-wh') {
        if (type === 'inventory') {
          const { sku, name, category, stock, minStock, unit, image, serials } = data;
          await db.run(
            'INSERT INTO warehouse_inventory (id, sku, name, category, stock, minStock, unit, image, serials, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, name, category, stock, minStock, unit, image, serials || null, now]
          );
        } else if (type === 'inbound') {
          const { source, items, date, status, poId } = data;
          await db.run(
            'INSERT INTO warehouse_inbound (id, source, items, date, status, poId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, source, items, date, status, poId || null, now]
          );
        } else if (type === 'outbound') {
          const { project, items, date, status, requestedBy, projectId } = data;
          await db.run(
            'INSERT INTO warehouse_outbound (id, project, items, date, status, requestedBy, projectId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, project, items, date, status, requestedBy, projectId || null, now]
          );
        }
      } else if (departmentId === 'dept-sales') {
        if (type === 'leads') {
          const { name, value, capacity, contact, stage, sent } = data;
          await db.run(
            'INSERT INTO sales_leads (id, name, value, capacity, contact, stage, sent, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, value, capacity, contact, stage, sent ? 1 : 0, now]
          );
        } else if (type === 'performance') {
          const { name, sales } = data;
          await db.run(
            'INSERT INTO sales_performance (id, name, sales, createdAt) VALUES (?, ?, ?, ?)',
            [id, name, sales, now]
          );
        } else if (type === 'quotes') {
          const { leadId, version, amount, items, status } = data;
          await db.run(
            'INSERT INTO sales_quotes (id, leadId, version, amount, items, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, leadId, version, amount, items, status, now]
          );
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          const { type: reqType, project, date, status, priority } = data;
          await db.run(
            'INSERT INTO engineering_requests (id, type, project, date, status, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, reqType, project, date, status, priority, now]
          );
        } else if (type === 'design') {
          const { name, capacity, stage, progress, tasks, status, project } = data;
          await db.run(
            'INSERT INTO engineering_designs (id, name, capacity, stage, progress, tasks, status, project, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, capacity, stage, progress, JSON.stringify(tasks || []), status, project || null, now]
          );
        }
      }

      res.status(201).json({ id, ...data, createdAt: now });
    } catch (error: any) {
      console.error(`[POST /department-workspace/${departmentId}/records] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route: PUT /api/department-workspace/:departmentId/records/:id
  router.put('/:departmentId/records/:id', requireDepartmentManager(), validate(WorkspaceRecordSchema), async (req, res) => {
    const departmentId = normalizeDepartmentId(req.params.departmentId);
    const { id } = req.params;
    const { type, data } = req.body;
    const now = new Date().toISOString();

    try {
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          const { customer, channel, title, status, time, agent, avatar, csat, category } = data;
          await db.run(
            'UPDATE customer_tickets SET customer = ?, channel = ?, title = ?, status = ?, time = ?, agent = ?, avatar = ?, csat = ?, category = ?, updatedAt = ? WHERE id = ?',
            [customer, channel, title, status, time, agent, avatar, csat ?? null, category || null, now, id]
          );
        } else if (type === 'renewals') {
          const { customer, expiry, value, status } = data;
          await db.run(
            'UPDATE contract_renewals SET customer = ?, expiry = ?, value = ?, status = ?, updatedAt = ? WHERE id = ?',
            [customer, expiry, value, status, now, id]
          );
        }
      } else if (departmentId === 'dept-epc') {
        if (type === 'subcontractor') {
          const { name, task: subTask, rating, status } = data;
          await db.run(
            'UPDATE epc_subcontractors SET name = ?, task = ?, rating = ?, status = ?, updatedAt = ? WHERE id = ?',
            [name, subTask, rating, status, now, id]
          );
        } else if (type === 'hse') {
          const { site, category, title, severity, date, status, action } = data;
          await db.run(
            'UPDATE epc_hse_logs SET site = ?, category = ?, title = ?, severity = ?, date = ?, status = ?, action = ?, updatedAt = ? WHERE id = ?',
            [site, category, title, severity, date, status, action, now, id]
          );
        } else if (type === 'attendance') {
          const { site, date, team, workers, note } = data;
          await db.run(
            'UPDATE epc_attendance SET site = ?, date = ?, team = ?, workers = ?, note = ?, updatedAt = ? WHERE id = ?',
            [site, date, team, workers, note, now, id]
          );
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          const { month, revenue, cost, profit } = data;
          await db.run(
            'UPDATE executive_metrics SET month = ?, revenue = ?, cost = ?, profit = ?, updatedAt = ? WHERE id = ?',
            [month, revenue, cost, profit, now, id]
          );
        } else if (type === 'okrs') {
          const { objective, progress, dept, status } = data;
          await db.run(
            'UPDATE company_okrs SET objective = ?, progress = ?, dept = ?, status = ?, updatedAt = ? WHERE id = ?',
            [objective, progress, dept, status, now, id]
          );
        } else if (type === 'meetings') {
          const { title, date, actions, pending } = data;
          await db.run(
            'UPDATE executive_meetings SET title = ?, date = ?, actions = ?, pending = ?, updatedAt = ? WHERE id = ?',
            [title, date, actions, pending, now, id]
          );
        }
      } else if (departmentId === 'dept-fin') {
        if (type === 'ap') {
          const { dept, desc_text, amount, vendor, date, status } = data;
          await db.run(
            'UPDATE finance_ap SET dept = ?, desc_text = ?, amount = ?, vendor = ?, date = ?, status = ?, updatedAt = ? WHERE id = ?',
            [dept, desc_text, amount, vendor, date, status, now, id]
          );
        } else if (type === 'ar') {
          const { project, desc_text, amount, customer, dueDate, status, milestoneId, projectId } = data;
          await db.run(
            'UPDATE finance_ar SET project = ?, desc_text = ?, amount = ?, customer = ?, dueDate = ?, status = ?, milestoneId = ?, projectId = ?, updatedAt = ? WHERE id = ?',
            [project, desc_text, amount, customer, dueDate, status, milestoneId || null, projectId || null, now, id]
          );
        }
      } else if (departmentId === 'dept-hr') {
        if (type === 'recruitment') {
          const { title, dept, slots, applied, status } = data;
          await db.run(
            'UPDATE hr_recruitment SET title = ?, dept = ?, slots = ?, applied = ?, status = ?, updatedAt = ? WHERE id = ?',
            [title, dept, slots, applied, status, now, id]
          );
        } else if (type === 'employees') {
          const { name, position, dept, status, pto, timesheet } = data;
          await db.run(
            'UPDATE hr_employees SET name = ?, position = ?, dept = ?, status = ?, pto = ?, timesheet = ?, updatedAt = ? WHERE id = ?',
            [name, position, dept, status, pto, timesheet, now, id]
          );
        } else if (type === 'leaves') {
          const { employeeName, type: leaveType, startDate, days, status } = data;
          await db.run(
            'UPDATE hr_leaves SET employeeName = ?, type = ?, startDate = ?, days = ?, status = ?, updatedAt = ? WHERE id = ?',
            [employeeName, leaveType, startDate, days, status, now, id]
          );
        }
      } else if (departmentId === 'dept-it') {
        if (type === 'tickets') {
          const { issue, requester, priority, status, time } = data;
          await db.run(
            'UPDATE it_tickets SET issue = ?, requester = ?, priority = ?, status = ?, time = ?, updatedAt = ? WHERE id = ?',
            [issue, requester, priority, status, time, now, id]
          );
        } else if (type === 'assets') {
          const { name, assignee, type: assetType, status } = data;
          await db.run(
            'UPDATE it_assets SET name = ?, assignee = ?, type = ?, status = ?, updatedAt = ? WHERE id = ?',
            [name, assignee, assetType, status, now, id]
          );
        } else if (type === 'infrastructure') {
          const { name, status, uptime, load_pct } = data;
          await db.run(
            'UPDATE it_systems SET name = ?, status = ?, uptime = ?, load_pct = ?, updatedAt = ? WHERE id = ?',
            [name, status, uptime, load_pct, now, id]
          );
        }
      } else if (departmentId === 'dept-legal') {
        if (type === 'contracts') {
          const { title, partner, type: contractType, value, status, expiry } = data;
          await db.run(
            'UPDATE legal_contracts SET title = ?, partner = ?, type = ?, value = ?, status = ?, expiry = ?, updatedAt = ? WHERE id = ?',
            [title, partner, contractType, value, status, expiry, now, id]
          );
        } else if (type === 'approvals') {
          const { title, entity, requester, step, urgency } = data;
          await db.run(
            'UPDATE legal_approvals SET title = ?, entity = ?, requester = ?, step = ?, urgency = ?, updatedAt = ? WHERE id = ?',
            [title, entity, requester, step, urgency, now, id]
          );
        } else if (type === 'library') {
          const { title, category, date } = data;
          await db.run(
            'UPDATE legal_library SET title = ?, category = ?, date = ?, updatedAt = ? WHERE id = ?',
            [title, category, date, now, id]
          );
        }
      } else if (departmentId === 'dept-mkt') {
        if (type === 'campaigns') {
          const { title, channels, status } = data;
          await db.run(
            'UPDATE marketing_campaigns SET title = ?, channels = ?, status = ?, updatedAt = ? WHERE id = ?',
            [title, channels, status, now, id]
          );
        } else if (type === 'leads') {
          const { source, percentage, leadCount, conversion } = data;
          await db.run(
            'UPDATE marketing_leads SET source = ?, percentage = ?, leadCount = ?, conversion = ?, updatedAt = ? WHERE id = ?',
            [source, percentage, Number(leadCount) || 0, Number(conversion) || 0, now, id]
          );
        }
      } else if (departmentId === 'dept-om') {
        if (type === 'alarms') {
          const { site, inverter, fault, time, severity, status } = data;
          await db.run(
            'UPDATE om_alarms SET site = ?, inverter = ?, fault = ?, time = ?, severity = ?, status = ?, updatedAt = ? WHERE id = ?',
            [site, inverter, fault, time, severity, status, now, id]
          );
        } else if (type === 'pm') {
          const { site, task, date, team, status } = data;
          await db.run(
            'UPDATE om_schedules SET site = ?, task = ?, date = ?, team = ?, status = ?, updatedAt = ? WHERE id = ?',
            [site, task, date, team, status, now, id]
          );
        } else if (type === 'production') {
          const { site, date, kwh } = data;
          await db.run(
            'UPDATE om_production SET site = ?, date = ?, kwh = ?, updatedAt = ? WHERE id = ?',
            [site, date, kwh, now, id]
          );
        } else if (type === 'sites') {
          const { name, capacityKwp, location, sunHours, warrantyExpiry } = data;
          await db.run(
            'UPDATE om_sites SET name = ?, capacityKwp = ?, location = ?, sunHours = ?, warrantyExpiry = ?, updatedAt = ? WHERE id = ?',
            [name, capacityKwp, location, Number(sunHours) || 4.5, warrantyExpiry || null, now, id]
          );
        }
      } else if (departmentId === 'dept-proc') {
        if (type === 'prs') {
          const { project, items, date, status, priority, designId } = data;
          await db.run(
            'UPDATE procurement_prs SET project = ?, items = ?, date = ?, status = ?, priority = ?, designId = ?, updatedAt = ? WHERE id = ?',
            [project, items, date, status, priority, designId || null, now, id]
          );
        } else if (type === 'pos') {
          const { supplier, value, items, stage, progress, eta, status, prId } = data;
          await db.run(
            'UPDATE procurement_pos SET supplier = ?, value = ?, items = ?, stage = ?, progress = ?, eta = ?, status = ?, prId = ?, updatedAt = ? WHERE id = ?',
            [supplier, value, items, stage, progress, eta, status, prId || null, now, id]
          );
        } else if (type === 'rfqs') {
          const { title, items, deadline, status } = data;
          await db.run(
            'UPDATE procurement_rfqs SET title = ?, items = ?, deadline = ?, status = ?, updatedAt = ? WHERE id = ?',
            [title, items, deadline, status, now, id]
          );
        } else if (type === 'supplier_quotes') {
          const { rfqId, supplier, price, warranty, leadTime, status } = data;
          await db.run(
            'UPDATE procurement_quotes SET rfqId = ?, supplier = ?, price = ?, warranty = ?, leadTime = ?, status = ?, updatedAt = ? WHERE id = ?',
            [rfqId, supplier, price, warranty, leadTime, status, now, id]
          );
        }
      } else if (departmentId === 'dept-wh') {
        if (type === 'inventory') {
          const { sku, name, category, stock, minStock, unit, image, serials } = data;
          await db.run(
            'UPDATE warehouse_inventory SET sku = ?, name = ?, category = ?, stock = ?, minStock = ?, unit = ?, image = ?, serials = ?, updatedAt = ? WHERE id = ?',
            [sku, name, category, stock, minStock, unit, image, serials || null, now, id]
          );
        } else if (type === 'inbound') {
          const { source, items, date, status, poId } = data;
          await db.run(
            'UPDATE warehouse_inbound SET source = ?, items = ?, date = ?, status = ?, poId = ?, updatedAt = ? WHERE id = ?',
            [source, items, date, status, poId || null, now, id]
          );
        } else if (type === 'outbound') {
          const { project, items, date, status, requestedBy, projectId } = data;
          await db.run(
            'UPDATE warehouse_outbound SET project = ?, items = ?, date = ?, status = ?, requestedBy = ?, projectId = ?, updatedAt = ? WHERE id = ?',
            [project, items, date, status, requestedBy, projectId || null, now, id]
          );
        }
      } else if (departmentId === 'dept-sales') {
        if (type === 'leads') {
          const { name, value, capacity, contact, stage, sent } = data;
          await db.run(
            'UPDATE sales_leads SET name = ?, value = ?, capacity = ?, contact = ?, stage = ?, sent = ?, updatedAt = ? WHERE id = ?',
            [name, value, capacity, contact, stage, sent ? 1 : 0, now, id]
          );
        } else if (type === 'performance') {
          const { name, sales } = data;
          await db.run(
            'UPDATE sales_performance SET name = ?, sales = ?, updatedAt = ? WHERE id = ?',
            [name, sales, now, id]
          );
        } else if (type === 'quotes') {
          const { leadId, version, amount, items, status } = data;
          await db.run(
            'UPDATE sales_quotes SET leadId = ?, version = ?, amount = ?, items = ?, status = ?, updatedAt = ? WHERE id = ?',
            [leadId, version, amount, items, status, now, id]
          );
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          const { type: reqType, project, date, status, priority } = data;
          await db.run(
            'UPDATE engineering_requests SET type = ?, project = ?, date = ?, status = ?, priority = ?, updatedAt = ? WHERE id = ?',
            [reqType, project, date, status, priority, now, id]
          );
        } else if (type === 'design') {
          const { name, capacity, stage, progress, tasks, status, project } = data;
          await db.run(
            'UPDATE engineering_designs SET name = ?, capacity = ?, stage = ?, progress = ?, tasks = ?, status = ?, project = ?, updatedAt = ? WHERE id = ?',
            [name, capacity, stage, progress, JSON.stringify(tasks || []), status, project || null, now, id]
          );
        }
      }
      res.json({ id, ...data, updatedAt: now });
    } catch (error: any) {
      console.error(`[PUT /department-workspace/${departmentId}/records/${id}] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route: DELETE /api/department-workspace/:departmentId/records/:id
  // P0 RBAC: Employee không được xóa records phòng ban (chỉ Manager/Director/Admin).
  router.delete('/:departmentId/records/:id', requireDepartmentManager(), async (req, res) => {
    if (!isManagerOrAbove((req as any).user?.role)) {
      return res.status(403).json({ error: 'Forbidden: Chỉ Trưởng/Phó phòng, Giám đốc hoặc Admin được xóa dữ liệu phòng ban' });
    }
    const departmentId = normalizeDepartmentId(req.params.departmentId);
    const { id } = req.params;
    const { type } = req.query;

    try {
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          await db.run('DELETE FROM customer_tickets WHERE id = ?', [id]);
        } else if (type === 'renewals') {
          await db.run('DELETE FROM contract_renewals WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          await db.run('DELETE FROM engineering_requests WHERE id = ?', [id]);
        } else if (type === 'design') {
          await db.run('DELETE FROM engineering_designs WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-epc') {
        if (type === 'subcontractor') {
          await db.run('DELETE FROM epc_subcontractors WHERE id = ?', [id]);
        } else if (type === 'hse') {
          await db.run('DELETE FROM epc_hse_logs WHERE id = ?', [id]);
        } else if (type === 'attendance') {
          await db.run('DELETE FROM epc_attendance WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          await db.run('DELETE FROM executive_metrics WHERE id = ?', [id]);
        } else if (type === 'okrs') {
          await db.run('DELETE FROM company_okrs WHERE id = ?', [id]);
        } else if (type === 'meetings') {
          await db.run('DELETE FROM executive_meetings WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-fin') {
        if (type === 'ap') {
          await db.run('DELETE FROM finance_ap WHERE id = ?', [id]);
        } else if (type === 'ar') {
          await db.run('DELETE FROM finance_ar WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-hr') {
        if (type === 'recruitment') {
          await db.run('DELETE FROM hr_recruitment WHERE id = ?', [id]);
        } else if (type === 'employees') {
          await db.run('DELETE FROM hr_employees WHERE id = ?', [id]);
        } else if (type === 'leaves') {
          await db.run('DELETE FROM hr_leaves WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-it') {
        if (type === 'tickets') {
          await db.run('DELETE FROM it_tickets WHERE id = ?', [id]);
        } else if (type === 'assets') {
          await db.run('DELETE FROM it_assets WHERE id = ?', [id]);
        } else if (type === 'infrastructure') {
          await db.run('DELETE FROM it_systems WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-legal') {
        if (type === 'contracts') {
          await db.run('DELETE FROM legal_contracts WHERE id = ?', [id]);
        } else if (type === 'approvals') {
          await db.run('DELETE FROM legal_approvals WHERE id = ?', [id]);
        } else if (type === 'library') {
          await db.run('DELETE FROM legal_library WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-mkt') {
        if (type === 'campaigns') {
          await db.run('DELETE FROM marketing_campaigns WHERE id = ?', [id]);
        } else if (type === 'leads') {
          await db.run('DELETE FROM marketing_leads WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-om') {
        if (type === 'alarms') {
          await db.run('DELETE FROM om_alarms WHERE id = ?', [id]);
        } else if (type === 'pm') {
          await db.run('DELETE FROM om_schedules WHERE id = ?', [id]);
        } else if (type === 'production') {
          await db.run('DELETE FROM om_production WHERE id = ?', [id]);
        } else if (type === 'sites') {
          await db.run('DELETE FROM om_sites WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-proc') {
        if (type === 'prs') {
          await db.run('DELETE FROM procurement_prs WHERE id = ?', [id]);
        } else if (type === 'pos') {
          await db.run('DELETE FROM procurement_pos WHERE id = ?', [id]);
        } else if (type === 'rfqs') {
          await db.run('DELETE FROM procurement_rfqs WHERE id = ?', [id]);
        } else if (type === 'supplier_quotes') {
          await db.run('DELETE FROM procurement_quotes WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-wh') {
        if (type === 'inventory') {
          await db.run('DELETE FROM warehouse_inventory WHERE id = ?', [id]);
        } else if (type === 'inbound') {
          await db.run('DELETE FROM warehouse_inbound WHERE id = ?', [id]);
        } else if (type === 'outbound') {
          await db.run('DELETE FROM warehouse_outbound WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-sales') {
        if (type === 'leads') {
          await db.run('DELETE FROM sales_leads WHERE id = ?', [id]);
        } else if (type === 'performance') {
          await db.run('DELETE FROM sales_performance WHERE id = ?', [id]);
        } else if (type === 'quotes') {
          await db.run('DELETE FROM sales_quotes WHERE id = ?', [id]);
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[DELETE /department-workspace/${departmentId}/records/${id}] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route: GET /api/department-workspace/:departmentId/kpis
  // Returns computed KPI metrics from MySQL for the dashboard cards
  router.get('/:departmentId/kpis', requireDepartmentMember(), async (req, res) => {
    const departmentId = normalizeDepartmentId(req.params.departmentId);
    try {
      let kpis: Record<string, any> = {};

      if (departmentId === 'dept-cs') {
        const [totalTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets`) as any[];
        const [pendingTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets WHERE status = 'Pending'`) as any[];
        const [inProgressTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets WHERE status = 'In Progress'`) as any[];
        const [totalRenewals] = await db.all(`SELECT COUNT(*) AS cnt FROM contract_renewals`) as any[];
        const [csatAvg] = await db.all(`SELECT AVG(csat) AS avg, COUNT(*) AS cnt FROM customer_tickets WHERE csat IS NOT NULL`) as any[];
        kpis = {
          totalTickets: totalTickets?.cnt ?? 0,
          pendingTickets: pendingTickets?.cnt ?? 0,
          inProgressTickets: inProgressTickets?.cnt ?? 0,
          totalRenewals: totalRenewals?.cnt ?? 0,
          csatAvg: csatAvg?.avg != null ? Math.round(Number(csatAvg.avg) * 10) / 10 : null,
          csatCount: csatAvg?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-eng') {
        const [pendingRequests] = await db.all(`SELECT COUNT(*) AS cnt FROM engineering_requests WHERE status = 'pending'`) as any[];
        const [inDesign] = await db.all(`SELECT COUNT(*) AS cnt FROM engineering_designs WHERE status != 'completed'`) as any[];
        const [completedBom] = await db.all(`SELECT COUNT(*) AS cnt FROM engineering_designs WHERE status = 'completed'`) as any[];
        const [urgentRequests] = await db.all(`SELECT COUNT(*) AS cnt FROM engineering_requests WHERE priority = 'urgent'`) as any[];
        kpis = {
          pendingRequests: pendingRequests?.cnt ?? 0,
          inDesign: inDesign?.cnt ?? 0,
          completedBom: completedBom?.cnt ?? 0,
          urgentRequests: urgentRequests?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-epc') {
        const [activeProjects] = await db.all(`SELECT COUNT(DISTINCT task) AS cnt FROM epc_subcontractors WHERE status = 'active'`) as any[];
        const [totalWorkers] = await db.all(`SELECT COUNT(*) AS cnt FROM epc_subcontractors WHERE status = 'active'`) as any[];
        const [inboundCount] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inbound`) as any[];
        const [openHse] = await db.all(`SELECT COUNT(*) AS cnt FROM epc_hse_logs WHERE status = 'open'`) as any[];
        const [criticalHse] = await db.all(`SELECT COUNT(*) AS cnt FROM epc_hse_logs WHERE severity = 'critical' AND status = 'open'`) as any[];
        kpis = {
          activeProjects: activeProjects?.cnt ?? 0,
          totalWorkers: totalWorkers?.cnt ?? 0,
          inboundCount: inboundCount?.cnt ?? 0,
          openHse: openHse?.cnt ?? 0,
          criticalHse: criticalHse?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-om') {
        const [activeAlarms] = await db.all(`SELECT COUNT(*) AS cnt FROM om_alarms WHERE status = 'active'`) as any[];
        const [criticalAlarms] = await db.all(`SELECT COUNT(*) AS cnt FROM om_alarms WHERE severity = 'critical' AND status = 'active'`) as any[];
        const [totalSchedules] = await db.all(`SELECT COUNT(*) AS cnt FROM om_schedules`) as any[];
        const [productionSites] = await db.all(`SELECT COUNT(DISTINCT site) AS cnt FROM om_production`) as any[];
        kpis = {
          activeAlarms: activeAlarms?.cnt ?? 0,
          criticalAlarms: criticalAlarms?.cnt ?? 0,
          totalSchedules: totalSchedules?.cnt ?? 0,
          productionSites: productionSites?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-sales') {
        const [totalLeads] = await db.all(`SELECT COUNT(*) AS cnt FROM sales_leads`) as any[];
        const [wonLeads] = await db.all(`SELECT COUNT(*) AS cnt FROM sales_leads WHERE LOWER(stage) = 'won'`) as any[];
        const [totalContractValue] = await db.all(`SELECT COALESCE(SUM(value), 0) AS total FROM sales_leads WHERE LOWER(stage) = 'won'`) as any[];
        const winRate = totalLeads?.cnt > 0 ? Math.round((wonLeads?.cnt / totalLeads?.cnt) * 100 * 10) / 10 : 0;
        kpis = {
          totalLeads: totalLeads?.cnt ?? 0,
          wonLeads: wonLeads?.cnt ?? 0,
          winRate,
          totalContractValue: totalContractValue?.total ?? 0,
        };
      } else if (departmentId === 'dept-fin') {
        const [totalAp] = await db.all(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt FROM finance_ap WHERE status = 'pending'`) as any[];
        const [totalAr] = await db.all(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt FROM finance_ar WHERE status = 'pending'`) as any[];
        kpis = {
          pendingApAmount: totalAp?.total ?? 0,
          pendingApCount: totalAp?.cnt ?? 0,
          pendingArAmount: totalAr?.total ?? 0,
          pendingArCount: totalAr?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-hr') {
        const [totalEmployees] = await db.all(`SELECT COUNT(*) AS cnt FROM hr_employees`) as any[];
        const [openPositions] = await db.all(`SELECT COUNT(*) AS cnt FROM hr_recruitment WHERE status IN ('open', 'Screening')`) as any[];
        const [pendingLeaves] = await db.all(`SELECT COUNT(*) AS cnt FROM hr_leaves WHERE status = 'pending'`) as any[];
        kpis = {
          totalEmployees: totalEmployees?.cnt ?? 0,
          openPositions: openPositions?.cnt ?? 0,
          pendingLeaves: pendingLeaves?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-it') {
        const [openTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM it_tickets WHERE status = 'open'`) as any[];
        const [totalAssets] = await db.all(`SELECT COUNT(*) AS cnt FROM it_assets`) as any[];
        const [systemsDown] = await db.all(`SELECT COUNT(*) AS cnt FROM it_systems WHERE status = 'down'`) as any[];
        kpis = {
          openTickets: openTickets?.cnt ?? 0,
          totalAssets: totalAssets?.cnt ?? 0,
          systemsDown: systemsDown?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-legal') {
        const [pendingApprovals] = await db.all(`SELECT COUNT(*) AS cnt FROM legal_approvals`) as any[];
        const [totalContracts] = await db.all(`SELECT COUNT(*) AS cnt FROM legal_contracts`) as any[];
        kpis = {
          pendingApprovals: pendingApprovals?.cnt ?? 0,
          totalContracts: totalContracts?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-mkt') {
        const [activeCampaigns] = await db.all(`SELECT COUNT(*) AS cnt FROM marketing_campaigns WHERE status <> 'Đã Phát Hành'`) as any[];
        const [totalLeads] = await db.all(`SELECT COUNT(*) AS cnt FROM marketing_leads`) as any[];
        kpis = {
          activeCampaigns: activeCampaigns?.cnt ?? 0,
          totalLeads: totalLeads?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-proc') {
        const [pendingPrs] = await db.all(`SELECT COUNT(*) AS cnt FROM procurement_prs WHERE status = 'pending'`) as any[];
        const [pendingPos] = await db.all(`SELECT COUNT(*) AS cnt FROM procurement_pos WHERE status IN ('open', 'pending')`) as any[];
        kpis = {
          pendingPrs: pendingPrs?.cnt ?? 0,
          pendingPos: pendingPos?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-wh') {
        const [totalItems] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inventory`) as any[];
        const [inboundToday] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inbound WHERE DATE(createdAt) = CURDATE()`) as any[];
        const [outboundToday] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_outbound WHERE DATE(createdAt) = CURDATE()`) as any[];
        kpis = {
          totalItems: totalItems?.cnt ?? 0,
          inboundToday: inboundToday?.cnt ?? 0,
          outboundToday: outboundToday?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-exec') {
        const [totalContracts] = await db.all(`SELECT COALESCE(SUM(postTaxValue), 0) AS totalVal, COUNT(*) AS cnt FROM contracts`) as any[];
        const [totalProjects] = await db.all(`SELECT COUNT(*) AS cnt FROM projects`) as any[];
        const [pendingApprovals] = await db.all(`SELECT COUNT(*) AS cnt FROM approvals WHERE status = 'pending'`) as any[];
        const [okrsCompleted] = await db.all(`SELECT COUNT(*) AS cnt FROM company_okrs WHERE status = 'completed'`) as any[];
        kpis = {
          totalContractValue: totalContracts?.totalVal ?? 0,
          totalContracts: totalContracts?.cnt ?? 0,
          totalProjects: totalProjects?.cnt ?? 0,
          pendingApprovals: pendingApprovals?.cnt ?? 0,
          okrsCompleted: okrsCompleted?.cnt ?? 0,
        };
      }

        res.json(kpis);
      } catch (error: any) {
        console.error(`[GET /department-workspace/${departmentId}/kpis] Error:`, error);
        res.status(500).json({ error: error.message });
      }
    });

  // POST /api/department-workspace/automation/convert-lead-to-project
  // Luồng tự động: Sales Lead (Won) -> Tạo Projects + Yêu cầu Kỹ thuật SLD + Giao việc EPC
  router.post('/automation/convert-lead-to-project', requireAdmin, async (req, res) => {
    try {
      const { leadId, projectName, capacity, value, client, notes } = req.body;
      const now = new Date().toISOString();
      const projectId = `prj-${randomUUID().slice(0, 8)}`;
      const engRequestId = `eng-${randomUUID().slice(0, 8)}`;

      // Fetch dynamic lead record from MySQL
      let lead: any = null;
      if (leadId) {
        lead = await db.get('SELECT * FROM sales_leads WHERE id = ?', [leadId]);
      }

      const finalClient = client || (lead ? lead.name : '');
      const finalProjectName = projectName || (finalClient ? `Dự án Điện Mặt Trời ${finalClient}` : 'Dự án Điện Mặt Trời');
      const finalCapacity = capacity || (lead ? lead.capacity : '');
      const finalValue = value !== undefined ? Number(value) : (lead ? Number(lead.value) : 0);
      const finalNotes = notes || (lead ? `Cơ hội bán hàng: ${lead.name} (${lead.contact || ''})` : '');

      // Idempotency: lead đã chốt và đã có dự án thì trả về bản cũ, không tạo trùng.
      if (leadId) {
        const existingProject = await db.get('SELECT * FROM projects WHERE leadId = ?', [leadId]);
        if (existingProject) {
          return res.json({
            success: true,
            projectId: existingProject.id,
            engRequestId: null,
            message: 'Dự án đã tồn tại từ lead này (chống tạo trùng)',
          });
        }
      }

      // 1. Tạo Dự án EPC mới trong projects (lưu leadId để truy vết chuỗi)
      await db.run(
        `INSERT INTO projects (id, name, client, capacity, value, status, stage, startDate, description, progress, leadId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'planning', 'survey', ?, ?, 0, ?, ?, ?)`,
        [
          projectId,
          finalProjectName,
          finalClient,
          finalCapacity,
          finalValue,
          now.split('T')[0],
          finalNotes,
          leadId || null,
          now,
          now,
        ]
      );

      // 2. Tạo yêu cầu khảo sát & thiết kế kỹ thuật (đúng vocab frontend: pending/HIGH)
      await db.run(
        `INSERT INTO engineering_requests (id, type, project, date, status, priority, createdAt)
         VALUES (?, 'Khảo Sát Mái', ?, ?, 'pending', 'HIGH', ?)`,
        [
          engRequestId,
          finalProjectName,
          now.split('T')[0],
          now,
        ]
      );

      // 3. Cập nhật trạng thái lead sang 'won' (lowercase — khớp kanban Sales)
      if (leadId) {
        await db.run(
          `UPDATE sales_leads SET stage = 'won' WHERE id = ?`,
          [leadId]
        );
      }

      // 4. Bắn thông báo realtime đến trưởng phòng Kỹ Thuật và Ban Chỉ Huy EPC
      const allUsers = await db.all('SELECT id, role, department FROM users');
      const notifyUsers = (allUsers || []).filter((u: any) => {
        const role = (u.role || '').toLowerCase();
        if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
        const dept = (u.department || '').toLowerCase();
        return ['tech', 'eng', 'kỹ thuật', 'epc', 'thi công', 'exec', 'giám đốc'].some(kw => dept.includes(kw));
      });

      for (const u of notifyUsers) {
        await sendNotification(
          db,
          u.id,
          'project_created',
          `⚡ Dự Án Mới Chuyển Tiếp Từ Kinh Doanh`,
          `Dự án "${finalProjectName}" (${finalCapacity}) đã được chốt và tự động tạo yêu cầu thiết kế kỹ thuật.`,
          projectId
        );
      }

      res.json({
        success: true,
        projectId,
        engRequestId,
        message: 'Chuyển tiếp thành công: Đã tạo Dự án và Yêu cầu Kỹ thuật',
      });
    } catch (error: any) {
      console.error('[POST /automation/convert-lead-to-project] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/department-workspace/automation/design-to-pr
  // Luồng tự động: Hồ sơ Kỹ thuật (BOM) -> Phiếu Đề xuất Mua hàng (PR)
  router.post('/automation/design-to-pr', requireAdmin, async (req, res) => {
    try {
      const { designId, projectName, items, priority } = req.body;
      const now = new Date().toISOString();
      const prId = `pr-${randomUUID().slice(0, 8)}`;

      let design: any = null;
      if (designId) {
        design = await db.get('SELECT * FROM engineering_designs WHERE id = ?', [designId]);
      }

      const finalProject = projectName || (design ? design.name : 'Dự án');
      const finalItems = items || (design ? `Vật tư bóc tách thiết kế ${design.name} (${design.capacity || ''})` : 'Vật tư thi công');
      const finalPriority = priority || 'HIGH';

      // Idempotency: design đã có PR thì trả về bản cũ.
      if (designId) {
        const existingPr = await db.get('SELECT * FROM procurement_prs WHERE designId = ?', [designId]);
        if (existingPr) {
          return res.json({ success: true, prId: existingPr.id, message: 'PR đã tồn tại từ hồ sơ này (chống tạo trùng)' });
        }
      }

      await db.run(
        `INSERT INTO procurement_prs (id, project, items, date, status, priority, designId, createdAt)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          prId,
          finalProject,
          finalItems,
          now.split('T')[0],
          finalPriority,
          designId || null,
          now,
        ]
      );

      // Bắn thông báo cho phòng Mua Hàng & SCM
      const allUsers = await db.all('SELECT id, role, department FROM users');
      const procurementUsers = (allUsers || []).filter((u: any) => {
        const role = (u.role || '').toLowerCase();
        if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
        const dept = (u.department || '').toLowerCase();
        return ['procurement', 'scm', 'mua hàng', 'vật tư', 'kho', 'warehouse'].some(kw => dept.includes(kw));
      });

      for (const u of procurementUsers) {
        await sendNotification(
          db,
          u.id,
          'pr_created',
          `📦 Phiếu Mua Hàng (PR) Mới Từ Phòng Kỹ Thuật`,
          `Yêu cầu vật tư cho dự án "${finalProject}" đã được gửi sang phòng Mua hàng.`,
          prId
        );
      }

      res.json({ success: true, prId, message: 'Đã sinh phiếu đề xuất mua sắm PR thành công' });
    } catch (error: any) {
      console.error('[POST /automation/design-to-pr] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/department-workspace/automation/milestone-to-ar
  // Luồng tự động: Nghiệm thu Mốc Thi Công -> Sinh Công nợ Phải Thu (AR) gửi Kế toán
  router.post('/automation/milestone-to-ar', requireAdmin, async (req, res) => {
    try {
      const { milestoneId, projectId, projectName, milestoneTitle, amount, customer, dueDate } = req.body;
      const now = new Date().toISOString();
      const arId = `ar-${randomUUID().slice(0, 8)}`;

      let milestone: any = null;
      if (milestoneId) {
        milestone = await db.get('SELECT * FROM project_milestones WHERE id = ?', [milestoneId]);
      }

      // Idempotency: mốc đã có AR thì trả về bản cũ.
      if (milestoneId) {
        const existingAr = await db.get('SELECT * FROM finance_ar WHERE milestoneId = ?', [milestoneId]);
        if (existingAr) {
          return res.json({ success: true, arId: existingAr.id, message: 'AR đã tồn tại từ mốc này (chống tạo trùng)' });
        }
      }

      const finalProject = projectName || (milestone ? milestone.projectName : 'Dự án');
      const finalTitle = milestoneTitle || (milestone ? milestone.title : 'Nghiệm thu');
      // amount lưu SỐ (cột VARCHAR nhưng SUM() cần số; lớp hiển thị format VNĐ).
      const finalAmount = Number(amount !== undefined ? amount : (milestone ? milestone.amount : 0)) || 0;
      const finalCustomer = customer || (milestone ? milestone.customer : 'Chủ đầu tư');
      const finalDueDate = dueDate || now.split('T')[0];

      await db.run(
        `INSERT INTO finance_ar (id, project, desc_text, amount, customer, dueDate, status, milestoneId, projectId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          arId,
          finalProject,
          `Thu hồi công nợ mốc: ${finalTitle}`,
          finalAmount,
          finalCustomer,
          finalDueDate,
          milestoneId || null,
          projectId || (milestone ? milestone.projectId : null),
          now,
        ]
      );

      // Bắn thông báo cho phòng Kế toán
      const allUsers = await db.all('SELECT id, role, department FROM users');
      const financeUsers = (allUsers || []).filter((u: any) => {
        const role = (u.role || '').toLowerCase();
        if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
        const dept = (u.department || '').toLowerCase();
        return ['fin', 'kế toán', 'tài chính'].some(kw => dept.includes(kw));
      });

      for (const u of financeUsers) {
        await sendNotification(
          db,
          u.id,
          'ar_created',
          `💰 Phát Sinh Khoản Thu Công Nợ (AR)`,
          `Mốc nghiệm thu "${finalTitle}" của dự án "${finalProject}" (${finalAmount.toLocaleString('vi-VN')} đ) đã chuyển sang Kế toán để xuất hóa đơn.`,
          arId
        );
      }

      res.json({ success: true, arId, message: 'Đã tạo khoản phải thu AR thành công' });
    } catch (error: any) {
      console.error('[POST /automation/milestone-to-ar] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Phase 1+2: notify dùng chung cho các mắt nối chuỗi (Admin/Director luôn nhận + lọc theo từ khóa phòng ban).
  async function notifyChain(
    opts: { deptKeywords?: string[]; type: string; title: string; message: string; relatedId?: string }
  ) {
    const allUsers = await db.all('SELECT id, role, department FROM users');
    const targets = (allUsers || []).filter((u: any) => {
      const role = String(u.role || '').toLowerCase();
      if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
      const dept = String(u.department || '').toLowerCase();
      return (opts.deptKeywords || []).some((kw) => dept.includes(kw));
    });
    for (const u of targets) {
      await sendNotification(db, u.id, opts.type, opts.title, opts.message, opts.relatedId);
    }
  }

  // POST /api/department-workspace/automation/pr-to-po
  // Luồng: PR đã duyệt -> sinh PO nháp giữ prId (Mua hàng bổ sung NCC/giá sau).
  router.post('/automation/pr-to-po', requireAdmin, async (req, res) => {
    try {
      const { prId } = req.body;
      if (!prId) return res.status(400).json({ error: 'Thiếu prId' });
      const pr: any = await db.get('SELECT * FROM procurement_prs WHERE id = ?', [prId]);
      if (!pr) return res.status(404).json({ error: 'Không tìm thấy PR' });
      const existing: any = await db.get('SELECT * FROM procurement_pos WHERE prId = ?', [prId]);
      if (existing) {
        return res.json({ success: true, poId: existing.id, message: 'PO đã tồn tại từ PR này (chống tạo trùng)' });
      }
      const now = new Date().toISOString();
      const poId = `po-${randomUUID().slice(0, 8)}`;
      await db.run(
        `INSERT INTO procurement_pos (id, supplier, value, items, stage, progress, eta, status, prId, createdAt)
         VALUES (?, '', 0, ?, 'Nháp từ PR', 0, '', 'open', ?, ?)`,
        [poId, pr.items, prId, now]
      );
      await notifyChain({
        deptKeywords: ['procurement', 'scm', 'mua hàng', 'vật tư'],
        type: 'po_draft_created',
        title: '📝 PO nháp mới từ PR đã duyệt',
        message: `PR cho "${pr.project}" đã được chuyển thành PO nháp. Vui lòng bổ sung NCC và giá trị.`,
        relatedId: poId,
      });
      res.json({ success: true, poId, message: 'Đã sinh PO nháp từ PR' });
    } catch (error: any) {
      console.error('[POST /automation/pr-to-po] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/department-workspace/automation/po-to-inbound
  // Luồng: PO -> báo nhập kho chờ (Warehouse chuẩn bị tiếp nhận).
  router.post('/automation/po-to-inbound', requireAdmin, async (req, res) => {
    try {
      const { poId } = req.body;
      if (!poId) return res.status(400).json({ error: 'Thiếu poId' });
      const po: any = await db.get('SELECT * FROM procurement_pos WHERE id = ?', [poId]);
      if (!po) return res.status(404).json({ error: 'Không tìm thấy PO' });
      const existing: any = await db.get('SELECT * FROM warehouse_inbound WHERE poId = ?', [poId]);
      if (existing) {
        return res.json({ success: true, inboundId: existing.id, message: 'Phiếu nhập đã tồn tại từ PO này (chống tạo trùng)' });
      }
      const now = new Date().toISOString();
      const inboundId = `inb-${randomUUID().slice(0, 8)}`;
      await db.run(
        `INSERT INTO warehouse_inbound (id, source, items, date, status, poId, createdAt)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [inboundId, po.supplier || 'Nhà cung cấp', po.items, now.split('T')[0], poId, now]
      );
      await notifyChain({
        deptKeywords: ['kho', 'warehouse', 'logistics'],
        type: 'inbound_expected',
        title: '📦 Hàng sắp về kho',
        message: `PO từ "${po.supplier || 'NCC'}" đã được báo nhập kho chờ. Chuẩn bị tiếp nhận.`,
        relatedId: inboundId,
      });
      res.json({ success: true, inboundId, message: 'Đã báo nhập kho chờ từ PO' });
    } catch (error: any) {
      console.error('[POST /automation/po-to-inbound] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/department-workspace/automation/cod-to-om
  // Luồng: Đóng điện COD -> bàn giao vận hành O&M + chuyển trạng thái dự án sang warranty.
  router.post('/automation/cod-to-om', requireAdmin, async (req, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) return res.status(400).json({ error: 'Thiếu projectId' });
      const project: any = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
      if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
      const existing: any = await db.get(
        `SELECT * FROM om_schedules WHERE site = ? AND task LIKE '%Bàn giao%' ORDER BY createdAt DESC`,
        [project.name]
      );
      if (existing) {
        return res.json({ success: true, scheduleId: existing.id, message: 'Đã bàn giao O&M trước đó (chống tạo trùng)' });
      }
      const now = new Date().toISOString();
      const scheduleId = `om-${randomUUID().slice(0, 8)}`;
      await db.run(
        `INSERT INTO om_schedules (id, site, task, date, team, status, createdAt)
         VALUES (?, ?, 'Tiếp nhận vận hành sau Bàn giao COD', ?, '', 'scheduled', ?)`,
        [scheduleId, project.name, now.split('T')[0], now]
      );
      await db.run(`UPDATE projects SET status = 'warranty', updatedAt = ? WHERE id = ?`, [now, projectId]);
      await notifyChain({
        deptKeywords: ['o&m', 'o m', 'om', 'bảo hành', 'vận hành', 'cs', 'chăm sóc'],
        type: 'om_handover',
        title: '🔧 Bàn giao vận hành O&M',
        message: `Dự án "${project.name}" đã đóng điện COD và được bàn giao sang O&M theo dõi.`,
        relatedId: scheduleId,
      });
      res.json({ success: true, scheduleId, message: 'Đã bàn giao dự án sang O&M' });
    } catch (error: any) {
      console.error('[POST /automation/cod-to-om] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ngưỡng giá trị cao cần duyệt cấp Giám đốc + Pháp chế (dùng chung PO/AP).
  const HIGH_VALUE_THRESHOLD = 2000000000;

  // POST /api/department-workspace/automation/request-approval
  // Luồng: chứng từ giá trị cao -> tự sinh tờ trình trung tâm gửi Giám đốc + Pháp chế.
  router.post('/automation/request-approval', requireAdmin, async (req, res) => {
    try {
      const { entityType, entityId, title, amount, requestedBy, departmentId, reason } = req.body;
      if (!entityType || !entityId || !String(title || '').trim()) {
        return res.status(400).json({ error: 'Thiếu entityType/entityId/title' });
      }
      const now = new Date().toISOString();
      const allUsers = await db.all('SELECT id, role, department FROM users');
      const approvers = (allUsers || []).filter((u: any) => {
        const role = String(u.role || '').toLowerCase();
        if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
        const dept = String(u.department || '').toLowerCase();
        return ['pháp chế', 'legal'].some((kw) => dept.includes(kw));
      });
      if (approvers.length === 0) {
        return res.status(400).json({ error: 'Chưa cấu hình người phê duyệt (Giám đốc/Pháp chế)' });
      }
      const approvalId = `apr-${randomUUID().slice(0, 8)}`;
      const approvalCode = `APR-${Date.now().toString().slice(-6)}`;
      const approverId = approvers[0].id;
      await db.run(
        `INSERT INTO approvals (id, approvalCode, entityType, entityId, title, amount, requestedBy, departmentId, approverId, status, comment, requestedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          approvalId,
          approvalCode,
          entityType,
          entityId,
          String(title).trim(),
          Number(amount) || 0,
          requestedBy || 'system',
          departmentId || null,
          approverId,
          reason || `Chứng từ vượt ngưỡng ${HIGH_VALUE_THRESHOLD.toLocaleString('vi-VN')} đ`,
          now,
        ]
      );
      for (const approver of approvers) {
        await sendNotification(
          db,
          approver.id,
          'approval_needed',
          '🛡️ Chứng từ giá trị cao cần phê duyệt',
          `${title} — vui lòng xem xét trong trung tâm phê duyệt.`,
          approvalId
        );
      }
      res.json({ success: true, approvalId, approvalCode, threshold: HIGH_VALUE_THRESHOLD });
    } catch (error: any) {
      console.error('[POST /automation/request-approval] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
