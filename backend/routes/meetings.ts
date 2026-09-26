import { Router } from 'express';
import { randomUUID } from 'crypto';

export function meetingRoutes(db: any) {
  const router = Router();

  const isAdmin = (req: any) => req.user?.role === 'Admin';

  async function canAccessMeeting(req: any, meeting: any) {
    if (isAdmin(req) || meeting.hostId === req.user?.id) return true;
    return Boolean(await db.get('SELECT 1 FROM meeting_participants WHERE meetingId = ? AND userId = ?', [meeting.id, req.user?.id]));
  }

  async function findAccessibleMeeting(req: any, res: any) {
    const meeting = await db.get('SELECT * FROM meetings WHERE id = ?', [req.params.id || req.params.meetingId]);
    if (!meeting) {
      res.status(404).json({ error: 'Not found' });
      return null;
    }
    if (!(await canAccessMeeting(req, meeting))) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return meeting;
  }

  async function buildMeeting(m: any) {
    const parts = await db.all('SELECT userId FROM meeting_participants WHERE meetingId = ?', [m.id]);
    return { ...m, participants: parts.map((p: any) => p.userId) };
  }

  async function saveParticipants(meetingId: string, participants: string[]) {
    await db.run('DELETE FROM meeting_participants WHERE meetingId = ?', [meetingId]);
    for (const userId of participants) {
      await db.run('INSERT INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [meetingId, userId]);
    }
  }

  router.get('/', async (req, res) => {
    try {
      const meetings = isAdmin(req)
        ? await db.all('SELECT * FROM meetings')
        : await db.all('SELECT * FROM meetings WHERE hostId = ? OR id IN (SELECT meetingId FROM meeting_participants WHERE userId = ?)', [req.user!.id, req.user!.id]);
      res.json(await Promise.all(meetings.map(buildMeeting)));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const m = await db.get('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      if (!(await canAccessMeeting(req, m))) return res.status(403).json({ error: 'Forbidden' });
      res.json(await buildMeeting(m));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, description, startTime, endTime, meetingLink, status, participants } = req.body;
    const meetingId = id || randomUUID();
    try {
      await db.run(
        'INSERT INTO meetings (id, title, description, hostId, startTime, endTime, meetingLink, status, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [meetingId, title, description ?? null, req.user!.id, startTime, endTime, meetingLink, status, '[]'],
      );
      await saveParticipants(meetingId, Array.from(new Set([req.user!.id, ...(Array.isArray(participants) ? participants : [])])));
      res.status(201).json({ id: meetingId });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      const meeting = await findAccessibleMeeting(req, res);
      if (!meeting) return;
      if (!isAdmin(req) && meeting.hostId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run(
        'UPDATE meetings SET title=?, description=?, status=?, startTime=?, endTime=? WHERE id=?',
        [title, description ?? null, status, startTime, endTime, req.params.id],
      );
      if (Array.isArray(participants)) {
        await saveParticipants(req.params.id, participants);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic join — no more read-modify-write on JSON
  router.put('/:id/join', async (req, res) => {
    try {
      const meeting = await db.get('SELECT id FROM meetings WHERE id = ?', [req.params.id]);
      if (!meeting) return res.status(404).json({ error: 'Not found' });
      await db.run('INSERT IGNORE INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [req.params.id, req.user!.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic leave
  router.put('/:id/leave', async (req, res) => {
    try {
      await db.run('DELETE FROM meeting_participants WHERE meetingId = ? AND userId = ?', [req.params.id, req.user!.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const meeting = await db.get('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!meeting) return res.status(404).json({ error: 'Not found' });
      if (!isAdmin(req) && meeting.hostId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
      await db.run('DELETE FROM meeting_participants WHERE meetingId = ?', [req.params.id]);
      await db.run('DELETE FROM signals WHERE meetingId = ?', [req.params.id]);
      await db.run('DELETE FROM meetings WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Signals
  router.get('/:meetingId/signals', async (req, res) => {
    const { since } = req.query;
    try {
      const meeting = await findAccessibleMeeting(req, res);
      if (!meeting) return;
      const signals = await db.all(
        'SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC',
        [req.params.meetingId, since || 0],
      );
      res.json(signals.map((s: any) => ({ ...s, data: JSON.parse(s.data) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:meetingId/signals', async (req, res) => {
    const { id, to, type, data } = req.body;
    try {
      const meeting = await findAccessibleMeeting(req, res);
      if (!meeting) return;
      const timestamp = Date.now();
      await db.run(
        'INSERT INTO signals (id, meetingId, `from`, `to`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id || randomUUID(), req.params.meetingId, req.user!.id, to, type, JSON.stringify(data), timestamp],
      );
      res.status(201).json({ id, timestamp });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
