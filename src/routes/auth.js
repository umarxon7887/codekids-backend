import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { sign, auth } from '../middleware/auth.js';
export const router = Router();
router.post('/register', async (req, res) => {
  const { nickname, email, password, role = 'student', teacherProfile } = req.body;
  if (!nickname || nickname.length < 3) return res.status(400).json({ error: 'Nickname kamida 3 belgi' });
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'Email noto\'g\'ri' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Parol kamida 6 belgi' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await q('INSERT INTO users (nickname, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, nickname, role', [nickname, email, role, hash]);
    const user = r.rows[0];
    if (role === 'teacher' && teacherProfile) {
      await q('INSERT INTO teacher_profiles (user_id, full_name, school, subjects, experience_years, age_group) VALUES ($1, $2, $3, $4, $5, $6)', [user.id, teacherProfile.full_name, teacherProfile.school, teacherProfile.subjects, teacherProfile.experience_years, teacherProfile.age_group]);
    }
    res.json({ token: sign(user), user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email yoki nickname band' });
    res.status(500).json({ error: 'Server xatosi' });
  }
});
router.post('/login', async (req, res) => {
  const r = await q('SELECT * FROM users WHERE email = $1', [req.body.email]);
  if (!r.rows.length || !(await bcrypt.compare(req.body.password || '', r.rows[0].password_hash))) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  res.json({ token: sign(r.rows[0]), user: { id: r.rows[0].id, nickname: r.rows[0].nickname, role: r.rows[0].role } });
});
router.get('/me', auth, async (req, res) => {
  const r = await q('SELECT id, nickname, role, email, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
  res.json(r.rows[0] || null);
});
