import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/reports');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx']);

export function getManagedUploadPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(/^\/(?:api\/upload|uploads\/reports)\/([a-f0-9]{24}\.(?:jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx))$/i);
  if (!match) return null;
  const filePath = path.resolve(UPLOADS_DIR, match[1]);
  return filePath.startsWith(`${UPLOADS_DIR}${path.sep}`) ? filePath : null;
}

export function uploadRoutes() {
  const router = Router();

  const uploadsDir = UPLOADS_DIR;
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomBytes(12).toString('hex');
      cb(null, `${name}${ext}`);
    },
  });

  // P1: mimetype do client khai báo (spoof được) nên phải check cả extension + magic bytes.
  const ALLOWED_MIME = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  function isManagedFileName(filename: string) {
    const ext = path.extname(filename).toLowerCase();
    return /^[a-f0-9]{24}$/i.test(path.basename(filename, ext)) && ALLOWED_EXTENSIONS.has(ext);
  }

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
        return cb(null, false);
      }
      cb(null, true);
    },
  });

  // Magic-byte signatures per mimetype (đọc từ nội dung file thật, không tin client).
  function hasValidSignature(mimetype: string, header: Buffer): boolean {
    const sig = (hex: string) => header.subarray(0, hex.length / 2).toString('hex').toLowerCase() === hex.toLowerCase();
    switch (mimetype) {
      case 'image/jpeg': return sig('ffd8ff');
      case 'image/png': return sig('89504e47');
      case 'image/gif': return sig('47494638');
      case 'image/webp': return header.length >= 12 && header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP';
      case 'application/pdf': return sig('25504446');
      case 'application/msword': return sig('d0cf11e0');
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        // OOXML = ZIP container; legacy .xls = OLE container
        return sig('504b0304') || sig('d0cf11e0');
      default: return false;
    }
  }

  // Upload multiple files (max 5)
  router.post('/', upload.array('files', 5), (req: any, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    // Verify magic bytes của từng file đã lưu; xóa toàn bộ nếu có file giả mạo.
    try {
      for (const f of req.files as any[]) {
        const fd = fs.openSync(f.path, 'r');
        const header = Buffer.alloc(12);
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);
        if (!hasValidSignature(f.mimetype, header)) {
          for (const d of req.files as any[]) {
            try { fs.unlinkSync(d.path); } catch { /* ignore */ }
          }
          return res.status(400).json({ error: 'File không hợp lệ (nội dung không khớp định dạng cho phép)' });
        }
      }
    } catch {
      return res.status(400).json({ error: 'Không thể kiểm tra file tải lên' });
    }
    const files = req.files.map((f: any) => ({
      name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
      url: `/api/upload/${f.filename}`,
      size: f.size,
      type: f.mimetype,
    }));
    res.json({ files });
  });

  router.get('/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!isManagedFileName(filename)) {
      return res.status(400).json({ error: 'Tên tệp không hợp lệ' });
    }

    const filePath = getManagedUploadPath(`/api/upload/${filename}`);
    if (!filePath) return res.status(400).json({ error: 'Tên tệp không hợp lệ' });
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Không tìm thấy tệp' });
    }
    return res.download(filePath, filename);
  });

  return router;
}
