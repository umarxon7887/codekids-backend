import jwt from 'jsonwebtoken';
export const sign = (user) => jwt.sign({ id: user.id, role: user.role, nickname: user.nickname }, process.env.JWT_SECRET, { expiresIn: '7d' });
export const auth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token yo\'q' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token yaroqsiz' }); }
};
export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (token) { try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {} }
  next();
};
export const teacherOnly = (req, res, next) => req.user?.role === 'teacher' ? next() : res.status(403).json({ error: 'Faqat ustoz uchun' });
