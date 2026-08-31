import { Router } from 'express';
import { randomUUID } from 'crypto';

export function contractLinkRoutes(db: any) {
  const router = Router();

  // GET all links
  router.get('/', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM contract_links ORDER BY createdAt DESC');
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contract links' }); }
  });

  // CREATE link
  router.post('/', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { outputContractId, inputContractId, linkType, description } = req.body;
    if (!outputContractId || !inputContractId) {
      return res.status(400).json({ error: 'outputContractId and inputContractId are required' });
    }
    if (outputContractId === inputContractId) {
      return res.status(400).json({ error: 'Cannot link a contract to itself' });
    }
    try {
      // Check authorization on associated contracts
      const outputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [outputContractId]);
      const inputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [inputContractId]);

      if (!outputContract || !inputContract) {
        return res.status(404).json({ error: 'Một trong các hợp đồng liên kết không tồn tại hoặc đã bị xóa' });
      }

      const perms = user.permissions || [];
      const isAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng')));
      const isOwner = outputContract.createdBy === user.id || inputContract.createdBy === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Bạn không có quyền tạo liên kết cho các hợp đồng này' });
      }

      const id = randomUUID();
      await db.run(
        'INSERT INTO contract_links (id, outputContractId, inputContractId, linkType, description, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, outputContractId, inputContractId, linkType || 'related', description || null, user.id, new Date().toISOString()]
      );
      res.status(201).json({ id });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Link already exists' });
      }
      res.status(500).json({ error: 'Failed to create link' });
    }
  });

  // UPDATE link
  router.put('/:id', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { linkType, description } = req.body;
    try {
      const link = await db.get('SELECT * FROM contract_links WHERE id = ?', [req.params.id]);
      if (!link) {
        return res.status(404).json({ error: 'Liên kết không tồn tại' });
      }

      // Check authorization
      const perms = user.permissions || [];
      const isAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng')));
      const isLinkCreator = link.createdBy === user.id;

      let isContractOwner = false;
      if (!isAdmin && !isLinkCreator) {
        const outputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ?', [link.outputContractId]);
        const inputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ?', [link.inputContractId]);
        isContractOwner = (outputContract && outputContract.createdBy === user.id) || (inputContract && inputContract.createdBy === user.id);
      }

      if (!isAdmin && !isLinkCreator && !isContractOwner) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa liên kết này' });
      }

      await db.run(
        'UPDATE contract_links SET linkType = ?, description = ? WHERE id = ?',
        [linkType || 'related', description || null, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update link' }); }
  });

  // DELETE link
  router.delete('/:id', async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const link = await db.get('SELECT * FROM contract_links WHERE id = ?', [req.params.id]);
      if (!link) {
        return res.status(404).json({ error: 'Liên kết không tồn tại' });
      }

      // Check authorization
      const perms = user.permissions || [];
      const isAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || (user.role && (user.role === 'Manager' || user.role.startsWith('Trưởng') || user.role.includes('Trưởng')));
      const isLinkCreator = link.createdBy === user.id;

      let isContractOwner = false;
      if (!isAdmin && !isLinkCreator) {
        const outputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ?', [link.outputContractId]);
        const inputContract = await db.get('SELECT createdBy FROM contracts WHERE id = ?', [link.inputContractId]);
        isContractOwner = (outputContract && outputContract.createdBy === user.id) || (inputContract && inputContract.createdBy === user.id);
      }

      if (!isAdmin && !isLinkCreator && !isContractOwner) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa liên kết này' });
      }

      await db.run('DELETE FROM contract_links WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete link' }); }
  });

  return router;
}
