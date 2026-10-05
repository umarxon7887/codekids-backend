import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
dotenv.config();

import { router as authRouter } from './routes/auth.js';
import { router as contentsRouter } from './routes/contents.js';
import { router as typingRouter } from './routes/typing.js';
import { router as labyrinthRouter } from './routes/labyrinth.js';
import { router as roomsRouter } from './routes/rooms.js';
import { router as teacherRouter } from './routes/teacher.js';
import { initSocket } from './socket.js';

// Xavfsizlik middleware'larini import qilish
import { applySecurity, authLimiter } from './middleware/security.js';

const app = express();

// 1. Xavfsizlikni qo'llash (Helmet, Trust Proxy)
applySecurity(app);

// 2. CORS va JSON
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*' }));
app.use(express.json({ limit: '100kb' })); // XSS va katta payload'lardan himoya

// 3. Health check
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'CodeKids API', version: '1.0.0' }));

// 4. Routes (Auth uchun rate limiter qo'shildi)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/contents', contentsRouter);
app.use('/api/typing', typingRouter);
app.use('/api/labyrinth', labyrinthRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/teacher', teacherRouter);

// 5. Swagger Docs
const spec = {
  openapi: '3.0.0',
  info: { title: 'CodeKids API', version: '1.0.0', description: 'Bolalar platformasi backend API' },
  servers: [
    { url: 'https://codekids-backend-5asm.onrender.com', description: 'Render Server' },
    { url: 'http://localhost:4000', description: 'Local Server' }
  ],
  paths: {
    '/api/auth/register': { post: { summary: 'Register', tags: ['Auth'] } },
    '/api/auth/login': { post: { summary: 'Login', tags: ['Auth'] } },
    '/api/contents': { get: { summary: 'Feed', tags: ['Contents'] }, post: { summary: 'Create', tags: ['Contents'] } },
    '/api/contents/search': { get: { summary: 'Search', tags: ['Contents'] } },
    '/api/typing/results': { post: { summary: 'Typing result (Anti-cheat)', tags: ['Typing'] } }
  }
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));

// 6. Socket.io
const server = http.createServer(app);
initSocket(server);

// 7. Port va Graceful Shutdown
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`✅ CodeKids backend running securely on port ${PORT}`));

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
