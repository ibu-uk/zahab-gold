const router = require('express').Router();
const db     = require('../config/db');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { auth, role } = require('../middleware/auth');

const uploadDir = path.resolve(__dirname, '../../frontend/assets/uploads/orders');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, f, cb)  => cb(null, Date.now() + '-' + f.originalname.replace(/\s+/g,'-'))
}), limits: { fileSize: 5 * 1024 * 1024 } });

async function nextOrderNumber(conn, branchId) {
  const year = new Date().getFullYear();
  const [[row]] = await conn.execute('SELECT COUNT(*) AS cnt FROM special_orders WHERE YEAR(created_at) = ?', [year]);
  return `ORD-${year}-${String(row.cnt + 1).padStart(4,'0')}`;
}

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    const { branch_id, status, page = 1, limit = 50 } = req.query;
    let sql = `SELECT so.*, c.name AS customer_name, c.phone AS customer_phone,
               b.name AS branch_name, u.name AS created_by
               FROM special_orders so
               LEFT JOIN customers c ON c.id = so.customer_id
               LEFT JOIN branches b  ON b.id = so.branch_id
               LEFT JOIN users u     ON u.id = so.user_id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)    { sql += ' AND so.branch_id = ?'; params.push(bid); }
    if (status) { sql += ' AND so.status = ?';    params.push(status); }
    sql += ' ORDER BY so.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page)-1)*parseInt(limit));
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT so.*, c.name AS customer_name, c.phone AS customer_phone, b.name AS branch_name
       FROM special_orders so
       LEFT JOIN customers c ON c.id = so.customer_id
       LEFT JOIN branches b  ON b.id = so.branch_id
       WHERE so.id = ? OR so.order_number = ?`, [req.params.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const [images]   = await db.execute('SELECT * FROM special_order_images WHERE order_id = ?', [rows[0].id]);
    const [timeline] = await db.execute(
      `SELECT t.*, u.name AS updated_by FROM special_order_timeline t LEFT JOIN users u ON u.id = t.user_id WHERE t.order_id = ? ORDER BY t.created_at`, [rows[0].id]
    );
    res.json({ data: { ...rows[0], images, timeline } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders
router.post('/', auth, role('admin','manager','cashier'), upload.array('images', 5), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { branch_id, customer_id, description, description_ar, karat, approx_weight, advance_amount, advance_currency, estimated_total, currency_code, due_date, notes } = req.body;
    const orderNo = await nextOrderNumber(conn, branch_id||req.user.branch_id);
    const [result] = await conn.execute(
      `INSERT INTO special_orders (order_number,branch_id,customer_id,user_id,description,description_ar,karat,approx_weight,advance_amount,advance_currency,estimated_total,currency_code,due_date,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNo, branch_id||req.user.branch_id, customer_id||null, req.user.id, description, description_ar||null, karat, approx_weight||null, advance_amount||0, advance_currency||'KWD', estimated_total||null, currency_code||'KWD', due_date||null, notes||null]
    );
    const orderId = result.insertId;
    await conn.execute('INSERT INTO special_order_timeline (order_id,status,user_id,notes) VALUES (?,?,?,?)', [orderId,'pending',req.user.id,'Order placed']);
    if (req.files) {
      for (const f of req.files) await conn.execute('INSERT INTO special_order_images (order_id,filename) VALUES (?,?)', [orderId, f.filename]);
    }
    await conn.commit();
    res.status(201).json({ message: 'Order created', id: orderId, order_number: orderNo });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// PUT /api/orders/:id/status
router.put('/:id/status', auth, role('admin','manager'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status, notes } = req.body;
    await conn.execute('UPDATE special_orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    await conn.execute('INSERT INTO special_order_timeline (order_id,status,user_id,notes) VALUES (?,?,?,?)', [req.params.id, status, req.user.id, notes||null]);
    await conn.commit();
    res.json({ message: 'Order status updated' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

module.exports = router;
