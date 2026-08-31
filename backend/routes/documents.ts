import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function documentRoutes(db: any) {
  const router = Router();

  // GET: Lấy danh sách tài liệu với bộ lọc
  router.get('/', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const perms = currentUser.permissions || [];
      const canViewAll = perms.includes('admin_panel') || perms.includes('view_all_reports') || perms.includes('view_all_tasks') || (currentUser.role && (currentUser.role === 'Manager' || currentUser.role.startsWith('Trưởng') || currentUser.role.includes('Trưởng')));

      let query = 'SELECT * FROM documents WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      // Phân quyền: Nhân viên thường chỉ được xem tài liệu của chính họ hoặc tài liệu thuộc Hợp đồng (contracts)
      if (!canViewAll) {
        query += ' AND (createdBy = ? OR category = \'contracts\')';
        params.push(currentUser.id);
      } else {
        // Admin/Manager có thể lọc theo bất cứ nhân viên nào
        const filterUser = req.query.createdBy as string | undefined;
        if (filterUser) {
          query += ' AND createdBy = ?';
          params.push(filterUser);
        }
      }

      // Lọc theo Category
      const filterCategory = req.query.category as string | undefined;
      if (filterCategory) {
        query += ' AND category = ?';
        params.push(filterCategory);
      }

      // Lọc theo thực thể liên kết (linkedId)
      const filterLinkedId = req.query.linkedId as string | undefined;
      if (filterLinkedId) {
        query += ' AND linkedId = ?';
        params.push(filterLinkedId);
      }

      // Tìm kiếm theo tên file
      const filterSearch = req.query.search as string | undefined;
      if (filterSearch && filterSearch.trim()) {
        query += ' AND name LIKE ?';
        params.push(`%${filterSearch.trim()}%`);
      }

      query += ' ORDER BY createdAt DESC';

      const documents = await db.all(query, params);
      res.json(documents);
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi server khi tải tài liệu', detail: e.message });
    }
  });

  // POST: Lưu thông tin tài liệu mới tải lên thành công
  router.post('/', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const { id, name, url, size, type, category, linkedId } = req.body;

      if (!name || !url || !category) {
        return res.status(400).json({ error: 'Tên, URL và phân loại tài liệu là bắt buộc' });
      }

      const docId = id || 'doc-' + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();

      await db.run(
        'INSERT INTO documents (id, name, url, size, type, category, linkedId, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [docId, name, url, Number(size) || 0, type || '', category, linkedId || null, currentUser.id, createdAt]
      );

      // Đồng bộ hóa real-time với bảng contracts nếu tài liệu thuộc hợp đồng
      if (category === 'contracts' && linkedId) {
        const docs = await db.all(
          'SELECT url FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
          [linkedId, 'contracts']
        );
        const urls = docs.map((d: any) => d.url);
        await db.run('UPDATE contracts SET attachments = ? WHERE id = ?', [JSON.stringify(urls), linkedId]);
      }

      // Đồng bộ hóa real-time với bảng reports nếu tài liệu thuộc báo cáo
      if (category === 'reports' && linkedId) {
        const report = await db.get('SELECT content FROM reports WHERE id = ?', [linkedId]);
        if (report && report.content) {
          try {
            const parsed = JSON.parse(report.content);
            const docs = await db.all(
              'SELECT name, url, size, type FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
              [linkedId, 'reports']
            );
            parsed.attachments = docs.map((d: any) => ({
              name: d.name,
              url: d.url,
              size: d.size,
              type: d.type
            }));
            await db.run('UPDATE reports SET content = ? WHERE id = ?', [JSON.stringify(parsed), linkedId]);
          } catch (err) {
            console.error('Lỗi đồng bộ tài liệu đính kèm báo cáo:', err);
          }
        }
      }

      res.status(201).json({ id: docId });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi server khi lưu thông tin tài liệu', detail: e.message });
    }
  });

  // PUT: Cập nhật metadata tài liệu (sửa tên, phân loại, liên kết)
  router.put('/:id', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const docId = req.params.id;
      const { name, category, linkedId } = req.body;

      const existingDoc = await db.get('SELECT createdBy FROM documents WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [docId]);
      if (!existingDoc) {
        return res.status(404).json({ error: 'Tài liệu không tồn tại' });
      }

      // Kiểm tra quyền: Chỉ chủ sở hữu tài liệu hoặc Admin/Manager mới được phép sửa
      const perms = currentUser.permissions || [];
      const isAdmin = perms.includes('admin_panel') || (currentUser.role && (currentUser.role === 'Manager' || currentUser.role.startsWith('Trưởng') || currentUser.role.includes('Trưởng')));
      if (existingDoc.createdBy !== currentUser.id && !isAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền sửa tài liệu này' });
      }

      await db.run(
        'UPDATE documents SET name = ?, category = ?, linkedId = ?, updatedAt = ? WHERE id = ?',
        [name, category, linkedId || null, new Date().toISOString(), docId]
      );

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi server khi cập nhật tài liệu', detail: e.message });
    }
  });

  // DELETE: Xóa tài liệu khỏi database và xóa tệp vật lý trên ổ đĩa
  router.delete('/:id', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const docId = req.params.id;

      const doc = await db.get('SELECT * FROM documents WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0)', [docId]);
      if (!doc) {
        return res.status(404).json({ error: 'Tài liệu không tồn tại' });
      }

      // Kiểm tra quyền: Chỉ chủ sở hữu tài liệu hoặc Admin/Manager mới được phép xóa
      const perms = currentUser.permissions || [];
      const isAdmin = perms.includes('admin_panel') || (currentUser.role && (currentUser.role === 'Manager' || currentUser.role.startsWith('Trưởng') || currentUser.role.includes('Trưởng')));
      if (doc.createdBy !== currentUser.id && !isAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa tài liệu này' });
      }

      // 1. Xóa tệp vật lý vật lý trên đĩa
      if (doc.url) {
        const absolutePath = path.join(__dirname, '../..', doc.url);
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (unlinkErr) {
            console.error('Lỗi khi xóa tệp vật lý khỏi đĩa:', unlinkErr);
          }
        }
      }

      // 2. Xóa bản ghi khỏi cơ sở dữ liệu
      await db.run('DELETE FROM documents WHERE id = ?', [docId]);

      // Đồng bộ hóa real-time với bảng contracts nếu tài liệu thuộc hợp đồng
      if (doc.category === 'contracts' && doc.linkedId) {
        const docs = await db.all(
          'SELECT url FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
          [doc.linkedId, 'contracts']
        );
        const urls = docs.map((d: any) => d.url);
        await db.run('UPDATE contracts SET attachments = ? WHERE id = ?', [JSON.stringify(urls), doc.linkedId]);
      }

      // Đồng bộ hóa real-time với bảng reports nếu tài liệu thuộc báo cáo
      if (doc.category === 'reports' && doc.linkedId) {
        const report = await db.get('SELECT content FROM reports WHERE id = ?', [doc.linkedId]);
        if (report && report.content) {
          try {
            const parsed = JSON.parse(report.content);
            const docs = await db.all(
              'SELECT name, url, size, type FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
              [doc.linkedId, 'reports']
            );
            if (docs && docs.length > 0) {
              parsed.attachments = docs.map((d: any) => ({
                name: d.name,
                url: d.url,
                size: d.size,
                type: d.type
              }));
            } else {
              delete parsed.attachments;
            }
            await db.run('UPDATE reports SET content = ? WHERE id = ?', [JSON.stringify(parsed), doc.linkedId]);
          } catch (err) {
            console.error('Lỗi đồng bộ tài liệu đính kèm báo cáo khi xóa:', err);
          }
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi server khi xóa tài liệu', detail: e.message });
    }
  });

  return router;
}
