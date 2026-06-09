const router = require('express').Router();
const db     = require('../config/db');
const { auth, role, logAudit } = require('../middleware/auth');

async function nextPlanNumber(conn) {
  const year = new Date().getFullYear();
  const [[r]] = await conn.execute('SELECT COUNT(*) AS cnt FROM installment_plans WHERE YEAR(created_at)=?',[year]);
  return `INST-${year}-${String(r.cnt+1).padStart(4,'0')}`;
}

// GET /api/installments
router.get('/', auth, role('admin','manager','cashier'), async (req, res) => {
  try {
    const { branch_id, status, page=1, limit=50 } = req.query;
    let sql = `SELECT ip.*, inv.invoice_number, c.name AS customer_name, b.name AS branch_name,
               (SELECT COUNT(*) FROM installment_payments WHERE plan_id=ip.id AND status='paid') AS paid_count,
               (SELECT COUNT(*) FROM installment_payments WHERE plan_id=ip.id AND status='overdue') AS overdue_count
               FROM installment_plans ip
               JOIN invoices inv ON inv.id = ip.invoice_id
               LEFT JOIN customers c ON c.id = ip.customer_id
               LEFT JOIN branches  b ON b.id = ip.branch_id
               WHERE 1=1`;
    const params = [];
    const bid = req.user.permissions.includes('all') ? branch_id : req.user.branch_id;
    if (bid)    { sql += ' AND ip.branch_id=?'; params.push(bid); }
    if (status) { sql += ' AND ip.status=?';    params.push(status); }
    const lim = parseInt(limit)||50, off = ((parseInt(page)||1)-1)*lim;
    sql += ` ORDER BY ip.created_at DESC LIMIT ${lim} OFFSET ${off}`;
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// GET /api/installments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [[plan]] = await db.execute(
      `SELECT ip.*, inv.invoice_number, c.name AS customer_name, c.phone AS customer_phone, b.name AS branch_name
       FROM installment_plans ip
       JOIN invoices inv ON inv.id = ip.invoice_id
       LEFT JOIN customers c ON c.id = ip.customer_id
       LEFT JOIN branches  b ON b.id = ip.branch_id
       WHERE ip.id=?`, [req.params.id]
    );
    if (!plan) return res.status(404).json({error:'Plan not found'});
    const [payments] = await db.execute(
      'SELECT * FROM installment_payments WHERE plan_id=? ORDER BY installment_no', [req.params.id]
    );
    res.json({ data: { ...plan, payments } });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// POST /api/installments — create plan from invoice
router.post('/', auth, role('admin','manager','cashier'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { invoice_id, down_payment=0, num_installments=12, start_date, currency_code='KWD', notes } = req.body;
    if (!invoice_id) return res.status(400).json({error:'Invoice ID required'});

    const [[inv]] = await conn.execute('SELECT * FROM invoices WHERE id=?',[invoice_id]);
    if (!inv) return res.status(404).json({error:'Invoice not found'});

    const planNo   = await nextPlanNumber(conn);
    const remaining = inv.total - parseFloat(down_payment);
    const instAmt  = remaining / num_installments;

    const [r] = await conn.execute(
      `INSERT INTO installment_plans (plan_number,invoice_id,customer_id,branch_id,total_amount,
       down_payment,remaining_amount,num_installments,installment_amount,currency_code,start_date,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [planNo, invoice_id, inv.customer_id||null, inv.branch_id, inv.total,
       down_payment, remaining, num_installments, instAmt,
       currency_code, start_date||new Date().toISOString().split('T')[0], notes||null]
    );
    const planId = r.insertId;

    const start = new Date(start_date || new Date());
    for (let i = 1; i <= num_installments; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      await conn.execute(
        'INSERT INTO installment_payments (plan_id,installment_no,due_date,amount,status) VALUES (?,?,?,?,?)',
        [planId, i, due.toISOString().split('T')[0], instAmt.toFixed(4), 'pending']
      );
    }

    // Mark invoice as partial/installment
    await conn.execute("UPDATE invoices SET payment_status='partial', payment_method='installment' WHERE id=?",[invoice_id]);
    await conn.commit();
    await logAudit(db, req.user, 'create_installment', 'installments', planId, { plan_number: planNo });
    res.status(201).json({ message:'Installment plan created', id: planId, plan_number: planNo });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// POST /api/installments/:id/pay/:paymentId — record payment
router.post('/:id/pay/:paymentId', auth, role('admin','manager','cashier'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { amount, payment_method='cash', notes } = req.body;
    await conn.execute(
      `UPDATE installment_payments SET paid_amount=?, paid_date=CURDATE(), status='paid', payment_method=?, notes=? WHERE id=? AND plan_id=?`,
      [amount, payment_method, notes||null, req.params.paymentId, req.params.id]
    );
    // Check if all paid
    const [[{cnt}]] = await conn.execute(
      "SELECT COUNT(*) AS cnt FROM installment_payments WHERE plan_id=? AND status!='paid'",[req.params.id]
    );
    if (cnt === 0) {
      await conn.execute("UPDATE installment_plans SET status='completed' WHERE id=?",[req.params.id]);
    }
    await conn.commit();
    await logAudit(db, req.user, 'record_installment_payment', 'installments', req.params.paymentId, { amount });
    res.json({ message:'Payment recorded', all_paid: cnt === 0 });
  } catch(e){ await conn.rollback(); res.status(500).json({error:e.message}); }
  finally { conn.release(); }
});

// GET /api/installments/overdue/list — overdue installments
router.get('/overdue/list', auth, role('admin','manager'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `UPDATE installment_payments SET status='overdue' WHERE status='pending' AND due_date < CURDATE()`
    );
    const [list] = await db.execute(
      `SELECT ip.*, ipm.due_date, ipm.amount AS due_amount, ipm.id AS payment_id,
              c.name AS customer_name, c.phone AS customer_phone, b.name AS branch_name
       FROM installment_payments ipm
       JOIN installment_plans ip ON ip.id = ipm.plan_id
       LEFT JOIN customers c ON c.id = ip.customer_id
       LEFT JOIN branches  b ON b.id = ip.branch_id
       WHERE ipm.status='overdue' AND ip.status='active'
       ORDER BY ipm.due_date ASC LIMIT 100`
    );
    res.json({ data: list });
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = router;
