const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

async function nextBuybackNumber(conn) {
  const year = new Date().getFullYear();
  const [[r]] = await conn.execute('SELECT COUNT(*) AS cnt FROM buybacks WHERE YEAR(created_at)=?',[year]);
  return `BUY-${year}-${String(r.cnt+1).padStart(4,'0')}`;
}

const PURITY = { '24K':1,'22K':22/24,'21K':21/24,'18K':18/24,'14K':14/24,'9K':9/24 };

// GET /api/buybacks
router.get('/', auth, role('admin','manager','cashier'), async (req, res) => {
  try {
    const { branch_id, page=1, limit=50, from_date, to_date } = req.query;
    let sql = `SELECT bb.*, c.name AS customer_name, b.name AS branch_name, u.name AS cashier_name
               FROM buybacks bb
               LEFT JOIN customers c ON c.id = bb.customer_id
               LEFT JOIN branches  b ON b.id = bb.branch_id
               LEFT JOIN users     u ON u.id = bb.user_id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)       { sql += ' AND bb.branch_id=?';             params.push(bid); }
    if (from_date) { sql += ' AND DATE(bb.created_at)>=?';     params.push(from_date); }
    if (to_date)   { sql += ' AND DATE(bb.created_at)<=?';     params.push(to_date); }
    sql += ' ORDER BY bb.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit),(parseInt(page)-1)*parseInt(limit));
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// GET /api/buybacks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [[bb]] = await db.execute(
      `SELECT bb.*, c.name AS customer_name, c.phone AS customer_phone, b.name AS branch_name
       FROM buybacks bb
       LEFT JOIN customers c ON c.id = bb.customer_id
       LEFT JOIN branches  b ON b.id = bb.branch_id
       WHERE bb.id=?`, [req.params.id]
    );
    if (!bb) return res.status(404).json({error:'Buyback not found'});
    res.json({ data: bb });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// POST /api/buybacks
router.post('/', auth, role('admin','manager','cashier'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { branch_id, customer_id, item_description, category, karat, gross_weight,
            net_weight, deduction_pct, purity_tested, gold_rate_usd, exchange_rate,
            amount_paid, currency_code, payment_method, notes } = req.body;

    if (!karat || !gross_weight || !gold_rate_usd || !amount_paid)
      return res.status(400).json({error:'Karat, weight, gold rate, and amount are required'});

    const buybackNo = await nextBuybackNumber(conn);
    const bid = branch_id || req.user.branch_id;
    const [r] = await conn.execute(
      `INSERT INTO buybacks (buyback_number,branch_id,customer_id,user_id,item_description,category,
       karat,gross_weight,net_weight,deduction_pct,purity_tested,gold_rate_usd,exchange_rate,
       amount_paid,currency_code,payment_method,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [buybackNo, bid, customer_id||null, req.user.id,
       item_description||null, category||null, karat, gross_weight,
       net_weight||gross_weight, deduction_pct||0, purity_tested?1:0,
       gold_rate_usd, exchange_rate||1, amount_paid, currency_code||'KWD',
       payment_method||'cash', notes||null]
    );
    await conn.commit();
    await logAudit(db, req.user, 'create_buyback', 'buybacks', r.insertId, { buyback_number: buybackNo, karat, amount_paid });
    res.status(201).json({ message:'Buyback recorded', id: r.insertId, buyback_number: buybackNo });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// GET /api/buybacks/calculate — price preview
router.post('/calculate', auth, (req, res) => {
  try {
    const { karat, gross_weight, deduction_pct=0, gold_rate_usd, exchange_rate=1, currency_code='KWD' } = req.body;
    const purity = PURITY[karat] || (21/24);
    const net    = gross_weight * (1 - deduction_pct/100);
    const perGram = (gold_rate_usd * exchange_rate) / 31.1035 * purity;
    const amount  = perGram * net;
    const decimals = ['KWD','BHD','OMR'].includes(currency_code) ? 3 : 2;
    res.json({ data: { net_weight: net.toFixed(3), amount_payable: amount.toFixed(decimals), per_gram: perGram.toFixed(decimals) } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = router;
