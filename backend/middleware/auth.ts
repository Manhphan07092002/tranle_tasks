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

