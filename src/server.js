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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'CodeKids API', version: '1.0.0' }));
app.use('/api/auth', authRouter);
app.use('/api/contents', contentsRouter);
app.use('/api/typing', typingRouter);
app.use('/api/labyrinth', labyrinthRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/teacher', teacherRouter);

const spec = {
  openapi: '3.0.0',
  info: { title: 'CodeKids API', version: '1.0.0', description: 'Bolalar platformasi backend API' },
  servers: [
    { url: 'https://codekids-backend-5asm.onrender.com', description: 'Render Server' },
    { url: 'http://localhost:4000', description: 'Local Server' }
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Ro\'yxatdan o\'tish',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nickname', 'email', 'password', 'role'],
                properties: {
                  nickname: { type: 'string', example: 'TestStudent' },
                  email: { type: 'string', example: 'test@codekids.uz' },
                  password: { type: 'string', example: '123456' },
                  role: { type: 'string', enum: ['student', 'teacher'], example: 'student' },
                  teacherProfile: {
                    type: 'object',
                    properties: {
                      full_name: { type: 'string', example: 'Ali Valiyev' },
                      school: { type: 'string', example: 'Maktab 1' },
                      subjects: { type: 'array', items: { type: 'string' }, example: ['matematik', 'fizika'] },
                      experience_years: { type: 'integer', example: 5 },
                      age_group: { type: 'string', example: '9-11' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Muvaffaqiyatli' }, '400': { description: 'Xato' }, '409': { description: 'Band' } }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'test@codekids.uz' },
                  password: { type: 'string', example: '123456' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Muvaffaqiyatli' }, '401': { description: 'Noto\'g\'ri' } }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'O\'z profilingiz',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profil' }, '401': { description: 'Token yo\'q' } }
      }
    },
    '/api/contents': {
      get: {
        summary: 'Lenta',
        tags: ['Contents'],
        parameters: [
          { name: 'filter', in: 'query', schema: { type: 'string', enum: ['recent', 'popular', 'top'] } },
          { name: 'topic', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: { '200': { description: 'Kontentlar ro\'yxati' } }
      },
      post: {
        summary: 'Kontent yaratish',
        tags: ['Contents'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'title', 'topic', 'data'],
                properties: {
                  type: { type: 'string', enum: ['questions', 'typing_text'], example: 'questions' },
                  title: { type: 'string', example: 'Matematik viktorina' },
                  description: { type: 'string', example: '1-sinf uchun' },
                  topic: { type: 'string', example: 'matematik' },
                  level: { type: 'integer', example: 1 },
                  data: { type: 'object', example: { questions: [] } },
                  is_published: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Yaratildi' }, '400': { description: 'Xato' } }
      }
    },
    '/api/contents/search': {
      get: {
        summary: 'Qidiruv',
        tags: ['Contents'],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'topic', in: 'query', schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Natijalar' } }
      }
    },
    '/api/contents/{id}': {
      get: { summary: 'Bitta kontent', tags: ['Contents'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Kontent' }, '404': { description: 'Topilmadi' } } },
      put: { summary: 'Tahrirlash', tags: ['Contents'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, topic: { type: 'string' }, level: { type: 'integer' }, data: { type: 'object' } } } } } }, responses: { '200': { description: 'Tahrirlandi' } } },
      delete: { summary: 'O\'chirish', tags: ['Contents'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'O\'chirildi' } } }
    },
    '/api/contents/{id}/like': {
      post: { summary: 'Layk bosish', tags: ['Contents'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Layk bosildi' } } },
      delete: { summary: 'Laykni olish', tags: ['Contents'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Layk olindi' } } }
    },
    '/api/typing/texts/random': {
      get: {
        summary: 'Random matn',
        tags: ['Typing'],
        parameters: [
          { name: 'language', in: 'query', schema: { type: 'string', enum: ['uz', 'ru', 'en'], default: 'uz' } },
          { name: 'level', in: 'query', schema: { type: 'string', enum: ['easy', 'medium', 'hard'], default: 'medium' } }
        ],
        responses: { '200': { description: 'Matn' } }
      }
    },
    '/api/typing/results': {
      post: {
        summary: 'Typing natijasi',
        tags: ['Typing'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['game_mode', 'language', 'level', 'wpm', 'accuracy', 'time_sec'],
                properties: {
                  game_mode: { type: 'string', enum: ['solo', 'group'], example: 'solo' },
                  language: { type: 'string', example: 'uz' },
                  level: { type: 'string', example: 'medium' },
                  wpm: { type: 'integer', example: 32 },
                  accuracy: { type: 'number', example: 94.5 },
                  time_sec: { type: 'number', example: 28.5 },
                  text_length: { type: 'integer', example: 150 },
                  place: { type: 'integer', example: 1 },
                  room_code: { type: 'string', example: '7341' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Saqlandi' } }
      }
    },
    '/api/typing/best': {
      get: { summary: 'Eng yaxshi natija', tags: ['Typing'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Natijalar' } } }
    },
    '/api/labyrinth/rooms': {
      post: {
        summary: 'Labirint xonasi yaratish',
        tags: ['Labirint'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['level'],
                properties: {
                  level: { type: 'string', enum: ['easy', 'medium', 'hard'], example: 'medium' },
                  topic: { type: 'string', example: 'matematik' },
                  duration_minutes: { type: 'integer', example: 5 }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Xona yaratildi' } }
      }
    },
    '/api/labyrinth/rooms/{code}/join': {
      post: {
        summary: 'Labirintga qo\'shilish',
        tags: ['Labirint'],
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nickname', 'device'],
                properties: {
                  nickname: { type: 'string', example: 'Ali' },
                  device: { type: 'string', example: 'dev-abc123' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Qo\'shildi' } }
      }
    },
    '/api/rooms': {
      post: {
        summary: 'Xona yaratish',
        tags: ['Rooms'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['game_type'],
                properties: {
                  game_type: { type: 'string', example: 'typing' },
                  topic: { type: 'string', example: 'matematik' },
                  level: { type: 'integer', example: 1 },
                  duration_minutes: { type: 'integer', example: 40 }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Xona yaratildi' } }
      }
    },
    '/api/rooms/{code}/join': {
      post: {
        summary: 'Xonaga qo\'shilish',
        tags: ['Rooms'],
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nickname', 'device'],
                properties: {
                  nickname: { type: 'string', example: 'Ali' },
                  device: { type: 'string', example: 'dev-abc123' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Qo\'shildi' } }
      }
    },
    '/api/teacher/classes': {
      get: { summary: 'Sinflar', tags: ['Teacher'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Sinflar' } } },
      post: {
        summary: 'Sinf yaratish',
        tags: ['Teacher'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: '3-A sinf' },
                  description: { type: 'string', example: 'Matematika sinfi' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Yaratildi' } }
      }
    },
    '/api/teacher/stats': {
      get: { summary: 'Statistika', tags: ['Teacher'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Statistika' } } }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ CodeKids backend: http://localhost:${PORT} | API docs: /api/docs`));
