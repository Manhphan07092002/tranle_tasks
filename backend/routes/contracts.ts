import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function contractRoutes(db: any) {
  const router = Router();

  async function logActivity(userId: string, action: string, entityId: string, metadata: any) {
    const id = randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, action, entityId, 'contract', JSON.stringify(metadata), new Date().toISOString()]
    );
  }

  async function updateRevenueReportsForContract(db: any, contractId: string) {
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [contractId]);
    if (!contract) return;
    if (contract.contractType === 'input') return;

    const invoiceDateToUse = contract.invoiceDate;
    if (!invoiceDateToUse) return;

    // Parse the invoice date to find the year, month, and day
    const parts = invoiceDateToUse.split('-');
    if (parts.length < 3) return;
    const yearNum = Number(parts[0]);
    const monthNum = Number(parts[1]);
    const dayNum = Number(parts[2]);

    // Find the last day of this month
    const lastDayDate = new Date(yearNum, monthNum, 0);
    const lastDay = lastDayDate.getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');

    const monthlyStart = `${parts[0]}-${parts[1]}-01`;
    const monthlyEnd = `${parts[0]}-${parts[1]}-${lastDayStr}`;
    const monthlyTitle = `Báo cáo doanh thu tự động - Tháng ${parts[1]}/${parts[0]}`;

    // Weekly report (Monday to Sunday)
    const d = new Date(yearNum, monthNum - 1, dayNum);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(yearNum, monthNum - 1, dayNum + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // End on Sunday

    const fmt = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const fmtDisplay = (dt: Date) => {
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      return `${d}/${m}/${y}`;
    };

    const weeklyStart = fmt(monday);
    const weeklyEnd = fmt(sunday);
    const weeklyTitle = `Báo cáo doanh thu tự động - Tuần từ ${fmtDisplay(monday)} đến ${fmtDisplay(sunday)}`;

    const reportConfigs = [
      {
        reportType: 'weekly' as const,
        periodStart: weeklyStart,
        periodEnd: weeklyEnd,
        title: weeklyTitle
      },
      {
        reportType: 'monthly' as const,
        periodStart: monthlyStart,
        periodEnd: monthlyEnd,
        title: monthlyTitle
      }
    ];

    for (const config of reportConfigs) {
      // Check if an automatic monthly/weekly revenue report already exists for this period
      const existingAutoReport = await db.get(
        `SELECT id FROM revenue_reports 
         WHERE (isDeleted IS NULL OR isDeleted = 0) 
           AND department = ? 
           AND periodStart = ? 
           AND periodEnd = ? 
           AND reportType = ?
           AND generationMode = 'automatic'`,
        [contract.department, config.periodStart, config.periodEnd, config.reportType]
      );

      if (!existingAutoReport) {
        // Create new automatic monthly/weekly revenue report automatically
        const reportId = randomUUID();
        const now = new Date().toISOString();

        // Fetch all contracts for this period to populate the report content
        const matchingContracts = await db.all(
          `SELECT * FROM contracts 
           WHERE (isDeleted IS NULL OR isDeleted = 0)
             AND (contractType = 'output' OR contractType IS NULL OR contractType = '')
             AND department = ?
             AND invoiceDate >= ? AND invoiceDate <= ?`,
          [contract.department, config.periodStart, config.periodEnd]
        );

        const reportRows = [];
        for (const c of matchingContracts) {
          let cProducts: any[] = [];
          try {
            cProducts = c.products ? JSON.parse(c.products) : [];
          } catch (e) {
            cProducts = [];
          }

          let invoiceVal = 0;
          if (cProducts.length > 0) {
            invoiceVal = cProducts.reduce((sum: number, p: any) => {
              const qty = Number(p.invoicedQuantity) || Number(p.exportedQuantity) || Number(p.quantity) || 0;
              const price = Number(p.unitPrice) || 0;
              return sum + (qty * price);
            }, 0);
          } else {
            invoiceVal = Number(c.preTaxValue) || 0;
          }

          reportRows.push({
            contractId: c.id,
            contractNumber: c.contractNumber,
            clientName: c.clientName,
            contractName: c.contractName,
            preTaxValue: Number(c.preTaxValue) || 0,
            deliveredMonth: invoiceVal,
            deliveredCumulative: Number(c.paidAmount) || 0,
            invoiceDate: c.invoiceDate || '',
            invoiceNumber: c.invoiceNumber || '',
            assignee: c.createdBy || '',
          });
        }

        const totalPreTax = reportRows.reduce((sum: number, r: any) => sum + (Number(r.preTaxValue) || 0), 0);
        const totalDelivered = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredMonth) || 0), 0);
        const totalCumulative = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredCumulative) || 0), 0);

        await db.run(
          `INSERT INTO revenue_reports (id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, createdAt, generationMode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [reportId, config.title, config.reportType, config.periodStart, config.periodEnd, JSON.stringify(reportRows), totalPreTax, totalDelivered, totalCumulative, contract.createdBy || 'system', contract.department, 'Draft', now, 'automatic']
        );

        // Log activity
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), contract.createdBy || 'system', 'revenue_report.created', reportId, 'revenue_report', now]
        );
      }
    }

    const activeReports = await db.all(
      `SELECT * FROM revenue_reports 
       WHERE (isDeleted IS NULL OR isDeleted = 0) 
         AND (status = 'Draft' OR status LIKE 'Pending%')
         AND department = ?`,
      [contract.department]
    );

    for (const report of activeReports) {
      const pStart = report.periodStart;
      const pEnd = report.periodEnd;
      const generationMode = report.generationMode || 'manual';

      if (generationMode === 'automatic') {
        // Recalculate automatic report content entirely
        const matchingContracts = await db.all(
          `SELECT * FROM contracts 
           WHERE (isDeleted IS NULL OR isDeleted = 0)
             AND (contractType = 'output' OR contractType IS NULL OR contractType = '')
             AND department = ?
             AND invoiceDate >= ? AND invoiceDate <= ?`,
          [report.department, pStart, pEnd]
        );

        const reportRows = [];
        for (const c of matchingContracts) {
          let cProducts: any[] = [];
          try {
            cProducts = c.products ? JSON.parse(c.products) : [];
          } catch (e) {
            cProducts = [];
          }

          let invoiceVal = 0;
          if (cProducts.length > 0) {
            invoiceVal = cProducts.reduce((sum: number, p: any) => {
              const qty = Number(p.invoicedQuantity) || Number(p.exportedQuantity) || Number(p.quantity) || 0;
              const price = Number(p.unitPrice) || 0;
              return sum + (qty * price);
            }, 0);
          } else {
            invoiceVal = Number(c.preTaxValue) || 0;
          }

          reportRows.push({
            contractId: c.id,
            contractNumber: c.contractNumber,
            clientName: c.clientName,
            contractName: c.contractName,
            preTaxValue: Number(c.preTaxValue) || 0,
            deliveredMonth: invoiceVal,
            deliveredCumulative: Number(c.paidAmount) || 0,
            invoiceDate: c.invoiceDate || '',
            invoiceNumber: c.invoiceNumber || '',
            assignee: c.createdBy || '',
          });
        }

        const totalPreTax = reportRows.reduce((sum: number, r: any) => sum + (Number(r.preTaxValue) || 0), 0);
        const totalDelivered = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredMonth) || 0), 0);
        const totalCumulative = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredCumulative) || 0), 0);

        await db.run(
          `UPDATE revenue_reports 
           SET content = ?, totalPreTax = ?, totalDelivered = ?, totalCumulative = ?
           WHERE id = ?`,
          [JSON.stringify(reportRows), totalPreTax, totalDelivered, totalCumulative, report.id]
        );
      } else {
        // Manual report - only update if the invoice date falls within the period
        if (invoiceDateToUse >= pStart && invoiceDateToUse <= pEnd) {
          let reportRows: any[] = [];
          try {
            reportRows = report.content ? JSON.parse(report.content) : [];
          } catch (e) {
            reportRows = [];
          }

          if (contract.isDeleted) {
            reportRows = reportRows.filter((row: any) => row.contractId !== contract.id);
          } else {
            let products: any[] = [];
            try {
              products = contract.products ? JSON.parse(contract.products) : [];
            } catch (e) {
              products = [];
            }

            reportRows = reportRows.map((row: any) => {
              if (row.contractId === contract.id) {
                let invoiceVal = 0;
                if (products.length > 0) {
                  invoiceVal = products.reduce((sum: number, p: any) => {
                    const qty = Number(p.invoicedQuantity) || Number(p.exportedQuantity) || Number(p.quantity) || 0;
                    const price = Number(p.unitPrice) || 0;
                    return sum + (qty * price);
                  }, 0);
                } else {
                  invoiceVal = Number(contract.preTaxValue) || 0;
                }

                return {
                  ...row,
                  contractNumber: contract.contractNumber,
                  clientName: contract.clientName,
                  contractName: contract.contractName,
                  preTaxValue: Number(contract.preTaxValue) || 0,
                  deliveredMonth: invoiceVal,
                  deliveredCumulative: Number(contract.paidAmount) || 0,
                  invoiceDate: contract.invoiceDate || '',
                  invoiceNumber: contract.invoiceNumber || '',
                };
              }
              return row;
            });
          }

          const totalPreTax = reportRows.reduce((sum: number, r: any) => sum + (Number(r.preTaxValue) || 0), 0);
          const totalDelivered = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredMonth) || 0), 0);
          const totalCumulative = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredCumulative) || 0), 0);

          await db.run(
            `UPDATE revenue_reports 
             SET content = ?, totalPreTax = ?, totalDelivered = ?, totalCumulative = ?
             WHERE id = ?`,
            [JSON.stringify(reportRows), totalPreTax, totalDelivered, totalCumulative, report.id]
          );
        } else {
          // If invoice date changed to be outside the manual report's period, remove it
          let reportRows: any[] = [];
          try {
            reportRows = report.content ? JSON.parse(report.content) : [];
          } catch (e) {
            reportRows = [];
          }

          const beforeCount = reportRows.length;
          reportRows = reportRows.filter((row: any) => row.contractId !== contract.id);

          if (reportRows.length !== beforeCount) {
            const totalPreTax = reportRows.reduce((sum: number, r: any) => sum + (Number(r.preTaxValue) || 0), 0);
            const totalDelivered = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredMonth) || 0), 0);
            const totalCumulative = reportRows.reduce((sum: number, r: any) => sum + (Number(r.deliveredCumulative) || 0), 0);

            await db.run(
              `UPDATE revenue_reports 
               SET content = ?, totalPreTax = ?, totalDelivered = ?, totalCumulative = ?
               WHERE id = ?`,
              [JSON.stringify(reportRows), totalPreTax, totalDelivered, totalCumulative, report.id]
            );
          }
        }
      }
    }
  }

  // GET all contracts (not deleted)
  router.get('/', async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const perms = user.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = 'SELECT * FROM contracts WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      // Time-boxing disabled: fetching all contracts regardless of createdAt

      if (!canViewAll) {
        query += ' AND (createdBy = ? OR department = ? OR docAccountantUserId = ?)';
        params.push(user.id, user.department || '', user.id);
      }
      
      query += ' ORDER BY createdAt DESC';

      const rows = await db.all(query, params);
      const mapped = rows.map((r: any) => ({
        ...r,
        products: r.products ? JSON.parse(r.products) : [],
        attachments: r.attachments ? JSON.parse(r.attachments) : [],
        documentChecklist: r.documentChecklist ? JSON.parse(r.documentChecklist) : {},
        payments: r.payments ? JSON.parse(r.payments) : []
      }));
      res.json(mapped);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contracts' }); }
  });

  // GET archive
  router.get('/archive', async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const perms = user.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = 'SELECT * FROM contracts WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      if (!canViewAll) {
        query += ' AND (createdBy = ? OR department = ? OR docAccountantUserId = ?)';
        params.push(user.id, user.department || '', user.id);
      }
      
      query += ' ORDER BY createdAt DESC';

      const rows = await db.all(query, params);
      const mapped = rows.map((r: any) => ({
        ...r,
        products: r.products ? JSON.parse(r.products) : [],
        attachments: r.attachments ? JSON.parse(r.attachments) : [],
        payments: r.payments ? JSON.parse(r.payments) : []
      }));
      res.json(mapped);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contracts archive' }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, status, attachments, paidAmount, projectId, contractType, supplierName, documentChecklist, signedDate, startDate, endDate, warrantyMonths, payments, docSentDate, docReceivedDate, docAccountantDate, docReceiver, docAccountantUserId, docAccountantStatus } = req.body;
    // createdBy / department ownership comes from the verified JWT, not the client body.
    const createdBy = user.id;
    const requestedDepartment = department || user.department;
    const perms = user.permissions || [];
    const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
    const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === requestedDepartment;
    // Only privileged users may file into another department; everyone else is bound to their own.
    const effectiveDepartment = (isSystemAdmin || isDeptManager) ? requestedDepartment : user.department;
    const isManagerOrAdmin = isSystemAdmin || isDeptManager;

    if (!isManagerOrAdmin && status && status !== 'draft' && status !== 'pending') {
      return res.status(400).json({ error: 'Nhân viên chỉ có quyền tạo hợp đồng ở trạng thái Bản nháp hoặc Chờ duyệt!' });
    }
    
    // 1. Input Validation
    if (!contractNumber || typeof contractNumber !== 'string' || !contractNumber.trim()) {
      return res.status(400).json({ error: 'Số hợp đồng không được để trống' });
    }
    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return res.status(400).json({ error: 'Tên đối tác/khách hàng không được để trống' });
    }
    if (!contractName || typeof contractName !== 'string' || !contractName.trim()) {
      return res.status(400).json({ error: 'Tên hợp đồng/dự án không được để trống' });
    }

    try {
      // 2. Uniqueness Validation
      const existing = await db.get(
        'SELECT id FROM contracts WHERE contractNumber = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractNumber.trim()]
      );
      if (existing) {
        return res.status(400).json({ error: 'Số hợp đồng này đã tồn tại trên hệ thống' });
      }

      // Validate pricing constraint for products in output contract
      if ((contractType || 'output') === 'output' && Array.isArray(products)) {
        for (const p of products) {
          if (!p.name) continue;
          const dbProduct = await db.get('SELECT * FROM products WHERE name = ?', [p.name.trim()]);
          if (dbProduct) {
            const unitPrice = Number(p.unitPrice) || 0;
            const importPrice = Number(dbProduct.importPrice) || 0;
            if (unitPrice <= importPrice) {
              return res.status(400).json({ error: `Đơn giá bán của sản phẩm '${p.name}' không được bằng hoặc thấp hơn giá mua (${importPrice.toLocaleString('vi-VN')} ₫) trong kho!` });
            }
          }
        }
      }

      const now = new Date().toISOString();
      const contractId = id || randomUUID();

      // Query active documents for this contract from the documents table
      const docs = await db.all(
        'SELECT url FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId, 'contracts']
      );
      const attachmentsList = docs.map((d: any) => d.url);
      const bodyAttachments = Array.isArray(attachments) ? attachments : [];
      const combinedAttachments = Array.from(new Set([...attachmentsList, ...bodyAttachments]));

      const accountantStatus = docAccountantUserId ? (docAccountantStatus || 'pending') : null;

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      await db.run(
        `INSERT INTO contracts (id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, createdBy, createdAt, status, attachments, paidAmount, projectId, contractType, supplierName, documentChecklist, signedDate, startDate, endDate, warrantyMonths, payments, docSentDate, docReceivedDate, docAccountantDate, docReceiver, docAccountantUserId, docAccountantStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contractId, contractNumber.trim(), clientName.trim(), contractName.trim(), products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, effectiveDepartment, createdBy, now, status || 'draft', JSON.stringify(combinedAttachments), paidAmount ?? 0, projectId || null, contractType || 'output', supplierName || null, documentChecklist ? JSON.stringify(documentChecklist) : null, signedDate ?? null, startDate ?? null, endDate ?? null, Number(warrantyMonths) || 0, payments ? JSON.stringify(payments) : null, docSentDate ?? null, docReceivedDate ?? null, docAccountantDate ?? null, docReceiver ?? null, docAccountantUserId ?? null, accountantStatus]
      );

      // Send notification to accountant if assigned during creation
      if (docAccountantUserId) {
        await sendNotification(
          db,
          docAccountantUserId,
          'contract_handover',
          'Bàn giao hồ sơ hợp đồng',
          `Hợp đồng "${contractName.trim()}" (Số HĐ: ${contractNumber.trim()}) được bàn giao cho bạn để kiểm tra và nhận hồ sơ.`,
          contractId
        );
      }

      // Trưởng phòng notification if status is 'pending'
      if (status === 'pending') {
        const creatorName = req.user?.name || 'Nhân viên';
        const managers = await db.all("SELECT id FROM users WHERE (role = 'Manager' OR role LIKE 'Trưởng%' OR role LIKE 'trưởng%') AND department = ?", [effectiveDepartment]);
        for (const manager of managers) {
          await sendNotification(
            db,
            manager.id,
            'contract_pending_approval',
            'Hợp đồng cần duyệt',
            `Nhân viên ${creatorName} đã gửi yêu cầu duyệt Hợp đồng ${contractNumber.trim()} (${contractName.trim()}).`,
            contractId
          );
        }
      }

      // Auto-create a Task for this new contract (Only for output contracts)
      if (contractType !== 'input') {
        const taskId = randomUUID();
        await db.run(
          'INSERT INTO tasks (id, title, description, startDate, priority, status, createdBy, department, contractId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [taskId, `Thực hiện HĐ: ${contractNumber.trim()}`, `Hợp đồng: ${contractName.trim()}\nKhách hàng: ${clientName.trim()}`, now.split('T')[0], 'Medium', 'Todo', createdBy, effectiveDepartment, contractId]
        );
        if (createdBy) {
          await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, createdBy]);
        }
      }

      // Nếu là hợp đồng bán, tự động cập nhật salePrice của sản phẩm trong kho
      if ((contractType || 'output') === 'output' && Array.isArray(products)) {
        for (const p of products) {
          if (!p.name) continue;
          const unitPrice = Number(p.unitPrice) || 0;
          await db.run('UPDATE products SET salePrice = ? WHERE name = ?', [unitPrice, p.name.trim()]);
        }
      }

      await logActivity(req.user?.id || 'system', 'Tạo Hợp đồng', contractId, { contractNumber: contractNumber.trim(), contractName: contractName.trim() });

      // Nếu là hợp đồng đầu vào, tạo MỤC KHO MỚI (không gộp vào lô cũ)
      if (contractType === 'input' && Array.isArray(products)) {
        // Clean up any pre-existing warehouse products under this contract number to prevent duplicates
        const contractNumberTrimmed = contractNumber.trim();
        await db.run(
          'DELETE FROM products WHERE importCode = ? OR importCode LIKE ?',
          [contractNumberTrimmed, contractNumberTrimmed + '-%']
        );

        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          if (!p.name) continue;
          const qty = Number(p.quantity) || 0;
          const price = Number(p.unitPrice) || 0;
          const importCodeVal = `${contractNumberTrimmed}-${i + 1}`;

          // New contract → new warehouse entry with unique id
          const prodId = 'prod-' + randomUUID().substring(0, 8);
          await db.run(
            `INSERT INTO products
               (id, name, unit, origin, category, importQuantity, remainingQuantity,
                importPrice, invoiceDate, createdAt, importCode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodId, p.name.trim(), p.unit || '', p.origin || '',
              invoiceNumber ? invoiceNumber.trim() : '',
              qty, qty, price,
              invoiceDate ? invoiceDate.trim() : null,
              now, importCodeVal
            ]
          );
        }
      }

      // Auto-create contract links if requested
      const { linkedInputContractIds } = req.body;
      if (contractType === 'output' && Array.isArray(linkedInputContractIds) && linkedInputContractIds.length > 0) {
        for (const inputId of linkedInputContractIds) {
          const linkId = randomUUID();
          try {
            await db.run(
              'INSERT INTO contract_links (id, outputContractId, inputContractId, linkType, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
              [linkId, contractId, inputId, 'procurement', createdBy || null, now]
            );
          } catch (err: any) {
            if (!err.message?.includes('UNIQUE')) console.error(err);
          }
        }
      }

      // Update revenue reports
      await updateRevenueReportsForContract(db, contractId);

      // Commit transaction
      await db.run('COMMIT');

      res.status(201).json({ id: contractId });
    } catch (e: any) {
      // Rollback transaction on failure
      try {
        await db.run('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      console.error('contract error:', (e as Error)?.message);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  // UPDATE
  router.put('/:id', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;
    const { contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, status, attachments, paidAmount, projectId, contractType, supplierName, documentChecklist, linkedInputContractIds, signedDate, startDate, endDate, warrantyMonths, payments, docSentDate, docReceivedDate, docAccountantDate, docReceiver, docAccountantUserId, docAccountantStatus } = req.body;

    // 1. Input Validation
    if (!contractNumber || typeof contractNumber !== 'string' || !contractNumber.trim()) {
      return res.status(400).json({ error: 'Số hợp đồng không được để trống' });
    }
    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return res.status(400).json({ error: 'Tên đối tác/khách hàng không được để trống' });
    }
    if (!contractName || typeof contractName !== 'string' || !contractName.trim()) {
      return res.status(400).json({ error: 'Tên hợp đồng/dự án không được để trống' });
    }

    // Validate pricing constraint for products in output contract
    if ((contractType || 'output') === 'output' && Array.isArray(products)) {
      for (const p of products) {
        if (!p.name) continue;
        const dbProduct = await db.get('SELECT * FROM products WHERE name = ?', [p.name.trim()]);
        if (dbProduct) {
          const unitPrice = Number(p.unitPrice) || 0;
          const importPrice = Number(dbProduct.importPrice) || 0;
          if (unitPrice <= importPrice) {
            return res.status(400).json({ error: `Đơn giá bán của sản phẩm '${p.name}' không được bằng hoặc thấp hơn giá mua (${importPrice.toLocaleString('vi-VN')} ₫) trong kho!` });
          }
        }
      }
    }

    try {
      // Get existing contract to check existence, creator, and status
      const existingContract = await db.get(
        'SELECT createdBy, status, department, approvalFeedback, docAccountantUserId, docAccountantStatus, contractName, contractNumber FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId]
      );
      if (!existingContract) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại hoặc đã bị xóa' });
      }

      // Check lock state
      if (existingContract.status === 'completed' || existingContract.status === 'cancelled' || existingContract.docAccountantStatus === 'confirmed') {
        return res.status(400).json({ error: 'Hợp đồng đã hoàn thành, bị hủy hoặc đã được kế toán xác nhận, không thể chỉnh sửa!' });
      }

      // 2. IDOR / Authorization Check
      const perms = user.permissions || [];
      const isOwner = existingContract.createdBy === user.id;
      const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
      const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === (existingContract.department || department);
      const isManagerOrAdmin = isSystemAdmin || isDeptManager;

      if (!isOwner && !isManagerOrAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa hợp đồng này' });
      }

      // Chặn nhân viên sửa khi HĐ đang chờ duyệt
      if (existingContract.status === 'pending' && !isManagerOrAdmin) {
        return res.status(400).json({ error: 'Hợp đồng đang chờ duyệt, bạn không thể chỉnh sửa!' });
      }

      // Chặn nhân viên thường hoặc TP của phòng ban khác thay đổi trạng thái sang in_progress, completed, cancelled
      if (!isManagerOrAdmin && status && status !== existingContract.status && status !== 'draft' && status !== 'pending') {
        return res.status(400).json({ error: 'Nhân viên chỉ có quyền cập nhật trạng thái là Bản nháp hoặc Chờ duyệt!' });
      }

      // 3. Uniqueness Validation
      const duplicateContract = await db.get(
        'SELECT id FROM contracts WHERE contractNumber = ? AND id != ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractNumber.trim(), contractId]
      );
      if (duplicateContract) {
        return res.status(400).json({ error: 'Số hợp đồng này đã tồn tại trên hệ thống' });
      }

      const now = new Date().toISOString();

      // Query active documents for this contract from the documents table
      const docs = await db.all(
        'SELECT url FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId, 'contracts']
      );
      const attachmentsList = docs.map((d: any) => d.url);
      const bodyAttachments = Array.isArray(attachments) ? attachments : [];
      const combinedAttachments = Array.from(new Set([...attachmentsList, ...bodyAttachments]));

      // Determine accountant status updates
      const oldAccountantId = existingContract.docAccountantUserId;
      let accountantStatus = docAccountantStatus || existingContract.docAccountantStatus || 'pending';
      if (docAccountantUserId !== oldAccountantId) {
        accountantStatus = docAccountantUserId ? 'pending' : null;
      }

      // Determine approval feedback updates (clear when submitting for approval)
      let finalFeedback = existingContract.approvalFeedback;
      if (status === 'pending') {
        finalFeedback = null;
      }

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      await db.run(
        `UPDATE contracts SET contractNumber=?, clientName=?, contractName=?, products=?, preTaxValue=?, vatRate=?, postTaxValue=?, invoiceDate=?, invoiceNumber=?, status=?, attachments=?, paidAmount=?, projectId=?, contractType=?, supplierName=?, documentChecklist=?, signedDate=?, startDate=?, endDate=?, warrantyMonths=?, payments=?, docSentDate=?, docReceivedDate=?, docAccountantDate=?, docReceiver=?, docAccountantUserId=?, docAccountantStatus=?, approvalFeedback=?, updatedAt=? WHERE id=?`,
        [contractNumber.trim(), clientName.trim(), contractName.trim(), products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, status || 'draft', JSON.stringify(combinedAttachments), paidAmount ?? 0, projectId || null, contractType || 'output', supplierName || null, documentChecklist ? JSON.stringify(documentChecklist) : null, signedDate ?? null, startDate ?? null, endDate ?? null, Number(warrantyMonths) || 0, payments ? JSON.stringify(payments) : null, docSentDate ?? null, docReceivedDate ?? null, docAccountantDate ?? null, docReceiver ?? null, docAccountantUserId || null, accountantStatus, finalFeedback, now, contractId]
      );

      // Send notification to manager if status changed to pending
      if (status === 'pending' && existingContract.status !== 'pending') {
        const creatorName = user.name || 'Nhân viên';
        const targetDept = existingContract.department || department;
        const managers = await db.all("SELECT id FROM users WHERE (role = 'Manager' OR role LIKE 'Trưởng%' OR role LIKE 'trưởng%') AND department = ?", [targetDept]);
        for (const manager of managers) {
          await sendNotification(
            db,
            manager.id,
            'contract_pending_approval',
            'Hợp đồng cần duyệt',
            `Nhân viên ${creatorName} đã gửi yêu cầu duyệt Hợp đồng ${contractNumber.trim()} (${contractName.trim()}).`,
            contractId
          );
        }
      }

      // Send notification to new accountant if assigned or changed
      if (docAccountantUserId && docAccountantUserId !== oldAccountantId) {
        await sendNotification(
          db,
          docAccountantUserId,
          'contract_handover',
          'Bàn giao hồ sơ hợp đồng',
          `Hợp đồng "${contractName.trim()}" (Số HĐ: ${contractNumber.trim()}) được bàn giao cho bạn để kiểm tra và nhận hồ sơ.`,
          contractId
        );
      }

      // Auto-create contract links if requested
      if (contractType === 'output' && Array.isArray(linkedInputContractIds) && linkedInputContractIds.length > 0) {
        for (const inputId of linkedInputContractIds) {
          const linkId = randomUUID();
          try {
            await db.run(
              'INSERT INTO contract_links (id, outputContractId, inputContractId, linkType, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
              [linkId, contractId, inputId, 'procurement', user.id || null, now]
            );
          } catch (err: any) {
            if (!err.message?.includes('UNIQUE')) console.error(err);
          }
        }
      }

      // Cập nhật salePrice của sản phẩm trong kho cho hợp đồng bán
      if ((contractType || 'output') === 'output' && Array.isArray(products)) {
        for (const p of products) {
          if (!p.name) continue;
          const unitPrice = Number(p.unitPrice) || 0;
          await db.run('UPDATE products SET salePrice = ? WHERE name = ?', [unitPrice, p.name.trim()]);
        }
      }

      // Nếu là hợp đồng mua (đầu vào), cập nhật MỤC KHO theo hợp đồng
      if (contractType === 'input' && Array.isArray(products)) {
        // First delete all existing warehouse products associated with the old contract number
        const oldContractNumberTrimmed = existingContract.contractNumber.trim();
        await db.run(
          'DELETE FROM products WHERE importCode = ? OR importCode LIKE ?',
          [oldContractNumberTrimmed, oldContractNumberTrimmed + '-%']
        );

        // Also delete any existing warehouse products under the new contract number to prevent conflicts
        const contractNumberTrimmed = contractNumber.trim();
        if (contractNumberTrimmed !== oldContractNumberTrimmed) {
          await db.run(
            'DELETE FROM products WHERE importCode = ? OR importCode LIKE ?',
            [contractNumberTrimmed, contractNumberTrimmed + '-%']
          );
        }

        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          if (!p.name) continue;
          const qty = Number(p.quantity) || 0;
          const price = Number(p.unitPrice) || 0;
          const importCodeVal = `${contractNumberTrimmed}-${i + 1}`;

          const prodId = 'prod-' + randomUUID().substring(0, 8);
          await db.run(
            `INSERT INTO products
               (id, name, unit, origin, category, importQuantity, remainingQuantity,
                importPrice, invoiceDate, createdAt, importCode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodId, p.name.trim(), p.unit || '', p.origin || '',
              invoiceNumber ? invoiceNumber.trim() : '',
              qty, qty, price,
              invoiceDate ? invoiceDate.trim() : null,
              now, importCodeVal
            ]
          );
        }
      }

      await logActivity(user.id, 'Cập nhật Hợp đồng', contractId, { contractNumber: contractNumber.trim(), status, preTaxValue, paidAmount });

      // Update revenue reports
      await updateRevenueReportsForContract(db, contractId);

      // Commit transaction
      await db.run('COMMIT');

      res.json({ success: true });
    } catch (e: any) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      console.error('contract update error:', (e as Error)?.message);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // CONFIRM RECEIPT (For accountant only)
  router.put('/:id/confirm-receipt', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;

    try {
      const existing = await db.get(
        'SELECT docAccountantUserId, docAccountantStatus, contractName, contractNumber, createdBy, contractType FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId]
      );
      if (!existing) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại hoặc đã bị xóa' });
      }

      // Authorization Check
      if (existing.docAccountantUserId !== user.id) {
        return res.status(403).json({ error: 'Bạn không phải là kế toán được bàn giao cho hợp đồng này' });
      }

      if (existing.docAccountantStatus === 'confirmed') {
        return res.status(400).json({ error: 'Hợp đồng này đã được kế toán xác nhận nhận hồ sơ từ trước' });
      }

      const now = new Date().toISOString();
      const todayStr = now.split('T')[0];

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      // Update docAccountantStatus = 'confirmed', docAccountantDate = today, status = 'completed'
      await db.run(
        `UPDATE contracts SET docAccountantStatus = 'confirmed', docAccountantDate = ?, status = 'completed', updatedAt = ? WHERE id = ?`,
        [todayStr, now, contractId]
      );

      // Log activity
      await logActivity(user.id, 'Xác nhận nhận hồ sơ', contractId, {
        contractNumber: existing.contractNumber,
        contractName: existing.contractName,
        docAccountantDate: todayStr
      });

      // Send success notification back to creator
      if (existing.createdBy) {
        await sendNotification(
          db,
          existing.createdBy,
          'contract_confirmed',
          'Kế toán xác nhận nhận hồ sơ',
          `Kế toán ${user.name} đã xác nhận nhận hồ sơ cho hợp đồng "${existing.contractName}" (Số HĐ: ${existing.contractNumber}) thành công. Hợp đồng đã hoàn thành và được khóa.`,
          contractId
        );
      }

      // Cascade completion to linked buying/input contracts
      if ((existing.contractType || 'output') === 'output') {
        const linkedContracts = await db.all(
          `SELECT c.id, c.contractName, c.contractNumber, c.createdBy 
           FROM contract_links cl
           JOIN contracts c ON cl.inputContractId = c.id
           WHERE cl.outputContractId = ? AND c.contractType = 'input' AND (c.isDeleted IS NULL OR c.isDeleted = 0) AND c.status != 'completed'`,
          [contractId]
        );

        for (const linked of linkedContracts) {
          // Update status of linked buying contract to completed
          await db.run(
            `UPDATE contracts SET docAccountantStatus = 'confirmed', docAccountantDate = ?, status = 'completed', updatedAt = ? WHERE id = ?`,
            [todayStr, now, linked.id]
          );

          // Log activity for the linked contract
          await logActivity(user.id, 'Xác nhận nhận hồ sơ tự động (theo HĐ bán liên kết)', linked.id, {
            contractNumber: linked.contractNumber,
            contractName: linked.contractName,
            docAccountantDate: todayStr
          });

          // Send notification to the linked contract creator
          if (linked.createdBy) {
            await sendNotification(
              db,
              linked.createdBy,
              'contract_confirmed',
              'Kế toán xác nhận nhận hồ sơ (Tự động)',
              `Hợp đồng mua "${linked.contractName}" (Số HĐ: ${linked.contractNumber}) đã được tự động hoàn thành vì hợp đồng bán liên kết "${existing.contractName}" (Số HĐ: ${existing.contractNumber}) đã hoàn thành.`,
              linked.id
            );
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      res.json({ success: true, docAccountantDate: todayStr });
    } catch (e: any) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackErr) {}
      console.error('contract confirm error:', (e as Error)?.message);
      res.status(500).json({ error: 'Failed to confirm receipt' });
    }
  });

  // SOFT DELETE
  router.delete('/:id', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;

    try {
      // Get existing contract to check existence and creator
      const existingContract = await db.get('SELECT createdBy, department, contractNumber FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [contractId]);
      if (!existingContract) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại hoặc đã bị xóa' });
      }

      // IDOR / Authorization Check — same bar as approve/update:
      // owner, system admin/director, or the owning department's manager.
      const perms = user.permissions || [];
      const isOwner = existingContract.createdBy === user.id;
      const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
      const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === existingContract.department;

      if (!isOwner && !isSystemAdmin && !isDeptManager) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa hợp đồng này' });
      }

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      await db.run('UPDATE contracts SET isDeleted = 1 WHERE id = ?', [contractId]);
      
      // Also delete any auto-generated tasks associated with this contract
      const tasks = await db.all('SELECT id FROM tasks WHERE contractId = ?', [contractId]);
      for (const t of tasks) {
        await db.run('DELETE FROM task_assignees WHERE taskId = ?', [t.id]);
        await db.run('DELETE FROM task_tags WHERE taskId = ?', [t.id]);
        await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [t.id]);
        await db.run('DELETE FROM task_comments WHERE taskId = ?', [t.id]);
        await db.run('DELETE FROM tasks WHERE id = ?', [t.id]);
      }

      await logActivity(user.id, 'Xóa Hợp đồng', contractId, { contractNumber: existingContract.contractNumber });

      // Update revenue reports
      await updateRevenueReportsForContract(db, contractId);

      // Commit transaction
      await db.run('COMMIT');

      res.json({ success: true });
    } catch (e: any) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      console.error('contract delete error:', (e as Error)?.message);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  // APPROVE contract (TP / Admin only)
  router.put('/:id/approve', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;

    try {
      const contract = await db.get(
        'SELECT createdBy, contractName, contractNumber, department FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId]
      );
      if (!contract) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
      }

      const perms = user.permissions || [];
      const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
      const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === contract.department;

      if (!isSystemAdmin && !isDeptManager) {
        return res.status(403).json({ error: 'Chỉ Trưởng phòng của phòng ban hoặc Admin mới có quyền thao tác trên hợp đồng này!' });
      }

      const now = new Date().toISOString();
      await db.run(
        `UPDATE contracts SET status = 'in_progress', approvalFeedback = NULL, updatedAt = ? WHERE id = ?`,
        [now, contractId]
      );

      await logActivity(user.id, 'Phê duyệt Hợp đồng', contractId, { contractNumber: contract.contractNumber });

      // Notify creator
      if (contract.createdBy) {
        await sendNotification(
          db,
          contract.createdBy,
          'contract_approved',
          'Hợp đồng được phê duyệt',
          `Hợp đồng "${contract.contractName}" (Số HĐ: ${contract.contractNumber}) của bạn đã được phê duyệt thành công.`,
          contractId
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error('contract approve error:', (e as Error)?.message);
      res.status(500).json({ error: 'Lỗi khi phê duyệt hợp đồng' });
    }
  });

  // REJECT contract (TP / Admin only)
  router.put('/:id/reject', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;
    const { feedback } = req.body;
    if (!feedback?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối' });
    }

    try {
      const contract = await db.get(
        'SELECT createdBy, contractName, contractNumber, department FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId]
      );
      if (!contract) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
      }

      const perms = user.permissions || [];
      const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
      const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === contract.department;

      if (!isSystemAdmin && !isDeptManager) {
        return res.status(403).json({ error: 'Chỉ Trưởng phòng của phòng ban hoặc Admin mới có quyền thao tác trên hợp đồng này!' });
      }

      const now = new Date().toISOString();
      await db.run(
        `UPDATE contracts SET status = 'draft', approvalFeedback = ?, updatedAt = ? WHERE id = ?`,
        [feedback.trim(), now, contractId]
      );

      await logActivity(user.id, 'Từ chối Hợp đồng', contractId, { contractNumber: contract.contractNumber, feedback: feedback.trim() });

      // Notify creator
      if (contract.createdBy) {
        await sendNotification(
          db,
          contract.createdBy,
          'contract_rejected',
          'Hợp đồng bị từ chối',
          `Hợp đồng "${contract.contractName}" (Số HĐ: ${contract.contractNumber}) của bạn bị từ chối. Lý do: ${feedback.trim()}`,
          contractId
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error('contract reject error:', (e as Error)?.message);
      res.status(500).json({ error: 'Lỗi khi từ chối hợp đồng' });
    }
  });

  // CANCEL PENDING contract (TP of department / Admin only)
  router.put('/:id/cancel-pending', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const contractId = req.params.id;
    const { feedback } = req.body;
    if (!feedback?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do hủy' });
    }

    try {
      const contract = await db.get(
        'SELECT createdBy, contractName, contractNumber, department FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [contractId]
      );
      if (!contract) {
        return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
      }

      const perms = user.permissions || [];
      const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || user.role === 'Admin' || user.role === 'Director';
      const isDeptManager = (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng'))) && user.department === contract.department;

      if (!isSystemAdmin && !isDeptManager) {
        return res.status(403).json({ error: 'Chỉ Trưởng phòng của phòng ban hoặc Admin mới có quyền thao tác trên hợp đồng này!' });
      }

      const now = new Date().toISOString();
      await db.run(
        `UPDATE contracts SET status = 'cancelled', approvalFeedback = ?, updatedAt = ? WHERE id = ?`,
        [feedback.trim(), now, contractId]
      );

      await logActivity(user.id, 'Hủy Hợp đồng', contractId, { contractNumber: contract.contractNumber, feedback: feedback.trim() });

      // Notify creator
      if (contract.createdBy) {
        await sendNotification(
          db,
          contract.createdBy,
          'contract_cancelled',
          'Hợp đồng bị hủy',
          `Hợp đồng "${contract.contractName}" (Số HĐ: ${contract.contractNumber}) của bạn đã bị hủy bởi Trưởng phòng. Lý do: ${feedback.trim()}`,
          contractId
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error('contract cancel error:', (e as Error)?.message);
      res.status(500).json({ error: 'Lỗi khi hủy hợp đồng' });
    }
  });

  return router;
}
