import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  departmentId?: string;
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`[Auth] Missing token for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET as string;

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (e: any) {
    console.error(`[Auth] Invalid token for ${req.method} ${req.originalUrl}:`, e.message);
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Yêu cầu quyền quản trị viên (Admin)' });
  }
  next();
}

// DB-backed check lets locks, password resets, and role changes revoke already-issued JWTs.
export function requireActiveSession(db: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, async () => {
      try {
        const user = await db.get('SELECT id, isLocked, sessionVersion FROM users WHERE id = ?', [req.user!.id]);
        if (!user || user.isLocked || Number(user.sessionVersion || 0) !== Number((req.user as any).sessionVersion || 0)) {
          return res.status(401).json({ error: 'Unauthorized: session is no longer active' });
        }
        next();
      } catch {
        res.status(503).json({ error: 'Authentication service unavailable' });
      }
    });
  };
}

export function isGlobalManager(user?: JwtPayload) {
  return user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Giám Đốc';
}

export function isDepartmentManager(user?: JwtPayload) {
  return isGlobalManager(user) || user?.role === 'Manager' || user?.role === 'Trưởng Phòng' || user?.role === 'Phó Phòng';
}

export function canManageDepartment(user: JwtPayload | undefined, departmentId: string) {
  if (isGlobalManager(user)) return true;
  if (!isDepartmentManager(user)) return false;
  // Older tokens have only the legacy department field. New tokens carry departmentId.
  const aliases: Record<string, string> = {
    'dept-finance': 'dept-fin', 'dept-marketing': 'dept-mkt',
    'dept-procurement': 'dept-proc', 'dept-warehouse': 'dept-wh',
  };
  const canonicalDepartmentId = aliases[departmentId] || departmentId;
  return user?.departmentId === canonicalDepartmentId || user?.department === canonicalDepartmentId;
}

export function requireDepartmentManager(paramName = 'departmentId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawDepartmentId = req.params[paramName];
    const departmentId = Array.isArray(rawDepartmentId) ? rawDepartmentId[0] : rawDepartmentId;
    if (!canManageDepartment(req.user, departmentId)) {
      return res.status(403).json({ error: 'Forbidden: Bạn chỉ được quản lý dữ liệu của phòng ban mình' });
    }
    next();
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Vui lòng đăng nhập' });
    }
    // Admin always has bypass access
    if (req.user.role === 'Admin') {
      return next();
    }
    // Check if role is in allowed list
    const hasRole = allowedRoles.some(r => 
      r.toLowerCase() === req.user?.role?.toLowerCase() ||
      (r === 'Manager' && (req.user?.role === 'Trưởng Phòng' || req.user?.role === 'Phó Phòng')) ||
      (r === 'Director' && req.user?.role === 'Giám Đốc')
    );
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden: Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Vui lòng đăng nhập' });
    }
    if (req.user.role === 'Admin') {
      return next();
    }
    const userPerms = req.user.permissions || [];
    const hasAll = requiredPermissions.every(p => userPerms.includes(p));
    if (!hasAll) {
      return res.status(403).json({ error: 'Forbidden: Tài khoản thiếu quyền hạn yêu cầu' });
    }
    next();
  };
}

