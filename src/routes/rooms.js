import { Router } from 'express';
import { q } from '../db.js';
import { auth, optionalAuth } from '../middleware.js';
export const router = Router();

router.post('/', auth, async (req, res) => {
  const { game_type, topic, level = 1, duration_minutes = 40 } = req.body;
  if (!game_type) return res.status(400).json({ error: 'game_type majburiy' });
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expires_at = new Date(Date.now() + duration_minutes * 60000).toISOString();
  const r = await q(`INSERT INTO rooms (host_id, code, game_type, topic, level, duration_minutes, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [req.user.id, code, game_type, topic, level, duration_minutes, expires_at]);
  res.json(r.rows[0]);
});

router.get('/:code', async (req, res) => {
  const r = await q('SELECT * FROM rooms WHERE code = $1', [req.params.code]);
  if (!r.rows.length) return res.status(404).json({ error: 'Xona topilmadi' });
  res.json(r.rows[0]);
});

router.post('/:code/join', optionalAuth, async (req, res) => {
  const { nickname, device } = req.body;
  if (!nickname || !device) return res.status(400).json({ error: 'nickname va device kerak' });
  const room = (await q('SELECT * FROM rooms WHERE code = $1', [req.params.code])).rows[0];
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  if (room.status === 'finished') return res.status(400).json({ error: 'O\'yin tugagan' });
  await q('DELETE FROM room_players WHERE room_id = $1 AND (user_id = $2 OR device = $3)', [room.id, req.user?.id || null, device]);
  const r = await q(`INSERT INTO room_players (room_id, user_id, device, nickname) VALUES ($1, $2, $3, $4) RETURNING *`, [room.id, req.user?.id || null, device, nickname]);
  res.json(r.rows[0]);
});

router.get('/:code/players', async (req, res) => {
  const room = (await q('SELECT id FROM rooms WHERE code = $1', [req.params.code])).rows[0];
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  const r = await q('SELECT * FROM room_players WHERE room_id = $1 ORDER BY score DESC', [room.id]);
  res.json(r.rows);
});
