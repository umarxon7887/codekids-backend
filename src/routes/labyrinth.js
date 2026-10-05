import { Router } from 'express';
import { q } from '../db.js';
import { auth, optionalAuth } from '../middleware.js';
export const router = Router();

router.post('/solo/finish', optionalAuth, async (req, res) => {
  const { level, time_sec, score, powerups_collected, labyrinth_seed } = req.body;
  if (!level || !time_sec || !score) return res.status(400).json({ error: 'Maydonlar to\'liq emas' });
  const r = await q(`INSERT INTO labyrinth_results (user_id, game_mode, level, time_sec, score, powerups_collected, labyrinth_seed) VALUES ($1, 'solo', $2, $3, $4, $5, $6) RETURNING *`, [req.user?.id || null, level, time_sec, score, powerups_collected || 0, labyrinth_seed]);
  res.json(r.rows[0]);
});

router.get('/solo/best', auth, async (req, res) => {
  const r = await q(`SELECT level, MIN(time_sec) as best_time, MAX(score) as best_score FROM labyrinth_results WHERE user_id = $1 AND game_mode = 'solo' GROUP BY level`, [req.user.id]);
  res.json(r.rows);
});

router.get('/solo/history', auth, async (req, res) => {
  const { limit = 50 } = req.query;
  const r = await q('SELECT * FROM labyrinth_results WHERE user_id = $1 AND game_mode = \'solo\' ORDER BY created_at DESC LIMIT $2', [req.user.id, parseInt(limit)]);
  res.json(r.rows);
});

router.post('/rooms', auth, async (req, res) => {
  const { level, topic, duration_minutes = 5 } = req.body;
  if (!level) return res.status(400).json({ error: 'Level majburiy' });
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const seed = Math.random().toString(36).substring(7);
  const r = await q(`INSERT INTO labyrinth_rooms (host_id, code, level, topic, labyrinth_seed, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [req.user.id, code, level, topic || null, seed, duration_minutes]);
  res.json(r.rows[0]);
});

router.get('/rooms/:code', async (req, res) => {
  const r = await q('SELECT * FROM labyrinth_rooms WHERE code = $1', [req.params.code]);
  if (!r.rows.length) return res.status(404).json({ error: 'Xona topilmadi' });
  res.json(r.rows[0]);
});

router.post('/rooms/:code/join', optionalAuth, async (req, res) => {
  const { nickname, device } = req.body;
  if (!nickname || !device) return res.status(400).json({ error: 'nickname va device kerak' });
  const room = (await q('SELECT * FROM labyrinth_rooms WHERE code = $1', [req.params.code])).rows[0];
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  if (room.status === 'finished') return res.status(400).json({ error: 'O\'yin tugagan' });
  await q('DELETE FROM labyrinth_players WHERE room_id = $1 AND (user_id = $2 OR device = $3)', [room.id, req.user?.id || null, device]);
  const r = await q(`INSERT INTO labyrinth_players (room_id, user_id, device, nickname) VALUES ($1, $2, $3, $4) RETURNING *`, [room.id, req.user?.id || null, device, nickname]);
  res.json(r.rows[0]);
});

router.get('/rooms/:code/players', async (req, res) => {
  const room = (await q('SELECT id FROM labyrinth_rooms WHERE code = $1', [req.params.code])).rows[0];
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  const r = await q('SELECT * FROM labyrinth_players WHERE room_id = $1 ORDER BY score DESC, finished_at ASC', [room.id]);
  res.json(r.rows);
});
