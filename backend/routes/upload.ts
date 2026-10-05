import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function uploadRoutes() {
  const router = Router();

  // Extension allowlist — no .html/.svg/.php/.js ever lands on disk with an executable ext.
  const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx']);
  const uploadsDir = path.join(__dirname, '../../uploads/reports');  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const rawExt = path.extname(file.originalname).toLowerCase();
      // Never trust client ext: map to a safe allowlisted extension, default .bin.
      const ext = ALLOWED_EXT.has(rawExt) ? (rawExt === '.jpeg' ? '.jpg' : rawExt) : '.bin';
      const name = crypto.randomBytes(12).toString('hex');
      cb(null, `${name}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const allowedMime = new Set([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ]);
      const ext = path.extname(file.originalname).toLowerCase();
      // Both extension AND mimetype must be allowlisted (mimetype alone is client-spoofable).
      if (!ALLOWED_EXT.has(ext) || !allowedMime.has(file.mimetype)) return cb(null, false);
      cb(null, true);
    },
  });

  // Upload multiple files (max 5)
  router.post('/', upload.array('files', 5), (req: any, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const files = req.files.map((f: any) => ({
      name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
      url: `/uploads/reports/${f.filename}`,
      size: f.size,
      type: f.mimetype,
    }));
    res.json({ files });
  });

  return router;
}
