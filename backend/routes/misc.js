const router = require('express').Router();
const db     = require('../config/db');
const https  = require('https');
const { auth, role, logAudit } = require('../middleware/auth');

// ── BRANCHES ──────────────────────────────────────────────────
router.get('/branches', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*, co.name AS country_name, co.flag, co.currency_code, co.vat_rate
       FROM branches b JOIN countries co ON co.id = b.country_id
       WHERE b.is_active=1 ORDER BY b.id`
    );
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/branches', auth, role('admin'), async (req, res) => {
  try {
    const { name, country_id, city, address, phone, email, manager_name } = req.body;
    if (!name || !country_id) return res.status(400).json({error:'Name and country required'});
    const [r] = await db.execute(
      'INSERT INTO branches (name,country_id,city,address,phone,email,manager_name) VALUES (?,?,?,?,?,?,?)',
      [name, country_id, city||null, address||null, phone||null, email||null, manager_name||null]
    );
    await logAudit(db, req.user, 'create_branch', 'branches', r.insertId, { name });
    res.status(201).json({ message:'Branch created', id: r.insertId });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/branches/:id', auth, role('admin'), async (req, res) => {
  try {
    const { name, city, address, phone, email, manager_name, is_active } = req.body;
    await db.execute(
      'UPDATE branches SET name=?,city=?,address=?,phone=?,email=?,manager_name=?,is_active=? WHERE id=?',
      [name, city||null, address||null, phone||null, email||null, manager_name||null, is_active??1, req.params.id]
    );
    await logAudit(db, req.user, 'update_branch', 'branches', req.params.id, { name });
    res.json({ message:'Branch updated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── CUSTOMERS ────────────────────────────────────────────────
router.get('/customers', auth, async (req, res) => {
  try {
    const { search, branch_id, page=1, limit=100 } = req.query;
    let sql = 'SELECT c.*, b.name AS branch_name FROM customers c LEFT JOIN branches b ON b.id=c.branch_id WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.id_number LIKE ?)'; params.push('%'+search+'%','%'+search+'%','%'+search+'%'); }
    if (branch_id) { sql += ' AND c.branch_id=?'; params.push(branch_id); }
    const lim = parseInt(limit)||100, off = ((parseInt(page)||1)-1)*lim;
    sql += ` ORDER BY c.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/customers/:id', auth, async (req, res) => {
  try {
    const [[c]] = await db.execute(
      'SELECT c.*, b.name AS branch_name FROM customers c LEFT JOIN branches b ON b.id=c.branch_id WHERE c.id=?',
      [req.params.id]
    );
    if (!c) return res.status(404).json({error:'Customer not found'});
    // Purchase history
    const [invoices] = await db.execute(
      `SELECT id, invoice_number, total, currency_code, payment_status, created_at FROM invoices
       WHERE customer_id=? ORDER BY created_at DESC LIMIT 20`, [req.params.id]
    );
    res.json({ data: { ...c, invoices } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/customers', auth, role('admin','manager','cashier'), async (req, res) => {
  try {
    const { branch_id, name, phone, email, nationality, id_number, address, notes } = req.body;
    if (!name) return res.status(400).json({error:'Name required'});
    const [r] = await db.execute(
      'INSERT INTO customers (branch_id,name,phone,email,nationality,id_number,address,notes) VALUES (?,?,?,?,?,?,?,?)',
      [branch_id||req.user.branch_id, name, phone||null, email||null, nationality||null, id_number||null, address||null, notes||null]
    );
    res.status(201).json({ message:'Customer created', id: r.insertId });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/customers/:id', auth, role('admin','manager','cashier'), async (req, res) => {
  try {
    const { name, phone, email, nationality, id_number, address, notes, branch_id } = req.body;
    await db.execute('UPDATE customers SET name=?,phone=?,email=?,nationality=?,id_number=?,address=?,notes=?,branch_id=? WHERE id=?',
      [name, phone||null, email||null, nationality||null, id_number||null, address||null, notes||null, branch_id||null, req.params.id]);
    res.json({ message:'Customer updated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── CURRENCIES ───────────────────────────────────────────────
router.get('/currencies', auth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM currencies ORDER BY is_gcc DESC, code');
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/currencies/:code', auth, role('admin','manager'), async (req, res) => {
  try {
    const { rate_to_usd } = req.body;
    await db.execute('UPDATE currencies SET rate_to_usd=?, updated_at=NOW() WHERE code=?', [rate_to_usd, req.params.code]);
    res.json({ message:'Rate updated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── GOLD RATES ───────────────────────────────────────────────
router.get('/gold-rate', auth, async (req, res) => {
  try {
    const [[row]] = await db.execute('SELECT * FROM gold_rates ORDER BY date DESC, id DESC LIMIT 1');
    res.json({ data: row || { usd_per_oz: 3200.00, date: new Date().toISOString().split('T')[0] } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/gold-rate/history', auth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM gold_rates ORDER BY date DESC LIMIT 30');
    res.json({ data: rows.reverse() }); // chronological for charts
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/gold-rate', auth, role('admin','manager'), async (req, res) => {
  try {
    const { usd_per_oz, source } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await db.execute(
      'INSERT INTO gold_rates (date,usd_per_oz,source) VALUES (?,?,?) ON DUPLICATE KEY UPDATE usd_per_oz=VALUES(usd_per_oz),source=VALUES(source)',
      [today, usd_per_oz, source||'manual']
    );
    await logAudit(db, req.user, 'update_gold_rate', 'gold_rates', null, { usd_per_oz, source });
    res.json({ message:'Gold rate updated', usd_per_oz });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// Fetch live rate from goldapi.io (requires GOLD_API_KEY in .env)
router.get('/gold-rate/live', auth, role('admin','manager'), async (req, res) => {
  const apiKey = process.env.GOLD_API_KEY;
  if (!apiKey || apiKey === 'your_goldapi_key_here') {
    return res.status(400).json({ error: 'No gold API key configured in .env (GOLD_API_KEY)' });
  }
  https.get(process.env.GOLD_API_URL || 'https://www.goldapi.io/api/XAU/USD',
    { headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' } },
    (r) => {
      let data = '';
      r.on('data', d => data += d);
      r.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.price) {
            const today = new Date().toISOString().split('T')[0];
            await db.execute(
              'INSERT INTO gold_rates (date,usd_per_oz,source) VALUES (?,?,?) ON DUPLICATE KEY UPDATE usd_per_oz=VALUES(usd_per_oz),source=VALUES(source)',
              [today, json.price, 'goldapi.io']
            );
            res.json({ data: { usd_per_oz: json.price, source: 'goldapi.io', date: today } });
          } else {
            res.status(500).json({ error: 'Invalid response from gold API', raw: data });
          }
        } catch(e){ res.status(500).json({error:e.message}); }
      });
    }
  ).on('error', e => res.status(500).json({error: e.message}));
});

// ── MAKING CHARGES ───────────────────────────────────────────
router.get('/making-charges', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const [rows] = await db.execute(
      'SELECT * FROM karat_making_charges WHERE branch_id IS NULL OR branch_id=? ORDER BY category, karat',
      [branch_id||null]
    );
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/making-charges', auth, role('admin','manager'), async (req, res) => {
  try {
    const { branch_id, category, karat, making_pct } = req.body;
    await db.execute(
      'INSERT INTO karat_making_charges (branch_id,category,karat,making_pct) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE making_pct=VALUES(making_pct)',
      [branch_id||null, category, karat, making_pct]
    );
    res.json({ message:'Making charge updated' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── STOCK TRANSFERS ──────────────────────────────────────────
router.get('/transfers', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT st.*, bf.name AS from_branch, bt.name AS to_branch,
              i.name AS item_name, i.sku, u.name AS requested_by
       FROM stock_transfers st
       JOIN branches bf ON bf.id=st.from_branch_id
       JOIN branches bt ON bt.id=st.to_branch_id
       JOIN items i ON i.id=st.item_id
       LEFT JOIN users u ON u.id=st.user_id
       ORDER BY st.created_at DESC LIMIT 200`
    );
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/transfers', auth, role('admin','manager'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { from_branch_id, to_branch_id, item_id, qty, notes, transfer_date } = req.body;
    if (from_branch_id === to_branch_id) throw new Error('Cannot transfer to the same branch');
    const [[stock]] = await conn.execute('SELECT qty FROM item_branch_stock WHERE item_id=? AND branch_id=?',[item_id,from_branch_id]);
    if (!stock || stock.qty < qty) throw new Error('Insufficient stock in source branch');
    const [r] = await conn.execute(
      'INSERT INTO stock_transfers (from_branch_id,to_branch_id,user_id,item_id,qty,notes,transfer_date,status) VALUES (?,?,?,?,?,?,?,?)',
      [from_branch_id, to_branch_id, req.user.id, item_id, qty, notes||null, transfer_date||new Date().toISOString().split('T')[0], 'received']
    );
    await conn.execute('UPDATE item_branch_stock SET qty=qty-? WHERE item_id=? AND branch_id=?',[qty,item_id,from_branch_id]);
    await conn.execute('INSERT INTO item_branch_stock (item_id,branch_id,qty) VALUES (?,?,?) ON DUPLICATE KEY UPDATE qty=qty+?',[item_id,to_branch_id,qty,qty]);
    await conn.commit();
    await logAudit(db, req.user, 'stock_transfer', 'transfers', r.insertId, { item_id, qty, from_branch_id, to_branch_id });
    res.status(201).json({ message:'Transfer completed', id: r.insertId });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// ── REPORTS ──────────────────────────────────────────────────
router.get('/reports/sales-summary', auth, role('admin','manager'), async (req, res) => {
  try {
    const { from_date, to_date, branch_id } = req.query;
    const from = from_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to   = to_date   || new Date().toISOString().split('T')[0];
    const bid  = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    const params = [from, to];
    let branchFilter = '';
    if (bid) { branchFilter = ' AND inv.branch_id=?'; params.push(bid); }

    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS invoice_count,
              SUM(inv.total) AS total_revenue,
              AVG(inv.total) AS avg_transaction,
              COALESCE(SUM(ii.weight_grams * ii.qty), 0) AS total_weight_grams,
              COUNT(DISTINCT inv.customer_id) AS unique_customers
       FROM invoices inv
       LEFT JOIN invoice_items ii ON ii.invoice_id = inv.id
       WHERE DATE(inv.created_at) BETWEEN ? AND ? AND inv.payment_status='paid' ${branchFilter}`, params
    );
    const [byKarat] = await db.execute(
      `SELECT ii.karat, SUM(ii.weight_grams*ii.qty) AS weight, SUM(ii.line_total) AS revenue, SUM(ii.qty) AS units
       FROM invoice_items ii JOIN invoices inv ON inv.id=ii.invoice_id
       WHERE DATE(inv.created_at) BETWEEN ? AND ? AND inv.payment_status='paid' ${branchFilter}
       GROUP BY ii.karat ORDER BY revenue DESC`, params
    );
    const [byBranch] = await db.execute(
      `SELECT b.name AS branch, b.id AS branch_id, COUNT(inv.id) AS invoices,
              SUM(inv.total) AS revenue, inv.currency_code
       FROM invoices inv JOIN branches b ON b.id=inv.branch_id
       WHERE DATE(inv.created_at) BETWEEN ? AND ? AND inv.payment_status='paid' ${branchFilter}
       GROUP BY inv.branch_id, inv.currency_code ORDER BY revenue DESC`,
      params
    );
    const [byDay] = await db.execute(
      `SELECT DATE(inv.created_at) AS day, SUM(inv.total) AS revenue, COUNT(*) AS invoices
       FROM invoices inv
       WHERE DATE(inv.created_at) BETWEEN ? AND ? AND inv.payment_status='paid' ${branchFilter}
       GROUP BY DATE(inv.created_at) ORDER BY day`, params
    );
    res.json({ data: { summary, by_karat: byKarat, by_branch: byBranch, by_day: byDay, from_date: from, to_date: to } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/reports/inventory', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.name AS branch, b.id AS branch_id, COUNT(DISTINCT i.id) AS total_items,
              COALESCE(SUM(ibs.qty),0) AS total_qty,
              COALESCE(SUM(ibs.qty * i.weight_grams),0) AS total_weight
       FROM branches b
       LEFT JOIN item_branch_stock ibs ON ibs.branch_id=b.id
       LEFT JOIN items i ON i.id=ibs.item_id AND i.is_active=1
       WHERE b.is_active=1 GROUP BY b.id ORDER BY b.id`
    );
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── AUDIT LOG ─────────────────────────────────────────────────
router.get('/audit-log', auth, role('admin'), async (req, res) => {
  try {
    const { page=1, limit=50, user_id, module } = req.query;
    let sql = `SELECT al.*, u.name AS user_name FROM audit_log al
               LEFT JOIN users u ON u.id = al.user_id WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ' AND al.user_id=?'; params.push(user_id); }
    if (module)  { sql += ' AND al.module=?';  params.push(module); }
    const lim = parseInt(limit)||50, off = ((parseInt(page)||1)-1)*lim;
    sql += ` ORDER BY al.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── SETTINGS ─────────────────────────────────────────────────
router.get('/settings', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const [rows] = await db.execute(
      'SELECT setting_key, setting_value FROM settings WHERE branch_id IS NULL OR branch_id=?',
      [branch_id||null]
    );
    const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    res.json({ data: settings });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/settings', auth, role('admin','manager'), async (req, res) => {
  try {
    const { branch_id, settings } = req.body;
    for (const [key, val] of Object.entries(settings)) {
      await db.execute(
        'INSERT INTO settings (branch_id,setting_key,setting_value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)',
        [branch_id||null, key, val]
      );
    }
    await logAudit(db, req.user, 'update_settings', 'settings', null, { keys: Object.keys(settings) });
    res.json({ message:'Settings saved' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── HELD SALES ────────────────────────────────────────────────
router.get('/held-sales', auth, async (req, res) => {
  try {
    const bid = req.user.branch_id;
    const [rows] = await db.execute(
      'SELECT * FROM held_sales WHERE user_id=? ORDER BY created_at DESC LIMIT 10',[req.user.id]
    );
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/held-sales', auth, async (req, res) => {
  try {
    const { label, cart_data } = req.body;
    const [r] = await db.execute(
      'INSERT INTO held_sales (branch_id,user_id,label,cart_data) VALUES (?,?,?,?)',
      [req.user.branch_id||null, req.user.id, label||'Hold', JSON.stringify(cart_data)]
    );
    res.json({ message:'Sale held', id: r.insertId });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.delete('/held-sales/:id', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM held_sales WHERE id=? AND user_id=?',[req.params.id, req.user.id]);
    res.json({ message:'Hold removed' });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ── DASHBOARD STATS ───────────────────────────────────────────
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const bid   = req.user.permissions.includes('all') ? null : req.user.branch_id;
    let bFilter = bid ? ' AND inv.branch_id=?' : '';
    const bp    = bid ? [bid] : [];

    const [[todaySales]] = await db.execute(
      `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count,
              COALESCE(SUM(ii.weight_grams*ii.qty),0) AS weight
       FROM invoices inv
       LEFT JOIN invoice_items ii ON ii.invoice_id=inv.id
       WHERE DATE(inv.created_at)=? AND inv.payment_status='paid' ${bFilter}`,
      [today, ...bp]
    );
    const ordSql = `SELECT COUNT(*) AS total,
              SUM(status='pending') AS pending,
              SUM(status IN('design','fabrication','quality')) AS in_progress,
              SUM(status='ready') AS ready
       FROM special_orders WHERE 1=1 ${bid ? 'AND branch_id=?' : ''}`;
    const [[ordStat]] = bid ? await db.execute(ordSql, [bid]) : await db.execute(ordSql);
    const lowSql = `SELECT COUNT(*) AS cnt FROM item_branch_stock ibs
       JOIN items i ON i.id=ibs.item_id AND i.is_active=1
       WHERE ibs.qty <= ibs.min_qty ${bid ? 'AND ibs.branch_id=?' : ''}`;
    const [[lowStock]] = bid ? await db.execute(lowSql, [bid]) : await db.execute(lowSql);
    const [[overdueInst]] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM installment_payments WHERE status IN('pending','overdue') AND due_date < CURDATE()`
    );

    res.json({ data: {
      today_sales: todaySales,
      orders: ordStat,
      low_stock: lowStock.cnt,
      overdue_installments: overdueInst.cnt
    }});
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = router;
