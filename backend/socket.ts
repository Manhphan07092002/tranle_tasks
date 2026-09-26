import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  // P1: cùng lý do như CORS ở server.ts — chỉ cho origin khai báo, mặc định cùng-origin.
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Client emits 'join' with { userId, token } to receive private notifications.
    // P1: verify JWT and only join the room matching the verified identity —
    // otherwise any client could listen to another user's notifications.
    socket.on('join', (payload: string | { userId?: string; token?: string }) => {
      try {
        const token = typeof payload === 'string' ? undefined : payload?.token;
        const secret = process.env.JWT_SECRET;
        if (!token || !secret) {
          socket.emit('join_error', { error: 'Missing auth token' });
          return;
        }
        const decoded = jwt.verify(token, secret) as { id?: string };
        if (!decoded?.id) {
          socket.emit('join_error', { error: 'Invalid token' });
          return;
        }
        const requestedId = typeof payload === 'string' ? payload : payload?.userId;
        if (requestedId && requestedId !== decoded.id) {
          socket.emit('join_error', { error: 'User mismatch' });
          return;
        }
        socket.join(decoded.id);
        console.log(`[Socket.IO] Socket ${socket.id} joined room ${decoded.id}`);
      } catch {
        socket.emit('join_error', { error: 'Invalid or expired token' });
      }
    });

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
