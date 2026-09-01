import express from 'express';
import { randomUUID } from 'crypto';
import type { MysqlDb } from '../db_mysql.js';

export function departmentWorkspaceRoutes(db: MysqlDb) {
  const router = express.Router();

  // Route: GET /api/department-workspace/:departmentId/records
  router.get('/:departmentId/records', async (req, res) => {
    const { departmentId } = req.params;
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
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          records = await db.all('SELECT * FROM executive_metrics ORDER BY createdAt ASC');
        } else if (type === 'okrs') {
          records = await db.all('SELECT * FROM company_okrs ORDER BY createdAt ASC');
        } else if (type === 'meetings') {
          records = await db.all('SELECT * FROM executive_meetings ORDER BY createdAt ASC');
        }
      } else if (departmentId === 'dept-finance') {
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
      } else if (departmentId === 'dept-marketing') {
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
        }
      } else if (departmentId === 'dept-procurement') {
        if (type === 'prs') {
          records = await db.all('SELECT * FROM procurement_prs ORDER BY createdAt DESC');
        } else if (type === 'pos') {
          records = await db.all('SELECT * FROM procurement_pos ORDER BY createdAt DESC');
        }
      } else if (departmentId === 'dept-warehouse') {
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
  router.post('/:departmentId/records', async (req, res) => {
    const { departmentId } = req.params;
    const { type, data } = req.body;
    const now = new Date().toISOString();
    const id = randomUUID();

    try {
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          const { customer, channel, title, status, time, agent, avatar } = data;
          await db.run(
            'INSERT INTO customer_tickets (id, customer, channel, title, status, time, agent, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customer, channel, title, status, time, agent, avatar, now]
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
      } else if (departmentId === 'dept-finance') {
        if (type === 'ap') {
          const { dept, desc_text, amount, vendor, date, status } = data;
          await db.run(
            'INSERT INTO finance_ap (id, dept, desc_text, amount, vendor, date, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, dept, desc_text, amount, vendor, date, status, now]
          );
        } else if (type === 'ar') {
          const { project, desc_text, amount, customer, dueDate, status } = data;
          await db.run(
            'INSERT INTO finance_ar (id, project, desc_text, amount, customer, dueDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, project, desc_text, amount, customer, dueDate, status, now]
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
      } else if (departmentId === 'dept-marketing') {
        if (type === 'campaigns') {
          const { title, channels, status } = data;
          await db.run(
            'INSERT INTO marketing_campaigns (id, title, channels, status, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, title, channels, status, now]
          );
        } else if (type === 'leads') {
          const { source, percentage } = data;
          await db.run(
            'INSERT INTO marketing_leads (id, source, percentage, createdAt) VALUES (?, ?, ?, ?)',
            [id, source, percentage, now]
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
        }
      } else if (departmentId === 'dept-procurement') {
        if (type === 'prs') {
          const { project, items, date, status, priority } = data;
          await db.run(
            'INSERT INTO procurement_prs (id, project, items, date, status, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, project, items, date, status, priority, now]
          );
        } else if (type === 'pos') {
          const { supplier, value, items, stage, progress, eta, status } = data;
          await db.run(
            'INSERT INTO procurement_pos (id, supplier, value, items, stage, progress, eta, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, supplier, value, items, stage, progress, eta, status, now]
          );
        }
      } else if (departmentId === 'dept-warehouse') {
        if (type === 'inventory') {
          const { sku, name, category, stock, minStock, unit, image } = data;
          await db.run(
            'INSERT INTO warehouse_inventory (id, sku, name, category, stock, minStock, unit, image, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, name, category, stock, minStock, unit, image, now]
          );
        } else if (type === 'inbound') {
          const { source, items, date, status } = data;
          await db.run(
            'INSERT INTO warehouse_inbound (id, source, items, date, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, source, items, date, status, now]
          );
        } else if (type === 'outbound') {
          const { project, items, date, status, requestedBy } = data;
          await db.run(
            'INSERT INTO warehouse_outbound (id, project, items, date, status, requestedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, project, items, date, status, requestedBy, now]
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
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          const { type: reqType, project, date, status, priority } = data;
          await db.run(
            'INSERT INTO engineering_requests (id, type, project, date, status, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, reqType, project, date, status, priority, now]
          );
        } else if (type === 'design') {
          const { name, capacity, stage, progress, tasks, status } = data;
          await db.run(
            'INSERT INTO engineering_designs (id, name, capacity, stage, progress, tasks, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, capacity, stage, progress, JSON.stringify(tasks || []), status, now]
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
  router.put('/:departmentId/records/:id', async (req, res) => {
    const { departmentId, id } = req.params;
    const { type, data } = req.body;
    const now = new Date().toISOString();

    try {
      if (departmentId === 'dept-cs') {
        if (type === 'tickets') {
          const { customer, channel, title, status, time, agent, avatar } = data;
          await db.run(
            'UPDATE customer_tickets SET customer = ?, channel = ?, title = ?, status = ?, time = ?, agent = ?, avatar = ?, updatedAt = ? WHERE id = ?',
            [customer, channel, title, status, time, agent, avatar, now, id]
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
      } else if (departmentId === 'dept-finance') {
        if (type === 'ap') {
          const { dept, desc_text, amount, vendor, date, status } = data;
          await db.run(
            'UPDATE finance_ap SET dept = ?, desc_text = ?, amount = ?, vendor = ?, date = ?, status = ?, updatedAt = ? WHERE id = ?',
            [dept, desc_text, amount, vendor, date, status, now, id]
          );
        } else if (type === 'ar') {
          const { project, desc_text, amount, customer, dueDate, status } = data;
          await db.run(
            'UPDATE finance_ar SET project = ?, desc_text = ?, amount = ?, customer = ?, dueDate = ?, status = ?, updatedAt = ? WHERE id = ?',
            [project, desc_text, amount, customer, dueDate, status, now, id]
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
      } else if (departmentId === 'dept-marketing') {
        if (type === 'campaigns') {
          const { title, channels, status } = data;
          await db.run(
            'UPDATE marketing_campaigns SET title = ?, channels = ?, status = ?, updatedAt = ? WHERE id = ?',
            [title, channels, status, now, id]
          );
        } else if (type === 'leads') {
          const { source, percentage } = data;
          await db.run(
            'UPDATE marketing_leads SET source = ?, percentage = ?, updatedAt = ? WHERE id = ?',
            [source, percentage, now, id]
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
        }
      } else if (departmentId === 'dept-procurement') {
        if (type === 'prs') {
          const { project, items, date, status, priority } = data;
          await db.run(
            'UPDATE procurement_prs SET project = ?, items = ?, date = ?, status = ?, priority = ?, updatedAt = ? WHERE id = ?',
            [project, items, date, status, priority, now, id]
          );
        } else if (type === 'pos') {
          const { supplier, value, items, stage, progress, eta, status } = data;
          await db.run(
            'UPDATE procurement_pos SET supplier = ?, value = ?, items = ?, stage = ?, progress = ?, eta = ?, status = ?, updatedAt = ? WHERE id = ?',
            [supplier, value, items, stage, progress, eta, status, now, id]
          );
        }
      } else if (departmentId === 'dept-warehouse') {
        if (type === 'inventory') {
          const { sku, name, category, stock, minStock, unit, image } = data;
          await db.run(
            'UPDATE warehouse_inventory SET sku = ?, name = ?, category = ?, stock = ?, minStock = ?, unit = ?, image = ?, updatedAt = ? WHERE id = ?',
            [sku, name, category, stock, minStock, unit, image, now, id]
          );
        } else if (type === 'inbound') {
          const { source, items, date, status } = data;
          await db.run(
            'UPDATE warehouse_inbound SET source = ?, items = ?, date = ?, status = ?, updatedAt = ? WHERE id = ?',
            [source, items, date, status, now, id]
          );
        } else if (type === 'outbound') {
          const { project, items, date, status, requestedBy } = data;
          await db.run(
            'UPDATE warehouse_outbound SET project = ?, items = ?, date = ?, status = ?, requestedBy = ?, updatedAt = ? WHERE id = ?',
            [project, items, date, status, requestedBy, now, id]
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
        }
      } else if (departmentId === 'dept-eng') {
        if (type === 'requests') {
          const { type: reqType, project, date, status, priority } = data;
          await db.run(
            'UPDATE engineering_requests SET type = ?, project = ?, date = ?, status = ?, priority = ?, updatedAt = ? WHERE id = ?',
            [reqType, project, date, status, priority, now, id]
          );
        } else if (type === 'design') {
          const { name, capacity, stage, progress, tasks, status } = data;
          await db.run(
            'UPDATE engineering_designs SET name = ?, capacity = ?, stage = ?, progress = ?, tasks = ?, status = ?, updatedAt = ? WHERE id = ?',
            [name, capacity, stage, progress, JSON.stringify(tasks || []), status, now, id]
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
  router.delete('/:departmentId/records/:id', async (req, res) => {
    const { departmentId, id } = req.params;
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
        }
      } else if (departmentId === 'dept-exec') {
        if (type === 'metrics') {
          await db.run('DELETE FROM executive_metrics WHERE id = ?', [id]);
        } else if (type === 'okrs') {
          await db.run('DELETE FROM company_okrs WHERE id = ?', [id]);
        } else if (type === 'meetings') {
          await db.run('DELETE FROM executive_meetings WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-finance') {
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
      } else if (departmentId === 'dept-marketing') {
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
        }
      } else if (departmentId === 'dept-procurement') {
        if (type === 'prs') {
          await db.run('DELETE FROM procurement_prs WHERE id = ?', [id]);
        } else if (type === 'pos') {
          await db.run('DELETE FROM procurement_pos WHERE id = ?', [id]);
        }
      } else if (departmentId === 'dept-warehouse') {
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
  router.get('/:departmentId/kpis', async (req, res) => {
    const { departmentId } = req.params;
    try {
      let kpis: Record<string, any> = {};

      if (departmentId === 'dept-cs') {
        const [totalTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets`) as any[];
        const [pendingTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets WHERE status = 'Pending'`) as any[];
        const [inProgressTickets] = await db.all(`SELECT COUNT(*) AS cnt FROM customer_tickets WHERE status = 'In Progress'`) as any[];
        const [totalRenewals] = await db.all(`SELECT COUNT(*) AS cnt FROM contract_renewals`) as any[];
        kpis = {
          totalTickets: totalTickets?.cnt ?? 0,
          pendingTickets: pendingTickets?.cnt ?? 0,
          inProgressTickets: inProgressTickets?.cnt ?? 0,
          totalRenewals: totalRenewals?.cnt ?? 0,
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
        const [activeProjects] = await db.all(`SELECT COUNT(DISTINCT project) AS cnt FROM epc_subcontractors WHERE status = 'active'`) as any[];
        const [totalWorkers] = await db.all(`SELECT COUNT(*) AS cnt FROM epc_subcontractors WHERE status = 'active'`) as any[];
        const [inboundCount] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inbound`) as any[];
        kpis = {
          activeProjects: activeProjects?.cnt ?? 0,
          totalWorkers: totalWorkers?.cnt ?? 0,
          inboundCount: inboundCount?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-om') {
        const [activeAlarms] = await db.all(`SELECT COUNT(*) AS cnt FROM om_alarms WHERE status = 'active'`) as any[];
        const [criticalAlarms] = await db.all(`SELECT COUNT(*) AS cnt FROM om_alarms WHERE severity = 'critical' AND status = 'active'`) as any[];
        const [totalSchedules] = await db.all(`SELECT COUNT(*) AS cnt FROM om_schedules`) as any[];
        kpis = {
          activeAlarms: activeAlarms?.cnt ?? 0,
          criticalAlarms: criticalAlarms?.cnt ?? 0,
          totalSchedules: totalSchedules?.cnt ?? 0,
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
      } else if (departmentId === 'dept-finance') {
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
        const [openPositions] = await db.all(`SELECT COUNT(*) AS cnt FROM hr_recruitment WHERE status = 'open'`) as any[];
        kpis = {
          totalEmployees: totalEmployees?.cnt ?? 0,
          openPositions: openPositions?.cnt ?? 0,
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
      } else if (departmentId === 'dept-marketing') {
        const [activeCampaigns] = await db.all(`SELECT COUNT(*) AS cnt FROM marketing_campaigns WHERE status = 'active'`) as any[];
        const [totalLeads] = await db.all(`SELECT COUNT(*) AS cnt FROM marketing_leads`) as any[];
        kpis = {
          activeCampaigns: activeCampaigns?.cnt ?? 0,
          totalLeads: totalLeads?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-procurement') {
        const [pendingPrs] = await db.all(`SELECT COUNT(*) AS cnt FROM procurement_prs WHERE status = 'pending'`) as any[];
        const [pendingPos] = await db.all(`SELECT COUNT(*) AS cnt FROM procurement_pos WHERE status = 'pending'`) as any[];
        kpis = {
          pendingPrs: pendingPrs?.cnt ?? 0,
          pendingPos: pendingPos?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-warehouse') {
        const [totalItems] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inventory`) as any[];
        const [inboundToday] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_inbound WHERE DATE(createdAt) = CURDATE()`) as any[];
        const [outboundToday] = await db.all(`SELECT COUNT(*) AS cnt FROM warehouse_outbound WHERE DATE(createdAt) = CURDATE()`) as any[];
        kpis = {
          totalItems: totalItems?.cnt ?? 0,
          inboundToday: inboundToday?.cnt ?? 0,
          outboundToday: outboundToday?.cnt ?? 0,
        };
      } else if (departmentId === 'dept-exec') {
        const [totalContracts] = await db.all(`SELECT COALESCE(SUM(value), 0) AS totalVal, COUNT(*) AS cnt FROM contracts`) as any[];
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
  router.post('/automation/convert-lead-to-project', async (req, res) => {
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

      // 1. Tạo Dự án EPC mới trong projects
      await db.run(
        `INSERT INTO projects (id, name, client, capacity, value, status, stage, startDate, description, progress, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'planning', 'survey', ?, ?, 0, ?, ?)`,
        [
          projectId,
          finalProjectName,
          finalClient,
          finalCapacity,
          finalValue,
          now.split('T')[0],
          finalNotes,
          now,
          now,
        ]
      );

      // 2. Tạo yêu cầu khảo sát & thiết kế kỹ thuật trong engineering_requests
      await db.run(
        `INSERT INTO engineering_requests (id, type, project, date, status, priority, createdAt)
         VALUES (?, 'Khảo sát hiện trường & Sơ đồ 1 sợi SLD', ?, ?, 'Chờ khảo sát', 'Gấp', ?)`,
        [
          engRequestId,
          finalProjectName,
          now.split('T')[0],
          now,
        ]
      );

      // 3. Cập nhật trạng thái lead trong sales_leads sang 'Won'
      if (leadId) {
        await db.run(
          `UPDATE sales_leads SET stage = 'Won' WHERE id = ?`,
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
  router.post('/automation/design-to-pr', async (req, res) => {
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
      const finalPriority = priority || 'Cao';

      await db.run(
        `INSERT INTO procurement_prs (id, project, items, date, status, priority, createdAt)
         VALUES (?, ?, ?, ?, 'Chờ duyệt PO', ?, ?)`,
        [
          prId,
          finalProject,
          finalItems,
          now.split('T')[0],
          finalPriority,
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
  router.post('/automation/milestone-to-ar', async (req, res) => {
    try {
      const { milestoneId, projectName, milestoneTitle, amount, customer, dueDate } = req.body;
      const now = new Date().toISOString();
      const arId = `ar-${randomUUID().slice(0, 8)}`;

      let milestone: any = null;
      if (milestoneId) {
        milestone = await db.get('SELECT * FROM project_milestones WHERE id = ?', [milestoneId]);
      }

      const finalProject = projectName || (milestone ? milestone.projectName : 'Dự án');
      const finalTitle = milestoneTitle || (milestone ? milestone.title : 'Nghiệm thu');
      const finalAmount = amount !== undefined ? amount : (milestone ? milestone.amount : 0);
      const finalCustomer = customer || (milestone ? milestone.customer : 'Chủ đầu tư');
      const finalDueDate = dueDate || now.split('T')[0];

      const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
      };

      const amountStr = typeof finalAmount === 'number' ? formatVND(finalAmount) : (finalAmount || '0 đ');

      await db.run(
        `INSERT INTO finance_ar (id, project, desc_text, amount, customer, dueDate, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          arId,
          finalProject,
          `Thu hồi công nợ mốc: ${finalTitle}`,
          amountStr,
          finalCustomer,
          finalDueDate,
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
          `Mốc nghiệm thu "${finalTitle}" của dự án "${finalProject}" (${amountStr}) đã chuyển sang Kế toán để xuất hóa đơn.`,
          arId
        );
      }

      res.json({ success: true, arId, message: 'Đã tạo khoản phải thu AR thành công' });
    } catch (error: any) {
      console.error('[POST /automation/milestone-to-ar] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
