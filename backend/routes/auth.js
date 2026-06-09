const router    = require('express').Router();
const db        = require('../config/db');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { auth, logAudit } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [[user]] = await db.execute(
      `SELECT u.*, r.name AS role_name, r.permissions
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? AND u.is_active = 1`, [email]
    );
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []);
    const payload = {
      id: user.id, name: user.name, email: user.email,
      role: user.role_name, role_id: user.role_id,
      branch_id: user.branch_id, permissions: perms
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    await logAudit(db, payload, 'login', 'auth', user.id, { email });

    res.json({ token, user: payload });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const [[user]] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(old_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    await logAudit(db, req.user, 'change_password', 'auth', req.user.id, {});
    res.json({ message: 'Password changed successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const [[user]] = await db.execute(
      `SELECT u.id, u.name, u.email, u.phone, r.name AS role, u.role_id, u.branch_id, b.name AS branch_name
       FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = ?`, [req.user.id]
    );
    res.json({ data: user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
