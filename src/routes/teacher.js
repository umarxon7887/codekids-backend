import { Router } from 'express';
import { q } from '../db.js';
import { auth, teacherOnly } from '../middleware.js';
export const router = Router();
router.use(auth, teacherOnly);

router.put('/profile', async (req, res) => {
  const { full_name, school, subjects, experience_years, age_group } = req.body;
  const r = await q(`UPDATE teacher_profiles SET full_name = $1, school = $2, subjects = $3, experience_years = $4, age_group = $5 WHERE user_id = $6 RETURNING *`, [full_name, school, subjects, experience_years, age_group, req.user.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Anketa topilmadi' });
  res.json(r.rows[0]);
});

router.get('/classes', async (req, res) => {
  const r = await q('SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json(r.rows);
});

router.post('/classes', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nomi majburiy' });
  const r = await q('INSERT INTO classes (teacher_id, name, description) VALUES ($1, $2, $3) RETURNING *', [req.user.id, name, description || '']);
  res.json(r.rows[0]);
});

router.get('/classes/:id/students', async (req, res) => {
  const r = await q(`SELECT u.* FROM users u JOIN class_students cs ON u.id = cs.user_id WHERE cs.class_id = $1`, [req.params.id]);
  res.json(r.rows);
});

router.post('/classes/:id/students', async (req, res) => {
  try {
    await q('INSERT INTO class_students (class_id, user_id) VALUES ($1, $2)', [req.params.id, req.body.user_id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Allaqachon qo\'shilgan' });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.get('/stats', async (req, res) => {
  const contents = await q('SELECT COUNT(*) FROM contents WHERE author_id = $1', [req.user.id]);
  const classes = await q('SELECT COUNT(*) FROM classes WHERE teacher_id = $1', [req.user.id]);
  const students = await q(`SELECT COUNT(*) FROM class_students cs JOIN classes c ON cs.class_id = c.id WHERE c.teacher_id = $1`, [req.user.id]);
  res.json({ contents: parseInt(contents.rows[0].count), classes: parseInt(classes.rows[0].count), students: parseInt(students.rows[0].count) });
});

router.get('/recommendations', async (req, res) => {
  const profile = (await q('SELECT * FROM teacher_profiles WHERE user_id = $1', [req.user.id])).rows[0];
  if (!profile) return res.json([]);
  const r = await q(`SELECT * FROM contents WHERE is_published = TRUE AND topic = ANY($1) AND level <= $2 ORDER BY likes_count DESC LIMIT 10`, [profile.subjects, parseInt(profile.age_group) + 1]);
  res.json(r.rows);
});
