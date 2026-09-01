import { Router } from 'express';

export function organizationRoutes(db: any) {
  const router = Router();

  // GET /api/organization/tree - Complete hierarchy tree
  router.get('/tree', async (_req, res) => {
    try {
      const companyConfig = await db.all(
        "SELECT `key`, `value` FROM system_config WHERE `key` IN ('company_name', 'brand_name', 'company_mission', 'company_headquarter', 'brand_primary_color')"
      );
      const companyInfo: Record<string, string> = {};
      for (const row of companyConfig) {
        companyInfo[row.key] = row.value;
      }

      const departments = await db.all(
        'SELECT * FROM departments WHERE (isActive IS NULL OR isActive = 1) ORDER BY sortOrder ASC, name ASC'
      );
      const teams = await db.all(
        'SELECT * FROM teams WHERE (isActive IS NULL OR isActive = 1) ORDER BY name ASC'
      );
      const positions = await db.all(
        'SELECT * FROM positions WHERE (isActive IS NULL OR isActive = 1) ORDER BY level DESC, name ASC'
      );
      const users = await db.all(
        'SELECT id, name, email, role, department, departmentId, teamId, positionId, managerId, avatar, phone FROM users WHERE (isLocked IS NULL OR isLocked = 0)'
      );

      // Build structured tree
      const tree = departments.map((dept: any) => {
        const deptTeams = teams.filter((t: any) => t.departmentId === dept.id);
        const deptMembers = users.filter((u: any) => u.departmentId === dept.id || u.department === dept.name);
        const manager = dept.managerId ? users.find((u: any) => u.id === dept.managerId) : null;

        const structuredTeams = deptTeams.map((team: any) => {
          const teamMembers = users.filter((u: any) => u.teamId === team.id);
          const teamManager = team.managerId ? users.find((u: any) => u.id === team.managerId) : null;
          const teamPositions = positions.filter((p: any) => p.teamId === team.id || (p.departmentId === dept.id && !p.teamId));

          return {
            ...team,
            manager: teamManager || null,
            memberCount: teamMembers.length,
            members: teamMembers,
            positions: teamPositions,
          };
        });

        return {
          ...dept,
          manager: manager || null,
          memberCount: deptMembers.length,
          members: deptMembers,
          teams: structuredTeams,
        };
      });

      res.json({
        company: {
          name: companyInfo.company_name || 'Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê',
          brand: companyInfo.brand_name || 'Tran Le Electricity',
          mission: companyInfo.company_mission || 'Mang năng lượng sạch đến mọi nhà.',
          primaryColor: companyInfo.brand_primary_color || '#16A34A',
        },
        departments: tree,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch organization tree', detail: e.message });
    }
  });

  // GET /api/organization/stats - Headcount & organization stats
  router.get('/stats', async (_req, res) => {
    try {
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
      const totalDepts = await db.get('SELECT COUNT(*) as count FROM departments WHERE (isActive IS NULL OR isActive = 1)');
      const totalTeams = await db.get('SELECT COUNT(*) as count FROM teams WHERE (isActive IS NULL OR isActive = 1)');
      const totalPositions = await db.get('SELECT COUNT(*) as count FROM positions WHERE (isActive IS NULL OR isActive = 1)');
      const totalProjects = await db.get('SELECT COUNT(*) as count FROM projects WHERE (isDeleted IS NULL OR isDeleted = 0)');
      const totalTasks = await db.get('SELECT COUNT(*) as count FROM tasks');

      const departmentBreakdown = await db.all(`
        SELECT d.id, d.code, d.name, d.color, COUNT(u.id) as memberCount
        FROM departments d
        LEFT JOIN users u ON (u.departmentId = d.id OR u.department = d.name)
        WHERE (d.isActive IS NULL OR d.isActive = 1)
        GROUP BY d.id, d.code, d.name, d.color
        ORDER BY memberCount DESC
      `);

      res.json({
        totalUsers: totalUsers?.count || 0,
        totalDepartments: totalDepts?.count || 0,
        totalTeams: totalTeams?.count || 0,
        totalPositions: totalPositions?.count || 0,
        totalProjects: totalProjects?.count || 0,
        totalTasks: totalTasks?.count || 0,
        departmentBreakdown,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch organization stats', detail: e.message });
    }
  });

  return router;
}
