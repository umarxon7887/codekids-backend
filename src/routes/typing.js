import { Router } from 'express';
import { q } from '../db.js';
import { auth, optionalAuth } from '../middleware.js';
export const router = Router();

router.get('/texts/random', async (req, res) => {
  const { language = 'uz', level = 'medium' } = req.query;
  const r = await q('SELECT * FROM typing_texts WHERE language = $1 AND level = $2 ORDER BY RANDOM() LIMIT 1', [language, level]);
  res.json(r.rows[0] || null);
});

router.post('/results', optionalAuth, async (req, res) => {
  const { game_mode, language, level, wpm, accuracy, time_sec, text_length, place, room_code } = req.body;
  if (!game_mode || !language || !level || !wpm || !accuracy || !time_sec) return res.status(400).json({ error: 'Maydonlar to\'liq emas' });
  const r = await q(`INSERT INTO typing_results (user_id, game_mode, language, level, wpm, accuracy, time_sec, text_length, place, room_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [req.user?.id || null, game_mode, language, level, wpm, accuracy, time_sec, text_length, place || null, room_code || null]);
  res.json(r.rows[0]);
});

router.get('/best', auth, async (req, res) => {
  const r = await q(`SELECT language, MAX(wpm) as best_wpm, MAX(accuracy) as best_accuracy, MIN(time_sec) as best_time FROM typing_results WHERE user_id = $1 GROUP BY language`, [req.user.id]);
  res.json(r.rows);
});

router.get('/history', auth, async (req, res) => {
  const { limit = 50 } = req.query;
  const r = await q('SELECT * FROM typing_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.user.id, parseInt(limit)]);
  res.json(r.rows);
});
