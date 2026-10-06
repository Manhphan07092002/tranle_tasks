import { Router } from 'express';
import { randomUUID } from 'crypto';

export function meetingRoutes(db: any) {
  const router = Router();

  const isMeetingAdmin = (user: any, m: any) =>
    user?.role === 'Admin'
    || (user?.permissions || []).includes('admin_panel')
    || m.hostId === user?.id;

  async function isParticipant(meetingId: string, userId: string) {
    if (!userId) return false;
    const part = await db.get('SELECT userId FROM meeting_participants WHERE meetingId = ? AND userId = ?', [meetingId, userId]);
    return Boolean(part);
  }

  /**
   * meetingLink doubles as the join credential: whoever holds it walks into the
   * call. Returning it in the list let any authenticated employee harvest the
   * join code for every meeting in the company. Hide it unless the caller already
   * has a legitimate claim on the room, or just proved it by presenting the code.
   */
  async function buildMeeting(m: any, viewer: any, revealLink = false) {
    const parts = await db.all('SELECT userId FROM meeting_participants WHERE meetingId = ?', [m.id]);
    const ids = parts.map((p: any) => p.userId);
    const maySeeLink = revealLink || isMeetingAdmin(viewer, m) || ids.includes(viewer?.id);
    return { ...m, participants: ids, meetingLink: maySeeLink ? (m.meetingLink ?? null) : null };
  }

  async function saveParticipants(meetingId: string, participants: string[]) {
    await db.run('DELETE FROM meeting_participants WHERE meetingId = ?', [meetingId]);
    for (const userId of participants) {
      await db.run('INSERT INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [meetingId, userId]);
    }
  }

  router.get('/', async (req, res) => {
    try {
      const meetings = await db.all('SELECT * FROM meetings ORDER BY startTime DESC LIMIT 500');
      res.json(await Promise.all(meetings.map((m: any) => buildMeeting(m, (req as any).user))));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  /**
   * Resolve a join code without exposing the code of every other room. The UI used
   * to search the whole list for meetingLink.includes(code), which is exactly the
   * enumeration this endpoint replaces. Callers still join via PUT /:id/join.
   */
  router.get('/by-code/:code', async (req, res) => {
    try {
      const code = String(req.params.code || '').trim();
      // Short codes would match almost anything; the app only ever issues ids and
      // 12-char slugs, so a minimum keeps this from becoming a search primitive.
      if (code.length < 6) return res.status(400).json({ error: 'Mã cuộc họp không hợp lệ' });
      const m = await db.get(
        'SELECT * FROM meetings WHERE id = ? OR meetingLink LIKE ? ORDER BY startTime DESC LIMIT 1',
        [code, `%${code}%`],
      );
      if (!m) return res.status(404).json({ error: 'Không tìm thấy cuộc họp' });
      res.json(await buildMeeting(m, (req as any).user, true));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const m = await db.get('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.json(await buildMeeting(m, (req as any).user));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, description, startTime, endTime, meetingLink, status, participants } = req.body;
    // Identity comes from the verified JWT — never trust hostId from the client.
    const hostId = (req as any).user?.id;
    if (!hostId) return res.status(401).json({ error: 'Unauthorized' });
    if (!title || !startTime || !endTime) return res.status(400).json({ error: 'Thiếu tiêu đề/thời gian họp' });
    const meetingId = id || randomUUID();
    // Validate participants exist + are strings; cap size to avoid abuse.
    const cleanParticipants = Array.isArray(participants)
      ? [...new Set(participants.filter((p: any) => typeof p === 'string' && p.length <= 191))].slice(0, 200)
      : [];
    try {
      await db.run(
        'INSERT INTO meetings (id, title, description, hostId, startTime, endTime, meetingLink, status, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [meetingId, title, description ?? null, hostId, startTime, endTime, meetingLink, status, '[]'],
      );
      await saveParticipants(meetingId, cleanParticipants);
      res.status(201).json({ id: meetingId });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  async function canWriteMeeting(req: any, meetingId: string): Promise<{ ok: boolean; meeting?: any }> {
    const m = await db.get('SELECT * FROM meetings WHERE id = ?', [meetingId]);
    if (!m) return { ok: false };
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';
    if (isAdmin || m.hostId === userId) return { ok: true, meeting: m };
    const part = await db.get('SELECT userId FROM meeting_participants WHERE meetingId = ? AND userId = ?', [meetingId, userId]);
    if (part) return { ok: true, meeting: m };
    return { ok: false };
  }

  router.put('/:id', async (req, res) => {
    try {
      const { title, description, status, participants, startTime, endTime } = req.body;
      const gate = await canWriteMeeting(req, req.params.id);
      if (!gate.ok) return res.status(403).json({ error: 'Bạn không có quyền sửa cuộc họp này' });
      await db.run(
        'UPDATE meetings SET title=?, description=?, status=?, startTime=?, endTime=? WHERE id=?',
        [title, description ?? null, status, startTime, endTime, req.params.id],
      );
      if (Array.isArray(participants)) {
        const clean = [...new Set(participants.filter((p: any) => typeof p === 'string' && p.length <= 191))].slice(0, 200);
        // Only host/admin may rewrite the participant list.
        const m = gate.meeting;
        const isHost = m.hostId === (req as any).user?.id || (req as any).user?.role === 'Admin';
        if (!isHost) return res.status(403).json({ error: 'Chỉ chủ trì mới được sửa danh sách tham gia' });
        await saveParticipants(req.params.id, clean);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic join — identity from JWT, no userId spoofing.
  router.put('/:id/join', async (req, res) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const m = await db.get('SELECT id FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      await db.run('INSERT IGNORE INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [req.params.id, userId]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic leave — users can only remove themselves (host/admin may remove others via PUT).
  router.put('/:id/leave', async (req, res) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await db.run('DELETE FROM meeting_participants WHERE meetingId = ? AND userId = ?', [req.params.id, userId]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const m = await db.get('SELECT hostId FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      if (m.hostId !== (req as any).user?.id && (req as any).user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Chỉ chủ trì hoặc Admin mới được xóa cuộc họp' });
      }
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
      // Signals carry whiteboard strokes, chat and live cursors — they describe the
      // meeting itself, so only people in the room may read or write them.
      const m = await db.get('SELECT id, hostId FROM meetings WHERE id = ?', [req.params.meetingId]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      const user = (req as any).user;
      if (!isMeetingAdmin(user, m) && !(await isParticipant(req.params.meetingId, user?.id))) {
        return res.status(403).json({ error: 'Bạn không phải thành viên của cuộc họp này' });
      }
      const signals = await db.all(
        'SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC',
        [req.params.meetingId, since || 0],
      );
      res.json(signals.map((s: any) => ({ ...s, data: JSON.parse(s.data) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:meetingId/signals', async (req, res) => {
    const { id, to, type, data } = req.body;
    // Sender identity comes from JWT to prevent spoofing.
    const from = (req as any).user?.id;
    if (!from) return res.status(401).json({ error: 'Unauthorized' });
    try {
      // Same membership gate as the read path: otherwise anyone could inject
      // strokes/chat into a meeting they are not part of.
      const m = await db.get('SELECT id, hostId FROM meetings WHERE id = ?', [req.params.meetingId]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      const user = (req as any).user;
      if (!isMeetingAdmin(user, m) && !(await isParticipant(req.params.meetingId, from))) {
        return res.status(403).json({ error: 'Bạn không phải thành viên của cuộc họp này' });
      }
      const timestamp = Date.now();
      const signalId = id || randomUUID();
      await db.run(
        'INSERT INTO signals (id, meetingId, `from`, `to`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [signalId, req.params.meetingId, from, to, type, JSON.stringify(data), timestamp],
      );
      // Used to echo back the client's id, which is null whenever the server
      // generated one — so clients could never address their own signal.
      res.status(201).json({ id: signalId, timestamp });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
