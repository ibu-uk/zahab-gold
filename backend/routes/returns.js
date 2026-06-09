const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

async function nextReturnNumber(conn) {
  const year = new Date().getFullYear();
  const [[r]] = await conn.execute('SELECT COUNT(*) AS cnt FROM returns WHERE YEAR(created_at)=?',[year]);
  return `RET-${year}-${String(r.cnt+1).padStart(4,'0')}`;
}

// GET /api/returns
router.get('/', auth, role('admin','manager','cashier'), async (req, res) => {
  try {
    const { branch_id, status, page=1, limit=50 } = req.query;
    let sql = `SELECT r.*, inv.invoice_number, c.name AS customer_name,
               b.name AS branch_name, u.name AS cashier_name
               FROM returns r
               JOIN invoices inv ON inv.id = r.invoice_id
               LEFT JOIN customers c ON c.id = r.customer_id
               LEFT JOIN branches  b ON b.id = r.branch_id
               LEFT JOIN users     u ON u.id = r.user_id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)    { sql += ' AND r.branch_id=?'; params.push(bid); }
    if (status) { sql += ' AND r.status=?';    params.push(status); }
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit),(parseInt(page)-1)*parseInt(limit));
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// GET /api/returns/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [[ret]] = await db.execute(
      `SELECT r.*, inv.invoice_number, c.name AS customer_name, b.name AS branch_name
       FROM returns r
       JOIN invoices inv ON inv.id = r.invoice_id
       LEFT JOIN customers c ON c.id = r.customer_id
       LEFT JOIN branches  b ON b.id = r.branch_id
       WHERE r.id=?`, [req.params.id]
    );
    if (!ret) return res.status(404).json({error:'Return not found'});
    const [ritems] = await db.execute('SELECT * FROM return_items WHERE return_id=?',[req.params.id]);
    res.json({ data: { ...ret, items: ritems } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// POST /api/returns — create return request
router.post('/', auth, role('admin','manager','cashier'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { invoice_id, reason, return_type, refund_amount, currency_code,
            refund_method, notes, items } = req.body;
    if (!invoice_id) return res.status(400).json({error:'Invoice ID required'});

    const [[inv]] = await conn.execute(
      'SELECT branch_id, customer_id, payment_status FROM invoices WHERE id=?',[invoice_id]
    );
    if (!inv) return res.status(404).json({error:'Invoice not found'});

    const retNo = await nextReturnNumber(conn);
    const [r] = await conn.execute(
      `INSERT INTO returns (return_number,invoice_id,branch_id,customer_id,user_id,reason,
       return_type,refund_amount,currency_code,refund_method,status,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [retNo, invoice_id, inv.branch_id, inv.customer_id||null, req.user.id,
       reason||null, return_type||'full', refund_amount||0,
       currency_code||'KWD', refund_method||'cash', 'pending', notes||null]
    );
    const retId = r.insertId;

    if (items && items.length) {
      for (const it of items) {
        await conn.execute(
          'INSERT INTO return_items (return_id,invoice_item_id,item_id,name,karat,weight_grams,qty,refund_amount) VALUES (?,?,?,?,?,?,?,?)',
          [retId, it.invoice_item_id||null, it.item_id||null, it.name, it.karat||null, it.weight_grams||0, it.qty||1, it.refund_amount||0]
        );
      }
    }

    await conn.commit();
    await logAudit(db, req.user, 'create_return', 'returns', retId, { return_number: retNo, invoice_id });
    res.status(201).json({ message:'Return created', id: retId, return_number: retNo });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// PUT /api/returns/:id/status — approve/complete/reject
router.put('/:id/status', auth, role('admin','manager'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status, notes } = req.body;
    await conn.execute('UPDATE returns SET status=?, notes=? WHERE id=?', [status, notes||null, req.params.id]);

    if (status === 'completed') {
      // Mark original invoice as refunded (if full return)
      const [[ret]] = await conn.execute('SELECT * FROM returns WHERE id=?',[req.params.id]);
      if (ret.return_type === 'full') {
        await conn.execute("UPDATE invoices SET payment_status='refunded' WHERE id=?", [ret.invoice_id]);
      }
      // Add stock back for returned items
      const [ritems] = await conn.execute('SELECT * FROM return_items WHERE return_id=?',[req.params.id]);
      for (const ri of ritems) {
        if (ri.item_id) {
          await conn.execute(
            'INSERT INTO item_branch_stock (item_id,branch_id,qty) VALUES (?,?,?) ON DUPLICATE KEY UPDATE qty=qty+?',
            [ri.item_id, ret.branch_id, ri.qty, ri.qty]
          );
        }
      }
    }

    await conn.commit();
    await logAudit(db, req.user, 'update_return_status', 'returns', req.params.id, { status });
    res.json({ message:'Return status updated' });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

module.exports = router;
