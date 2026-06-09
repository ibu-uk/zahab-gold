const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

async function nextPONumber(conn) {
  const year = new Date().getFullYear();
  const [[r]] = await conn.execute('SELECT COUNT(*) AS cnt FROM purchase_orders WHERE YEAR(created_at)=?',[year]);
  return `PO-${year}-${String(r.cnt+1).padStart(4,'0')}`;
}

// GET /api/purchases
router.get('/', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const { branch_id, status, page=1, limit=50 } = req.query;
    let sql = `SELECT po.*, s.name AS supplier_name, b.name AS branch_name, u.name AS created_by
               FROM purchase_orders po
               LEFT JOIN suppliers s ON s.id = po.supplier_id
               LEFT JOIN branches  b ON b.id = po.branch_id
               LEFT JOIN users     u ON u.id = po.user_id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)    { sql += ' AND po.branch_id=?'; params.push(bid); }
    if (status) { sql += ' AND po.status=?';    params.push(status); }
    sql += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit),(parseInt(page)-1)*parseInt(limit));
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// GET /api/purchases/:id
router.get('/:id', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const [[po]] = await db.execute(
      `SELECT po.*, s.name AS supplier_name, b.name AS branch_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN branches  b ON b.id = po.branch_id
       WHERE po.id=?`, [req.params.id]
    );
    if (!po) return res.status(404).json({error:'Purchase order not found'});
    const [items] = await db.execute(
      `SELECT poi.*, i.name AS item_name, i.sku FROM purchase_order_items poi
       LEFT JOIN items i ON i.id = poi.item_id WHERE poi.po_id=?`, [req.params.id]
    );
    res.json({ data: { ...po, items } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// POST /api/purchases
router.post('/', auth, role('admin','manager','inventory'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { branch_id, supplier_id, currency_code, order_date, notes, items } = req.body;
    const poNo = await nextPONumber(conn);
    const bid  = branch_id || req.user.branch_id;
    let totalCost = 0;
    if (items) items.forEach(it => { totalCost += (it.unit_cost||0) * (it.qty||1); });
    const [r] = await conn.execute(
      `INSERT INTO purchase_orders (po_number,branch_id,supplier_id,user_id,status,total_cost,currency_code,order_date,notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [poNo, bid, supplier_id||null, req.user.id, 'draft', totalCost, currency_code||'KWD', order_date||null, notes||null]
    );
    const poId = r.insertId;
    if (items && items.length) {
      for (const it of items) {
        await conn.execute(
          `INSERT INTO purchase_order_items (po_id,item_id,name,karat,weight_grams,qty,unit_cost,total_cost)
           VALUES (?,?,?,?,?,?,?,?)`,
          [poId, it.item_id||null, it.name||'', it.karat||null, it.weight_grams||0, it.qty||1, it.unit_cost||0, (it.unit_cost||0)*(it.qty||1)]
        );
      }
    }
    await conn.commit();
    await logAudit(db, req.user, 'create_purchase_order', 'purchases', poId, { po_number: poNo });
    res.status(201).json({ message:'Purchase order created', id: poId, po_number: poNo });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// PUT /api/purchases/:id/status — advance status, receive = add stock
router.put('/:id/status', auth, role('admin','manager','inventory'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status, received_date } = req.body;
    const [[po]] = await conn.execute('SELECT * FROM purchase_orders WHERE id=?',[req.params.id]);
    if (!po) return res.status(404).json({error:'PO not found'});
    await conn.execute('UPDATE purchase_orders SET status=?, received_date=COALESCE(?,received_date), updated_at=NOW() WHERE id=?',
      [status, received_date||null, req.params.id]);

    if (status === 'received') {
      const [items] = await conn.execute('SELECT * FROM purchase_order_items WHERE po_id=?',[req.params.id]);
      for (const it of items) {
        if (it.item_id) {
          await conn.execute(
            'INSERT INTO item_branch_stock (item_id,branch_id,qty,min_qty) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE qty=qty+?',
            [it.item_id, po.branch_id, it.qty, it.qty]
          );
        }
      }
    }
    await conn.commit();
    await logAudit(db, req.user, 'update_po_status', 'purchases', req.params.id, { status });
    res.json({ message:'Status updated' });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

module.exports = router;
