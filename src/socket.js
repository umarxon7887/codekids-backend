import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export function initSocket(httpServer) {
  const io = new Server(httpServer, { 
    cors: { 
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*', 
      methods: ["GET", "POST"] 
    } 
  });
  
  // 1. Socket Authentifikatsiyasi
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const deviceId = socket.handshake.auth?.deviceId;
    
    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
      } catch (err) {
        return next(new Error('UNAUTHORIZED: Invalid token'));
      }
    }
    
    // Guest foydalanuvchilar uchun
    if (deviceId) {
      socket.user = { id: `guest_${deviceId}`, role: 'guest', nickname: 'Mehmon' };
      return next();
    }
    
    next(new Error('UNAUTHORIZED: Token yoki deviceId talab qilinadi'));
  });

  // 2. Per-Socket Throttling (Sekundiga 15 ta event dan ko'p yubora olmaydi)
  const throttleMap = new Map();
  const checkThrottle = (socketId) => {
    let count = throttleMap.get(socketId) || 0;
    if (count >= 15) return false;
    throttleMap.set(socketId, count + 1);
    return true;
  };

  setInterval(() => throttleMap.clear(), 1000); // Har soniyada reset

  io.on('connection', (socket) => {
    console.log(`🔌 Ulandi: ${socket.user.nickname || socket.user.id}`);

    // Labirintga qo'shilish
    socket.on('labyrinth:join', async ({ code, deviceId }, ack) => {
      // Validatsiya
      const schema = z.object({ code: z.string().length(4), deviceId: z.string() });
      const valid = schema.safeParse({ code, deviceId });
      if (!valid.success) return ack?.({ error: { code: 'BAD_PAYLOAD' } });

      // Xonani tekshirish
      const roomRes = await (await import('./db.js')).q('SELECT * FROM labyrinth_rooms WHERE code = $1', [code]);
      if (!roomRes.rows.length) return ack?.({ error: { code: 'ROOM_NOT_FOUND' } });
      
      const room = roomRes.rows[0];
      if (room.status === 'finished') return ack?.({ error: { code: 'ROOM_FINISHED' } });

      socket.join(`labyrinth:${code}`);
      socket.data.roomCode = code;
      socket.data.deviceId = deviceId;

      // Frontendga labirintni yuborish (seed orqali)
      const { generateMaze } = await import('./utils/mazeGenerator.js');
      const size = room.level === 'easy' ? 5 : room.level === 'medium' ? 7 : 10;
      const maze = generateMaze(room.labyrinth_seed, size);

      ack?.({ ok: true, maze, serverTime: Date.now() });
      
      // Xonadagilarga xabar berish
      const players = await (await import('./db.js')).q(
        'SELECT nickname, position_x, position_y, lives, score, finished FROM labyrinth_players WHERE room_id = $1', 
        [room.id]
      );
      io.to(`labyrinth:${code}`).emit('labyrinth:players', players.rows);
    });

    // Harakat (Throttle bilan himoyalangan)
    socket.on('labyrinth:move', async ({ code, x, y }) => {
      if (!checkThrottle(socket.id)) return; // Spam bo'lsa, e'tiborsiz qoldirish

      const db = await import('./db.js');
      const roomRes = await db.q('SELECT id FROM labyrinth_rooms WHERE code = $1', [code]);
      if (!roomRes.rows.length) return;

      // Pozitsiyani yangilash
      await db.q(
        'UPDATE labyrinth_players SET position_x = $1, position_y = $2 WHERE room_id = $3 AND device = $4',
        [x, y, roomRes.rows[0].id, socket.data.deviceId]
      );

      // Faqat shu xonadagilarga yuborish (volatile: paket yo'qolsa ham server qotmaydi)
      io.to(`labyrinth:${code}`).volatile.emit('labyrinth:players_update', { 
        deviceId: socket.data.deviceId, x, y 
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Uzildi: ${socket.user.nickname || socket.user.id}`);
    });
  });
  
  return io;
}
