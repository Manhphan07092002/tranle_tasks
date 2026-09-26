import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const employeeToken = makeToken({
  id: 'user-1',
  name: 'Nguyen Van A',
  email: 'a@example.com',
  role: 'Admin',
  department: 'dept-sales',
  permissions: [],
});

describe('Chain link columns: new record types CRUD', () => {
  it('GET rfqs + supplier_quotes (dept-proc)', async () => {
    const db = new FakeDb();
    db.onAll((sql) =>
      sql.includes('FROM procurement_rfqs')
        ? [{ id: 'rfq-1' }]
        : sql.includes('FROM procurement_quotes')
          ? [{ id: 'q-1' }]
          : undefined
    );
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app).get('/api/department-workspace/dept-proc/records?type=rfqs').set(auth);
    expect(r1.status).toBe(200);
    expect(r1.body).toHaveLength(1);

    const r2 = await request(app).get('/api/department-workspace/dept-proc/records?type=supplier_quotes').set(auth);
    expect(r2.status).toBe(200);
    expect(r2.body).toHaveLength(1);
  });

  it('GET sites (dept-om), attendance (dept-epc), leaves (dept-hr), quotes (dept-sales)', async () => {
    const db = new FakeDb();
    db.onAll((sql) => {
      if (sql.includes('FROM om_sites')) return [{ id: 's-1' }];
      if (sql.includes('FROM epc_attendance')) return [{ id: 'a-1' }];
      if (sql.includes('FROM hr_leaves')) return [{ id: 'l-1' }];
      if (sql.includes('FROM sales_quotes')) return [{ id: 'q-1' }];
      return undefined;
    });
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    for (const [dept, type] of [
      ['dept-om', 'sites'],
      ['dept-epc', 'attendance'],
      ['dept-hr', 'leaves'],
      ['dept-sales', 'quotes'],
    ]) {
      const res = await request(app).get(`/api/department-workspace/${dept}/records?type=${type}`).set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    }
  });

  it('POST rfq + supplier quote insert dung cot', async () => {
    const db = new FakeDb();
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app)
      .post('/api/department-workspace/dept-proc/records')
      .set(auth)
      .send({ type: 'rfqs', data: { title: 'RFQ pin', items: '500x AIKO', deadline: '2026-10-01', status: 'open' } });
    expect(r1.status).toBe(201);
    expect(db.count('INSERT INTO procurement_rfqs')).toBe(1);

    const r2 = await request(app)
      .post('/api/department-workspace/dept-proc/records')
      .set(auth)
      .send({ type: 'supplier_quotes', data: { rfqId: 'rfq-1', supplier: 'AIKO', price: 100, warranty: '12y', leadTime: '30d', status: 'submitted' } });
    expect(r2.status).toBe(201);
    expect(db.count('INSERT INTO procurement_quotes')).toBe(1);
  });

  it('POST luu truong lien ket: designId/prId/poId/projectId/milestoneId/category/serials/leadCount', async () => {
    const db = new FakeDb();
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    await request(app).post('/api/department-workspace/dept-proc/records').set(auth)
      .send({ type: 'prs', data: { project: 'P', items: 'x', date: '2026-09-01', status: 'pending', priority: 'HIGH', designId: 'd-1' } });
    const prCall = db.findCall('INSERT INTO procurement_prs');
    expect(prCall?.params).toContain('d-1');

    await request(app).post('/api/department-workspace/dept-proc/records').set(auth)
      .send({ type: 'pos', data: { supplier: 'S', value: 1, items: 'x', stage: 's', progress: 0, eta: '', status: 'open', prId: 'pr-1' } });
    expect(db.findCall('INSERT INTO procurement_pos')?.params).toContain('pr-1');

    await request(app).post('/api/department-workspace/dept-wh/records').set(auth)
      .send({ type: 'inbound', data: { source: 'S', items: 'x', date: '2026-09-01', status: 'pending', poId: 'po-1' } });
    expect(db.findCall('INSERT INTO warehouse_inbound')?.params).toContain('po-1');

    await request(app).post('/api/department-workspace/dept-wh/records').set(auth)
      .send({ type: 'outbound', data: { project: 'P', items: 'x', date: '2026-09-01', status: 'shipped', requestedBy: 'A', projectId: 'prj-1' } });
    expect(db.findCall('INSERT INTO warehouse_outbound')?.params).toContain('prj-1');

    await request(app).post('/api/department-workspace/dept-fin/records').set(auth)
      .send({ type: 'ar', data: { project: 'P', desc_text: 'd', amount: 5, customer: 'C', dueDate: '2026-10-01', status: 'pending', milestoneId: 'm-1', projectId: 'prj-1' } });
    expect(db.findCall('INSERT INTO finance_ar')?.params).toContain('m-1');

    await request(app).post('/api/department-workspace/dept-cs/records').set(auth)
      .send({ type: 'tickets', data: { customer: 'C', channel: 'Hotline', title: 'T', status: 'Pending', time: '2026-09-01', agent: 'A', avatar: '' , category: 'Sự cố kỹ thuật' } });
    expect(db.findCall('INSERT INTO customer_tickets')?.params).toContain('Sự cố kỹ thuật');

    await request(app).post('/api/department-workspace/dept-wh/records').set(auth)
      .send({ type: 'inventory', data: { sku: 'S', name: 'N', category: 'C', stock: 1, minStock: 0, unit: 'Cái', image: '', serials: 'SN-1' } });
    expect(db.findCall('INSERT INTO warehouse_inventory')?.params).toContain('SN-1');

    await request(app).post('/api/department-workspace/dept-mkt/records').set(auth)
      .send({ type: 'leads', data: { source: 'Expo', percentage: '', leadCount: 120, conversion: 15 } });
    const mktCall = db.findCall('INSERT INTO marketing_leads');
    expect(mktCall?.params).toContain(120);
    expect(mktCall?.params).toContain(15);
  });
});

