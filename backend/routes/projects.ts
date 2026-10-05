import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function projectRoutes(db: any) {
  const router = Router();

  const hasPermission = (user: any, permission: string) =>
    user?.role === 'Admin' || user?.permissions?.includes(permission);
  const canViewAllProjects = (user: any) =>
    hasPermission(user, 'view_all_reports') ||
    hasPermission(user, 'director_feedback') ||
    hasPermission(user, 'admin_panel') ||
    hasPermission(user, 'view_all_tasks');
  const canViewProject = (user: any, project: any) =>
    canViewAllProjects(user) || project.managerId === user?.id || project.department === user?.department;
  const canEditProject = (user: any, project: any) =>
    canViewAllProjects(user) ||
    project.managerId === user?.id ||
    (user?.role === 'Manager' && project.department === user?.department);
  const getActiveProject = (id: string) =>
    db.get('SELECT * FROM projects WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [id]);

  async function requireProjectAccess(req: any, res: any, edit = false) {
    const project = await getActiveProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return undefined;
    }
    if ((edit ? canEditProject : canViewProject)(req.user, project)) return project;
    res.status(403).json({ error: 'Forbidden' });
    return undefined;
  }

  async function logActivity(userId: string, action: string, entityId: string, metadata: any) {
    const id = randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, action, entityId, 'project', JSON.stringify(metadata), new Date().toISOString()]
    );
  }

  // GET all projects
  router.get('/', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const canViewAll = canViewAllProjects(user);

      let query = 'SELECT * FROM projects WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      if (!canViewAll) {
        query += ' AND (managerId = ? OR department = ?)';
        params.push(user.id, user.department || '');
      }
      
      query += ' ORDER BY createdAt DESC';
      const rows = await db.all(query, params);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch projects' }); }
  });

  // GET single project with its contracts and reports
  router.get('/:id', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res);
      if (!project) return;
      
      const contracts = await db.all('SELECT * FROM contracts WHERE projectId = ? AND (isDeleted IS NULL OR isDeleted = 0)', [req.params.id]);
      const reports = await db.all('SELECT * FROM project_reports WHERE projectId = ? ORDER BY createdAt DESC', [req.params.id]);
      
      res.json({ project, contracts, reports });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch project details' }); }
  });

  // CREATE project
  router.post('/', async (req, res) => {
    let { id, projectCode, name, clientName, department, managerId, status, startDate, endDate, budget, description, biddingCode, biddingDate, procurementMethod, investor, biddingPrice, winningPrice, priority, phase } = req.body;
    try {
      const user = (req as any).user;
      const canManageAll = canViewAllProjects(user);
      const projectId = id || randomUUID();
      const now = new Date().toISOString();
      const effectiveDepartment = canManageAll ? department : user.department;
      const effectiveManagerId = canManageAll ? (managerId || user.id) : user.id;
      department = effectiveDepartment;
      await db.run(
        `INSERT INTO projects (id, projectCode, name, clientName, department, managerId, status, startDate, endDate, budget, description, biddingCode, biddingDate, procurementMethod, investor, biddingPrice, winningPrice, priority, phase, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, projectCode, name, clientName, effectiveDepartment, effectiveManagerId, status || 'planning', startDate, endDate, budget || 0, description, biddingCode, biddingDate, procurementMethod, investor, biddingPrice || 0, winningPrice || 0, priority || 'medium', phase || 'initiation', now]
      );

      // Auto-create a Task for this new project
      const taskId = randomUUID();
      const createdBy = user.id;
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, priority, status, createdBy, department, projectId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId, `Thực hiện DA: ${projectCode || name}`, `Dự án: ${name}\nKhách hàng: ${clientName || ''}`, now.split('T')[0], 'Medium', 'Todo', createdBy, department || '', projectId]
      );
      if (createdBy && createdBy !== 'system') {
        await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, createdBy]);
      }

      await logActivity((req as any).user?.id || 'system', 'Tạo Dự án', projectId, { projectCode, name });

      res.status(201).json({ id: projectId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create project', detail: e.message }); }
  });

  // UPDATE project
  router.put('/:id', async (req, res) => {
    const { projectCode, name, clientName, department, managerId, status, startDate, endDate, budget, description, biddingCode, biddingDate, procurementMethod, investor, biddingPrice, winningPrice, priority, phase } = req.body;
    try {
      const currentProject = await requireProjectAccess(req, res, true);
      if (!currentProject) return;
      const user = (req as any).user;
      const canManageAll = canViewAllProjects(user);
      const effectiveDepartment = canManageAll ? department : currentProject.department;
      const effectiveManagerId = canManageAll ? (managerId || currentProject.managerId) : currentProject.managerId;
      await db.run(
        `UPDATE projects SET projectCode=?, name=?, clientName=?, department=?, managerId=?, status=?, startDate=?, endDate=?, budget=?, description=?, biddingCode=?, biddingDate=?, procurementMethod=?, investor=?, biddingPrice=?, winningPrice=?, priority=?, phase=?, updatedAt=? WHERE id=?`,
        [projectCode, name, clientName, effectiveDepartment, effectiveManagerId, status, startDate, endDate, budget, description, biddingCode, biddingDate, procurementMethod, investor, biddingPrice, winningPrice, priority || 'medium', phase || 'initiation', new Date().toISOString(), req.params.id]
      );

      await logActivity((req as any).user?.id || 'system', 'Cập nhật Dự án', req.params.id, { status, budget });

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update project' }); }
  });

  // DELETE project
  router.delete('/:id', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res, true);
      if (!project) return;
      await db.run('UPDATE projects SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      await logActivity((req as any).user?.id || 'system', 'Xóa Dự án', req.params.id, {});
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete project' }); }
  });

  // --- PROJECT REPORTS ---
  
  router.get('/:id/reports', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res);
      if (!project) return;
      const rows = await db.all('SELECT * FROM project_reports WHERE projectId = ? ORDER BY createdAt DESC', [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch project reports' }); }
  });

  router.post('/:id/reports', async (req, res) => {
    const { id, title, content, progress, status } = req.body;
    try {
      const project = await requireProjectAccess(req, res, true);
      if (!project) return;
      const reportId = id || randomUUID();
      const authorId = (req as any).user.id;
      await db.run(
        'INSERT INTO project_reports (id, projectId, title, content, progress, authorId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [reportId, req.params.id, title, content, progress || 0, authorId, status || 'draft', new Date().toISOString()]
      );

      // notify manager
      if (status === 'submitted') {
        if (project?.managerId) {
          await sendNotification(db, project.managerId, 'project_report_submitted', 'Báo cáo dự án mới', `Dự án: ${project.name} có báo cáo mới`, req.params.id);
        }
      }

      await logActivity((req as any).user?.id || 'system', 'Tạo Báo cáo DA', req.params.id, { reportId, title, progress });
      res.status(201).json({ id: reportId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create project report', detail: e.message }); }
  });

  router.put('/:id/reports/:reportId', async (req, res) => {
    const { title, content, progress, status } = req.body;
    try {
      const project = await requireProjectAccess(req, res);
      if (!project) return;
      const report = await db.get('SELECT * FROM project_reports WHERE id = ? AND projectId = ?', [req.params.reportId, req.params.id]);
      if (!report) return res.status(404).json({ error: 'Project report not found' });
      if (report.authorId !== (req as any).user.id && !canEditProject((req as any).user, project)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await db.run(
        'UPDATE project_reports SET title=?, content=?, progress=?, status=?, updatedAt=? WHERE id=? AND projectId=?',
        [title, content, progress, status, new Date().toISOString(), req.params.reportId, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update project report' }); }
  });

  router.delete('/:id/reports/:reportId', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res);
      if (!project) return;
      const report = await db.get('SELECT * FROM project_reports WHERE id = ? AND projectId = ?', [req.params.reportId, req.params.id]);
      if (!report) return res.status(404).json({ error: 'Project report not found' });
      if (report.authorId !== (req as any).user.id && !canEditProject((req as any).user, project)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await db.run('DELETE FROM project_reports WHERE id = ? AND projectId = ?', [req.params.reportId, req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete project report' }); }
  });

  // --- PROJECT MILESTONES ---

  router.get('/:id/milestones', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res);
      if (!project) return;
      const rows = await db.all('SELECT * FROM project_milestones WHERE projectId = ? ORDER BY sortOrder ASC, createdAt ASC', [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch milestones' }); }
  });

  router.post('/:id/milestones', async (req, res) => {
    const { id, title, dueDate, status, sortOrder } = req.body;
    try {
      const project = await requireProjectAccess(req, res, true);
      if (!project) return;
      const mId = id || randomUUID();
      await db.run(
        'INSERT INTO project_milestones (id, projectId, title, dueDate, status, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mId, req.params.id, title, dueDate, status || 'pending', sortOrder || 0, new Date().toISOString()]
      );
      res.status(201).json({ id: mId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create milestone', detail: e.message }); }
  });

  router.put('/:id/milestones/:milestoneId', async (req, res) => {
    const { title, dueDate, status, completedAt, sortOrder } = req.body;
    try {
      const project = await requireProjectAccess(req, res, true);
      if (!project) return;
      await db.run(
        'UPDATE project_milestones SET title=?, dueDate=?, status=?, completedAt=?, sortOrder=? WHERE id=? AND projectId=?',
        [title, dueDate, status, completedAt, sortOrder, req.params.milestoneId, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update milestone' }); }
  });

  router.delete('/:id/milestones/:milestoneId', async (req, res) => {
    try {
      const project = await requireProjectAccess(req, res, true);
      if (!project) return;
      await db.run('DELETE FROM project_milestones WHERE id = ? AND projectId = ?', [req.params.milestoneId, req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete milestone' }); }
  });

  return router;
}
