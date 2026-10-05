import { Router } from 'express';
import { q } from '../db.js';
import { auth, optionalAuth } from '../middleware/auth.js';
export const router = Router();

router.get('/search', optionalAuth, async (req, res) => {
  const { q: search, type, topic } = req.query;
  if (!search) return res.json([]);
  let sql = `SELECT c.*, u.nickname as author_nickname FROM contents c LEFT JOIN users u ON c.author_id = u.id WHERE c.is_published = TRUE AND (c.title ILIKE $1 OR c.description ILIKE $1)`;
  const params = [`%${search}%`];
  if (type) { params.push(type); sql += ` AND c.type = $${params.length}`; }
  if (topic) { params.push(topic); sql += ` AND c.topic = $${params.length}`; }
  sql += ' ORDER BY likes_count DESC LIMIT 50';
  const r = await q(sql, params);
  res.json(r.rows);
});

router.get('/', optionalAuth, async (req, res) => {
  const { filter = 'recent', topic, q: search, limit = 20, offset = 0 } = req.query;
  let orderBy = 'created_at DESC';
  if (filter === 'popular') orderBy = 'plays_count DESC';
  else if (filter === 'top') orderBy = 'likes_count DESC';
  
  let sql = `SELECT c.*, u.nickname as author_nickname FROM contents c LEFT JOIN users u ON c.author_id = u.id WHERE c.is_published = TRUE`;
  const params = [];
  if (topic) { params.push(topic); sql += ` AND c.topic = $${params.length}`; }
  if (search) { params.push(`%${search}%`); sql += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`; }
  params.push(parseInt(limit)); sql += ` ORDER BY ${orderBy} LIMIT $${params.length}`;
  params.push(parseInt(offset)); sql += ` OFFSET $${params.length}`;
  const r = await q(sql, params);
  res.json(r.rows);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const r = await q(`SELECT c.*, u.nickname as author_nickname FROM contents c LEFT JOIN users u ON c.author_id = u.id WHERE c.id = $1`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Topilmadi' });
  await q('UPDATE contents SET plays_count = plays_count + 1 WHERE id = $1', [req.params.id]);
  const content = r.rows[0];
  if (req.user) {
    const like = await q('SELECT id FROM likes WHERE user_id = $1 AND content_id = $2', [req.user.id, content.id]);
    content.liked_by_user = like.rows.length > 0;
  } else content.liked_by_user = false;
  res.json(content);
});

router.post('/', auth, async (req, res) => {
  const { type, title, description, topic, level, data, is_published } = req.body;
  if (!type || !['questions', 'typing_text'].includes(type)) return res.status(400).json({ error: 'Noto\'g\'ri tur' });
  if (!title || title.length < 3) return res.status(400).json({ error: 'Sarlavha kamida 3 belgi' });
  if (!topic || !data) return res.status(400).json({ error: 'Mavzu va data majburiy' });
  
  // MUHIM: is_published qo'shildi
  const r = await q(
    `INSERT INTO contents (author_id, type, title, description, topic, level, data, is_published) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, 
    [req.user.id, type, title, description || '', topic, level || 1, JSON.stringify(data), is_published || false]
  );
  res.json(r.rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  const { title, description, topic, level, data, is_published } = req.body;
  const existing = await q('SELECT * FROM contents WHERE id = $1 AND author_id = $2', [req.params.id, req.user.id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Topilmadi yoki sizniki emas' });
  if (existing.rows[0].is_published && is_published === false) return res.status(400).json({ error: 'Published kontentni yopib bo\'lmaydi' }); // Xavfsizlik
  
  const r = await q(
    `UPDATE contents SET title = $1, description = $2, topic = $3, level = $4, data = $5, is_published = COALESCE($6, is_published), updated_at = NOW() 
     WHERE id = $7 RETURNING *`,
    [title, description, topic, level, JSON.stringify(data), is_published, req.params.id]
  );
  res.json(r.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  const r = await q('DELETE FROM contents WHERE id = $1 AND author_id = $2 RETURNING id', [req.params.id, req.user.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Topilmadi yoki sizniki emas' });
  res.json({ ok: true });
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    await q('INSERT INTO likes (user_id, content_id) VALUES ($1, $2)', [req.user.id, req.params.id]);
    await q('UPDATE contents SET likes_count = likes_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Allaqachon layk bosilgan' });
    res.status(500).json({ error: 'Server xatosi' });
  }
});

router.delete('/:id/like', auth, async (req, res) => {
  const r = await q('DELETE FROM likes WHERE user_id = $1 AND content_id = $2 RETURNING id', [req.user.id, req.params.id]);
  if (r.rows.length) await q('UPDATE contents SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
