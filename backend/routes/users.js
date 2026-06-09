const router  = require('express').Router();
const db      = require('../config/db');
const bcrypt  = require('bcryptjs');
const { auth, role } = require('../middleware/auth');

// GET /api/users
router.get('/', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.last_login, u.created_at,
              r.id AS role_id, r.name AS role_name,
              b.id AS branch_id, b.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN branches b ON b.id = u.branch_id
       ORDER BY u.created_at DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/roles
router.get('/roles', auth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name FROM roles ORDER BY id');
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/:id
router.get('/:id', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active,
              r.id AS role_id, r.name AS role_name,
              b.id AS branch_id, b.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users  — create new user
router.post('/', auth, role('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, role_id, branch_id, is_active } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    // check email unique
    const [exist] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (exist.length) return res.status(400).json({ error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.execute(
      'INSERT INTO users (name, email, password_hash, phone, role_id, branch_id, is_active) VALUES (?,?,?,?,?,?,?)',
      [name, email, hash, phone||null, role_id||3, branch_id||null, is_active??1]
    );
    res.status(201).json({ message: 'User created', id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id  — update user
router.put('/:id', auth, role('admin'), async (req, res) => {
  try {
    const { name, email, phone, role_id, branch_id, is_active, password } = req.body;
    if (password && password.length > 0) {
      const hash = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE users SET name=?, email=?, phone=?, role_id=?, branch_id=?, is_active=?, password_hash=? WHERE id=?',
        [name, email, phone||null, role_id, branch_id||null, is_active??1, hash, req.params.id]
      );
    } else {
      await db.execute(
        'UPDATE users SET name=?, email=?, phone=?, role_id=?, branch_id=?, is_active=? WHERE id=?',
        [name, email, phone||null, role_id, branch_id||null, is_active??1, req.params.id]
      );
    }
    res.json({ message: 'User updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/users/:id  — deactivate (soft delete)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id/activate
router.put('/:id/activate', auth, role('admin'), async (req, res) => {
  try {
    await db.execute('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User activated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
