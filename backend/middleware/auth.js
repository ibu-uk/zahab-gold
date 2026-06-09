const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const perms = req.user.permissions || [];
  if (perms.includes('all') || roles.some(r => perms.includes(r))) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
};

// Audit log helper — call from any route after a state-changing operation
const logAudit = async (db, user, action, module_, recordId, details) => {
  try {
    await db.execute(
      'INSERT INTO audit_log (user_id, user_name, action, module, record_id, details) VALUES (?,?,?,?,?,?)',
      [user?.id || null, user?.name || 'system', action, module_ || null, recordId || null, details ? JSON.stringify(details) : null]
    );
  } catch (_) { /* non-blocking */ }
};

module.exports = { auth, role, logAudit };
