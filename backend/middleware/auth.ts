import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

let _authDb: any = null;

export function setAuthDb(db: any) {
  _authDb = db;
}

/** Minimal cookie parser (avoids an extra dependency). Only name=value pairs. */
export function cookiesMiddleware(req: any, _res: any, next: any) {
  const header = req.headers?.cookie;
  const cookies: Record<string, string> = {};
  if (typeof header === 'string') {
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx <= 0) continue;
      const name = part.slice(0, idx).trim();
      if (!name) continue;
      try {
        cookies[name] = decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        cookies[name] = part.slice(idx + 1).trim();
      }
    }
  }
  req.cookies = cookies;
  next();
}

export function getBearerToken(req: { headers?: any }): string | null {
  const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const secret = process.env.JWT_SECRET as string;
  if (!secret) {
    console.error('[Auth] JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    // Fail-closed freshness check: revoked/locked/deleted/role-changed tokens stop working.
    if (_authDb && payload?.id) {
      try {
        const row = await _authDb.get('SELECT id, role, isLocked, lockedUntil FROM users WHERE id = ?', [payload.id]);
        if (!row) return res.status(401).json({ error: 'Unauthorized: account no longer exists' });
        if (row.isLocked) return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa.' });
        if (row.lockedUntil && new Date(row.lockedUntil).getTime() > Date.now()) {
          return res.status(403).json({ error: 'Tài khoản đang tạm khóa. Vui lòng thử lại sau.' });
        }
        // Refresh role from DB so demotion takes effect immediately.
        // Permissions in the token may be stale — routes needing fresh perms must re-query roles table.
        (payload as JwtPayload).role = row.role || (payload as JwtPayload).role;
      } catch (dbErr) {
        console.error('[Auth] DB freshness check failed:', (dbErr as Error).message);
        return res.status(500).json({ error: 'Auth check failed' });
      }
    }
    req.user = payload;
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Prefer fresh DB role over (possibly stale) JWT claim.
  if (_authDb && req.user?.id) {
    try {
      const row = await _authDb.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
      if (row?.role && row.role !== req.user.role) req.user.role = row.role;
    } catch { /* fall through to JWT claim check */ }
  }
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
  next();
}
