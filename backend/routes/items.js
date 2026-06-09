const router  = require('express').Router();
const db      = require('../config/db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { auth, role, logAudit } = require('../middleware/auth');

const uploadDir = path.resolve(__dirname, '../../frontend/assets/uploads/items');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'-'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── CATEGORIES (must come BEFORE /:id to avoid param clash) ──

// GET /api/items/categories/all
router.get('/categories/all', auth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY sort_order, id');
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/categories
router.post('/categories', auth, role('admin','manager'), async (req, res) => {
  try {
    const { name, name_ar, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    const [r] = await db.execute(
      'INSERT INTO categories (name,name_ar,icon,sort_order) VALUES (?,?,?,?)',
      [name, name_ar||null, icon||'💍', sort_order||0]
    );
    await logAudit(db, req.user, 'create_category', 'categories', r.insertId, { name });
    res.status(201).json({ message: 'Category created', id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/items/categories/:id
router.put('/categories/:id', auth, role('admin','manager'), async (req, res) => {
  try {
    const { name, name_ar, icon, sort_order } = req.body;
    await db.execute(
      'UPDATE categories SET name=?,name_ar=?,icon=?,sort_order=? WHERE id=?',
      [name, name_ar||null, icon||'💍', sort_order||0, req.params.id]
    );
    res.json({ message: 'Category updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/items/categories/:id
router.delete('/categories/:id', auth, role('admin'), async (req, res) => {
  try {
    const [[used]] = await db.execute('SELECT COUNT(*) AS cnt FROM items WHERE category_id=?',[req.params.id]);
    if (used.cnt > 0) return res.status(400).json({ error: 'Category has items — reassign them first' });
    await db.execute('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ITEMS ────────────────────────────────────────────────────

// GET /api/items
router.get('/', auth, async (req, res) => {
  try {
    const { category_id, karat, branch_id, search, is_active } = req.query;
    let sql = `SELECT i.*, c.name AS category_name, c.icon,
               GROUP_CONCAT(DISTINCT img.filename ORDER BY img.is_primary DESC, img.sort_order SEPARATOR '|') AS images
               FROM items i
               JOIN categories c ON c.id = i.category_id
               LEFT JOIN item_images img ON img.item_id = i.id
               WHERE 1=1`;
    const params = [];
    if (category_id) { sql += ' AND i.category_id = ?'; params.push(category_id); }
    if (karat)       { sql += ' AND i.karat = ?';       params.push(karat); }
    if (is_active !== undefined) { sql += ' AND i.is_active = ?'; params.push(is_active); }
    else { sql += ' AND i.is_active = 1'; }
    if (search)      { sql += ' AND (i.name LIKE ? OR i.sku LIKE ? OR i.name_ar LIKE ?)'; params.push('%'+search+'%','%'+search+'%','%'+search+'%'); }
    sql += ' GROUP BY i.id ORDER BY i.created_at DESC';
    const [rows] = await db.execute(sql, params);

    // Attach stock for branch
    const bid = branch_id || (req.user.permissions.includes('all') ? null : req.user.branch_id);
    if (bid && rows.length) {
      const ids = rows.map(r => r.id);
      const [stock] = await db.execute(
        `SELECT item_id, qty, min_qty FROM item_branch_stock WHERE branch_id = ? AND item_id IN (${ids.map(()=>'?').join(',')})`,
        [bid, ...ids]
      );
      const sm = Object.fromEntries(stock.map(s => [s.item_id, s]));
      rows.forEach(r => { r.stock = sm[r.id] || { qty: 0, min_qty: 1 }; });
    } else {
      // Sum stock across all branches
      if (rows.length) {
        const ids = rows.map(r => r.id);
        const [stock] = await db.execute(
          `SELECT item_id, SUM(qty) AS qty, MIN(min_qty) AS min_qty FROM item_branch_stock WHERE item_id IN (${ids.map(()=>'?').join(',')}) GROUP BY item_id`,
          ids
        );
        const sm = Object.fromEntries(stock.map(s => [s.item_id, s]));
        rows.forEach(r => { r.stock = sm[r.id] || { qty: 0, min_qty: 1 }; });
      }
    }

    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/items/low-stock
router.get('/low-stock', auth, role('admin','manager','inventory'), async (req, res) => {
  try {
    const bid = req.user.permissions.includes('all') ? req.query.branch_id : req.user.branch_id;
    let sql = `SELECT i.id, i.sku, i.name, i.name_ar, i.karat, i.weight_grams, c.name AS category_name,
               b.name AS branch_name, ibs.qty, ibs.min_qty, ibs.branch_id
               FROM item_branch_stock ibs
               JOIN items i ON i.id = ibs.item_id AND i.is_active = 1
               JOIN categories c ON c.id = i.category_id
               JOIN branches b ON b.id = ibs.branch_id
               WHERE ibs.qty <= ibs.min_qty`;
    const params = [];
    if (bid) { sql += ' AND ibs.branch_id = ?'; params.push(bid); }
    sql += ' ORDER BY ibs.qty ASC, i.name';
    const [rows] = await db.execute(sql, params);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/items/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT i.*, c.name AS category_name FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const [images] = await db.execute('SELECT * FROM item_images WHERE item_id = ? ORDER BY is_primary DESC, sort_order', [req.params.id]);
    const [stock]  = await db.execute('SELECT bs.*, b.name AS branch_name FROM item_branch_stock bs JOIN branches b ON b.id = bs.branch_id WHERE bs.item_id = ?', [req.params.id]);
    res.json({ data: { ...rows[0], images, stock } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items
router.post('/', auth, role('admin','manager','inventory'), upload.array('images', 10), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { sku, name, name_ar, category_id, karat, weight_grams, making_pct, description, description_ar, is_special_order, branches } = req.body;
    if (!sku || !name) return res.status(400).json({ error: 'SKU and name are required' });
    const [[exist]] = await conn.execute('SELECT id FROM items WHERE sku=?',[sku]);
    if (exist) return res.status(400).json({ error: 'SKU already exists' });
    const [result] = await conn.execute(
      `INSERT INTO items (sku,name,name_ar,category_id,karat,weight_grams,making_pct,description,description_ar,is_special_order)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [sku, name, name_ar||null, category_id, karat, weight_grams, making_pct||8, description||null, description_ar||null, is_special_order||0]
    );
    const itemId = result.insertId;
    if (req.files && req.files.length) {
      for (let i = 0; i < req.files.length; i++) {
        await conn.execute('INSERT INTO item_images (item_id,filename,is_primary,sort_order) VALUES (?,?,?,?)',
          [itemId, req.files[i].filename, i===0?1:0, i]);
      }
    }
    if (branches) {
      const bList = JSON.parse(branches);
      for (const b of bList) {
        await conn.execute('INSERT INTO item_branch_stock (item_id,branch_id,qty,min_qty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE qty=VALUES(qty)',
          [itemId, b.branch_id, b.qty||0, b.min_qty||1]);
      }
    }
    await conn.commit();
    await logAudit(db, req.user, 'create_item', 'items', itemId, { sku, name });
    res.status(201).json({ message: 'Item created', id: itemId });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// PUT /api/items/:id
router.put('/:id', auth, role('admin','manager','inventory'), upload.array('images', 10), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { name, name_ar, category_id, karat, weight_grams, making_pct, description, description_ar, is_active, is_special_order, branches, remove_images } = req.body;
    await conn.execute(
      `UPDATE items SET name=?,name_ar=?,category_id=?,karat=?,weight_grams=?,making_pct=?,description=?,description_ar=?,is_active=?,is_special_order=?,updated_at=NOW() WHERE id=?`,
      [name, name_ar||null, category_id, karat, weight_grams, making_pct||8, description||null, description_ar||null, is_active??1, is_special_order||0, req.params.id]
    );
    // Remove selected images
    if (remove_images) {
      const ids = JSON.parse(remove_images);
      for (const imgId of ids) {
        const [[img]] = await conn.execute('SELECT filename FROM item_images WHERE id=?',[imgId]);
        if (img) {
          const fp = path.join(uploadDir, img.filename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
          await conn.execute('DELETE FROM item_images WHERE id=?',[imgId]);
        }
      }
    }
    // Add new images
    if (req.files && req.files.length) {
      const [[{cnt}]] = await conn.execute('SELECT COUNT(*) AS cnt FROM item_images WHERE item_id=?',[req.params.id]);
      for (let i = 0; i < req.files.length; i++) {
        await conn.execute('INSERT INTO item_images (item_id,filename,is_primary,sort_order) VALUES (?,?,?,?)',
          [req.params.id, req.files[i].filename, cnt===0&&i===0?1:0, cnt+i]);
      }
    }
    // Update branch stock
    if (branches) {
      const bList = JSON.parse(branches);
      for (const b of bList) {
        await conn.execute('INSERT INTO item_branch_stock (item_id,branch_id,qty,min_qty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE qty=VALUES(qty),min_qty=VALUES(min_qty)',
          [req.params.id, b.branch_id, b.qty||0, b.min_qty||1]);
      }
    }
    await conn.commit();
    await logAudit(db, req.user, 'update_item', 'items', req.params.id, { name });
    res.json({ message: 'Item updated' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// DELETE /api/items/:id (soft delete)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await db.execute('UPDATE items SET is_active = 0 WHERE id = ?', [req.params.id]);
    await logAudit(db, req.user, 'delete_item', 'items', req.params.id, {});
    res.json({ message: 'Item deactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