describe('Automation vocab P0 (khop frontend)', () => {
  it("convert-lead-to-project ghi stage 'won' + eng request pending/HIGH", async () => {
    const db = new FakeDb();
    db.onGet((sql) => (sql.includes('FROM sales_leads') ? { id: 'l-1', name: 'Lead', capacity: '500kWp', value: 100, contact: '' } : undefined));
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/automation/convert-lead-to-project')
      .set('Authorization', 'Bearer ' + employeeToken)
      .send({ leadId: 'l-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updLead = db.findCall('UPDATE sales_leads SET stage');
    expect(updLead).toBeDefined();
    expect(updLead?.sql).toContain(`stage = 'won'`);
    const engReq = db.findCall('INSERT INTO engineering_requests');
    expect(engReq?.sql).toContain(`'pending'`);
    expect(engReq?.sql).toContain(`'HIGH'`);
    expect(db.findCall('INSERT INTO projects')?.sql).toContain('leadId');
  });

  it('convert-lead-to-project idempotent khi lead da co project', async () => {
    const db = new FakeDb();
    db.onGet((sql) => {
      if (sql.includes('FROM sales_leads')) return { id: 'l-1', name: 'Lead' };
      if (sql.includes('FROM projects WHERE leadId')) return { id: 'prj-old' };
      return undefined;
    });

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/automation/convert-lead-to-project')
      .set('Authorization', 'Bearer ' + employeeToken)
      .send({ leadId: 'l-1' });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe('prj-old');
    expect(db.count('INSERT INTO projects')).toBe(0);
  });

  it("design-to-pr ghi pending/HIGH + designId", async () => {
    const db = new FakeDb();
    db.onGet((sql) => (sql.includes('FROM engineering_designs') ? { id: 'd-1', name: 'Hồ sơ', capacity: '500kWp' } : undefined));
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/automation/design-to-pr')
      .set('Authorization', 'Bearer ' + employeeToken)
      .send({ designId: 'd-1' });

    expect(res.status).toBe(200);
    const prCall = db.findCall('INSERT INTO procurement_prs');
    expect(prCall?.sql).toContain(`'pending'`);
    expect(prCall?.params).toContain('HIGH');
    expect(prCall?.params).toContain('d-1');
  });

  it('milestone-to-ar luu amount SO + status pending + idempotent', async () => {
    const db = new FakeDb();
    let arExists = false;
    db.onGet((sql) => {
      if (sql.includes('FROM project_milestones')) return { id: 'm-1', projectName: 'P', title: 'Mốc 1' };
      if (sql.includes('FROM finance_ar WHERE milestoneId')) return arExists ? { id: 'ar-old' } : undefined;
      return undefined;
    });
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app).post('/api/department-workspace/automation/milestone-to-ar').set(auth)
      .send({ milestoneId: 'm-1', projectId: 'prj-1', amount: 2500000000 });
    expect(r1.status).toBe(200);
    const arCall = db.findCall('INSERT INTO finance_ar');
    expect(arCall?.params).toContain(2500000000);
    expect(arCall?.sql).toContain(`'pending'`);
    expect(arCall?.params).toContain('m-1');

    arExists = true;
    const r2 = await request(app).post('/api/department-workspace/automation/milestone-to-ar').set(auth)
      .send({ milestoneId: 'm-1', amount: 1 });
    expect(r2.body.arId).toBe('ar-old');
    expect(db.count('INSERT INTO finance_ar')).toBe(1);
  });
});

describe('Automation mat noi Phase 1', () => {
  it('pr-to-po tao PO + idempotent', async () => {
    const db = new FakeDb();
    let poExists = false;
    db.onGet((sql) => {
      if (sql.includes('FROM procurement_prs')) return { id: 'pr-1', project: 'P', items: 'pin' };
      if (sql.includes('FROM procurement_pos WHERE prId')) return poExists ? { id: 'po-old' } : undefined;
      return undefined;
    });
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app).post('/api/department-workspace/automation/pr-to-po').set(auth).send({ prId: 'pr-1' });
    expect(r1.status).toBe(200);
    expect(r1.body.poId).toBeDefined();
    expect(db.findCall('INSERT INTO procurement_pos')?.params).toContain('pr-1');

    poExists = true;
    const r2 = await request(app).post('/api/department-workspace/automation/pr-to-po').set(auth).send({ prId: 'pr-1' });
    expect(r2.body.poId).toBe('po-old');
    expect(db.count('INSERT INTO procurement_pos')).toBe(1);
  });

  it('po-to-inbound tao phieu cho + idempotent', async () => {
    const db = new FakeDb();
    let inbExists = false;
    db.onGet((sql) => {
      if (sql.includes('FROM procurement_pos WHERE id')) return { id: 'po-1', supplier: 'AIKO', items: 'pin' };
      if (sql.includes('FROM warehouse_inbound WHERE poId')) return inbExists ? { id: 'inb-old' } : undefined;
      return undefined;
    });
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app).post('/api/department-workspace/automation/po-to-inbound').set(auth).send({ poId: 'po-1' });
    expect(r1.status).toBe(200);
    expect(db.findCall('INSERT INTO warehouse_inbound')?.params).toContain('po-1');

    inbExists = true;
    const r2 = await request(app).post('/api/department-workspace/automation/po-to-inbound').set(auth).send({ poId: 'po-1' });
    expect(r2.body.inboundId).toBe('inb-old');
    expect(db.count('INSERT INTO warehouse_inbound')).toBe(1);
  });

  it('cod-to-om tao lich + chuyen warranty + idempotent', async () => {
    const db = new FakeDb();
    let schedExists = false;
    db.onGet((sql) => {
      if (sql.includes('FROM projects WHERE id')) return { id: 'prj-1', name: 'Solar Farm' };
      if (sql.includes('FROM om_schedules WHERE site')) return schedExists ? { id: 'om-old' } : undefined;
      return undefined;
    });
    db.onAll((sql) => (sql.includes('FROM users') ? [] : undefined));
    const app = createTestApp(db);
    const auth = { Authorization: 'Bearer ' + employeeToken };

    const r1 = await request(app).post('/api/department-workspace/automation/cod-to-om').set(auth).send({ projectId: 'prj-1' });
    expect(r1.status).toBe(200);
    expect(db.count('INSERT INTO om_schedules')).toBe(1);
    const updProj = db.findCall("UPDATE projects SET status = 'warranty'");
    expect(updProj).toBeDefined();

    schedExists = true;
    const r2 = await request(app).post('/api/department-workspace/automation/cod-to-om').set(auth).send({ projectId: 'prj-1' });
    expect(r2.body.scheduleId).toBe('om-old');
    expect(db.count('INSERT INTO om_schedules')).toBe(1);
  });

  it('request-approval 400 khi thieu approver; 201 khi co director', async () => {
    const noAdmin = new FakeDb();
    noAdmin.onAll((sql) => (sql.includes('FROM users') ? [{ id: 'u1', role: 'Employee', department: 'IT' }] : undefined));
    const r400 = await request(createTestApp(noAdmin))
      .post('/api/department-workspace/automation/request-approval')
      .set('Authorization', 'Bearer ' + employeeToken)
      .send({ entityType: 'finance_ap', entityId: 'ap-1', title: 'Chi 5 tỷ' });
    expect(r400.status).toBe(400);

    const withDirector = new FakeDb();
    withDirector.onAll((sql) => (sql.includes('FROM users') ? [{ id: 'd1', role: 'Director', department: 'Ban Giám đốc' }] : undefined));
    const r201 = await request(createTestApp(withDirector))
      .post('/api/department-workspace/automation/request-approval')
      .set('Authorization', 'Bearer ' + employeeToken)
      .send({ entityType: 'finance_ap', entityId: 'ap-1', title: 'Chi 5 tỷ', amount: 5000000000 });
    expect(r201.status).toBe(200);
    expect(r201.body.approvalId).toBeDefined();
    expect(withDirector.count('INSERT INTO approvals')).toBe(1);
  });
});
