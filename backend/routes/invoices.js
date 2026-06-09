const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

async function nextInvoiceNumber(conn, branchId) {
  const prefix = 'ZHB';
  const year   = new Date().getFullYear();
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM invoices WHERE branch_id = ? AND YEAR(created_at) = ?`, [branchId, year]
  );
  return `${prefix}-${year}-${branchId}-${String(rows[0].cnt + 1).padStart(4,'0')}`;
}

const PURITY = { '24K':1, '22K':22/24, '21K':21/24, '18K':18/24, '14K':14/24, '9K':9/24 };

// GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    const { branch_id, status, from_date, to_date, customer_id, page = 1, limit = 50 } = req.query;
    let sql = `SELECT inv.*, c.name AS customer_name, b.name AS branch_name,
               u.name AS cashier_name,
               COALESCE(SUM(ii.weight_grams * ii.qty), 0) AS total_weight_grams,
               COUNT(ii.id) AS item_count
               FROM invoices inv
               LEFT JOIN customers c  ON c.id  = inv.customer_id
               LEFT JOIN branches b   ON b.id  = inv.branch_id
               LEFT JOIN users u      ON u.id  = inv.user_id
               LEFT JOIN invoice_items ii ON ii.invoice_id = inv.id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)         { sql += ' AND inv.branch_id = ?';   params.push(bid); }
    if (status)      { sql += ' AND inv.payment_status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND inv.customer_id = ?'; params.push(customer_id); }
    if (from_date)   { sql += ' AND DATE(inv.created_at) >= ?'; params.push(from_date); }
    if (to_date)     { sql += ' AND DATE(inv.created_at) <= ?'; params.push(to_date); }
    const lim = parseInt(limit)||50, off = ((parseInt(page)||1)-1)*lim;
    sql += ` GROUP BY inv.id ORDER BY inv.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/invoices/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [inv] = await db.execute(
      `SELECT inv.*, c.name AS customer_name, c.phone AS customer_phone,
              b.name AS branch_name, b.city, b.phone AS branch_phone, u.name AS cashier_name
       FROM invoices inv
       LEFT JOIN customers c ON c.id  = inv.customer_id
       LEFT JOIN branches b  ON b.id  = inv.branch_id
       LEFT JOIN users u     ON u.id  = inv.user_id
       WHERE inv.id = ? OR inv.invoice_number = ?`, [req.params.id, req.params.id]
    );
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const [items] = await db.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [inv[0].id]);
    res.json({ data: { ...inv[0], items } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/invoices (create sale)
router.post('/', auth, role('admin','manager','cashier'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { branch_id, customer_id, currency_code, exchange_rate, gold_rate_usd,
            discount_pct, payment_method, payment_status, notes, notes_ar, items } = req.body;
    if (!items || !items.length) throw new Error('No items provided');

    const vatBid = branch_id || req.user.branch_id;
    const [[vatRow]] = await conn.execute(
      'SELECT vat_rate FROM countries WHERE id = (SELECT country_id FROM branches WHERE id = ?)', [vatBid]
    );
    const vatPct = vatRow ? parseFloat(vatRow.vat_rate) : 0;

    let subtotal = 0, making_total = 0;
    for (const it of items) {
      const gBase  = (gold_rate_usd * (exchange_rate||1)) / 31.1035;
      const purity = PURITY[it.karat] || (21/24);
      const unit   = gBase * purity * it.weight_grams * (1 + (it.making_pct||8)/100);
      it._unit  = unit;
      it._total = unit * (it.qty||1);
      subtotal     += it._total;
      making_total += gBase * purity * it.weight_grams * (it.making_pct||8)/100 * (it.qty||1);
    }
    const discAmt = subtotal * ((discount_pct||0)/100);
    const vatAmt  = (subtotal - discAmt) * (vatPct/100);
    const total   = subtotal - discAmt + vatAmt;

    const invNo = await nextInvoiceNumber(conn, vatBid);
    const [result] = await conn.execute(
      `INSERT INTO invoices
       (invoice_number,branch_id,customer_id,user_id,currency_code,exchange_rate,gold_rate_usd,
        subtotal,making_total,discount_pct,discount_amount,vat_pct,vat_amount,total,
        payment_method,payment_status,notes,notes_ar)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invNo, vatBid, customer_id||null, req.user.id, currency_code||'KWD', exchange_rate||1,
       gold_rate_usd, subtotal, making_total, discount_pct||0, discAmt, vatPct, vatAmt, total,
       payment_method||'cash', payment_status||'paid', notes||null, notes_ar||null]
    );
    const invId = result.insertId;

    for (const it of items) {
      await conn.execute(
        `INSERT INTO invoice_items (invoice_id,item_id,name,karat,weight_grams,making_pct,gold_rate_used,unit_price,qty,line_total)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [invId, it.item_id||null, it.name, it.karat, it.weight_grams, it.making_pct||8, gold_rate_usd, it._unit, it.qty||1, it._total]
      );
      // Deduct stock
      if (it.item_id && vatBid) {
        const [[stk]] = await conn.execute(
          'SELECT qty FROM item_branch_stock WHERE item_id=? AND branch_id=?', [it.item_id, vatBid]
        );
        if (stk) {
          await conn.execute(
            'UPDATE item_branch_stock SET qty = qty - ? WHERE item_id=? AND branch_id=?',
            [it.qty||1, it.item_id, vatBid]
          );
        }
      }
    }

    // Loyalty points (1 pt per 10 KWD equivalent)
    if (customer_id) {
      const pts = Math.floor(total / 10);
      if (pts > 0) await conn.execute('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?', [pts, customer_id]);
    }

    await conn.commit();
    await logAudit(db, req.user, 'create_invoice', 'invoices', invId, { invoice_number: invNo, total });
    res.status(201).json({ message: 'Invoice created', id: invId, invoice_number: invNo, total });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', auth, role('admin','manager'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.execute('UPDATE invoices SET payment_status=?, notes=CONCAT(COALESCE(notes,"")," | ",?), updated_at=NOW() WHERE id=?',
      [status, notes||'', req.params.id]);
    await logAudit(db, req.user, 'update_invoice_status', 'invoices', req.params.id, { status });
    res.json({ message: 'Status updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
