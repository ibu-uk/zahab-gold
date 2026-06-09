const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

router.get('/', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE is_active=1';
    const params = [];
    if (search) { sql += ' AND (name LIKE ? OR contact_person LIKE ?)'; params.push('%'+search+'%','%'+search+'%'); }
    sql += ' ORDER BY name';
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/:id', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const [[row]] = await db.execute('SELECT * FROM suppliers WHERE id=?',[req.params.id]);
    if (!row) return res.status(404).json({error:'Supplier not found'});
    res.json({ data: row });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/', auth, role('admin','manager'), async (req, res) => {
  try {
    const { name, name_ar, country, city, phone, email, contact_person, notes } = req.body;
    if (!name) return res.status(400).json({error:'Supplier name required'});
    const [r] = await db.execute(
      'INSERT INTO suppliers (name,name_ar,country,city,phone,email,contact_person,notes) VALUES (?,?,?,?,?,?,?,?)',
      [name, name_ar||null, country||null, city||null, phone||null, email||null, contact_person||null, notes||null]
    );
    await logAudit(db, req.user, 'create_supplier', 'suppliers', r.insertId, { name });
    res.status(201).json({ message:'Supplier created', id: r.insertId });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/:id', auth, role('admin','manager'), async (req, res) => {
  try {
    const { name, name_ar, country, city, phone, email, contact_person, notes } = req.body;
    await db.execute(
      'UPDATE suppliers SET name=?,name_ar=?,country=?,city=?,phone=?,email=?,contact_person=?,notes=? WHERE id=?',
      [name, name_ar||null, country||null, city||null, phone||null, email||null, contact_person||null, notes||null, req.params.id]
    );
    res.json({ message:'Supplier updated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await db.execute('UPDATE suppliers SET is_active=0 WHERE id=?',[req.params.id]);
    res.json({ message:'Supplier deactivated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = router;
