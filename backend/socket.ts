import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './middleware/auth.js';

let io: SocketIOServer;
let _socketDb: any = null;

export const setSocketDb = (db: any) => {
  _socketDb = db;
};

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    // The short-lived access token is memory-held on the client and sent here.
    // (The httpOnly refresh cookie is only for /api/auth/refresh, never sockets.)
    const fromAuth = socket.handshake.auth?.token;
    const token = typeof fromAuth === 'string' && fromAuth ? fromAuth : null;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) {
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      // Same freshness check as HTTP requireAuth: locked/deleted/demoted tokens die here too.
      if (_socketDb && payload?.id) {
        try {
          const row = await _socketDb.get('SELECT id, role, isLocked, lockedUntil FROM users WHERE id = ?', [payload.id]);
          if (!row) return next(new Error('Unauthorized'));
          if (row.isLocked) return next(new Error('Unauthorized'));
          if (row.lockedUntil && new Date(row.lockedUntil).getTime() > Date.now()) return next(new Error('Unauthorized'));
          payload.role = row.role || payload.role;
        } catch {
          return next(new Error('Unauthorized'));
        }
      }
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    const user = socket.data.user as JwtPayload;
    socket.join(user.id);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};
