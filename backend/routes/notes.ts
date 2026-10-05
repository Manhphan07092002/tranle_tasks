import { Router } from 'express';

export function noteRoutes(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const notes = await db.all('SELECT * FROM notes WHERE userId = ?', [req.user!.id]);
      res.json(notes);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, content, color, createdAt, reminderAt } = req.body;
    try {
      await db.run('INSERT INTO notes (id, title, content, color, createdAt, reminderAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, title, content, color, createdAt, reminderAt, req.user!.id]);
      res.json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, color, reminderAt } = req.body;
    try {
      const result = await db.run('UPDATE notes SET title = ?, content = ?, color = ?, reminderAt = ? WHERE id = ? AND userId = ?', [title, content, color, reminderAt, req.params.id, req.user!.id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
      await db.run("DELETE FROM notifications WHERE relatedId = ? AND type = 'note_reminder'", [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const result = await db.run('DELETE FROM notes WHERE id = ? AND userId = ?', [req.params.id, req.user!.id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
