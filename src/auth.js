import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function signToken(payload) {
  // Token sống 30 ngày => "lưu đăng nhập"
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Middleware: yêu cầu Authorization: Bearer <jwt>
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Chưa đăng nhập hoặc token hết hạn' });
  req.user = payload; // { email, name, picture }
  next();
}
