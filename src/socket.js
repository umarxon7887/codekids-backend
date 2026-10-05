import { Server } from 'socket.io';
export function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log('🔌 Yangi ulanish:', socket.id);
  });
  return io;
}
