const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, status, search, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (low_stock === 'true') { conditions.push(`stock_quantity <= reorder_level`); }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR sku ILIKE $${idx} OR supplier ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM products ${where}`, params);

    params.push(limit, offset);
    const result = await pool.query(`
      SELECT * FROM products
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/stats — inventory summary
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'out_of_stock' OR stock_quantity = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE stock_quantity <= reorder_level AND stock_quantity > 0) as low_stock,
        COALESCE(SUM(stock_quantity), 0) as total_units,
        COALESCE(SUM(stock_quantity * unit_price), 0) as inventory_value
      FROM products
    `);
    res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 200 }),
  body('sku').trim().notEmpty().isLength({ max: 50 }),
  body('category').optional().isIn(['apparel', 'outerwear', 'footwear', 'accessories', 'textile', 'other']),
  body('unit_price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    name, sku, category, description, size, color, unit_price,
    currency, stock_quantity, reorder_level, warehouse, status, supplier
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO products
        (name, sku, category, description, size, color, unit_price, currency,
         stock_quantity, reorder_level, warehouse, status, supplier, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [
      name, sku, category || 'apparel', description, size, color,
      unit_price || 0, currency || 'USD', stock_quantity || 0,
      reorder_level || 10, warehouse || 'Main Warehouse',
      status || 'active', supplier, req.user.id
    ]);

    await pool.query(`
      INSERT INTO activities (type, title, created_by)
      VALUES ('note', $1, $2)
    `, [`New product added: ${name} (${sku})`, req.user.id]);

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A product with this SKU already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const {
    name, sku, category, description, size, color, unit_price,
    currency, stock_quantity, reorder_level, warehouse, status, supplier
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE products SET
        name = COALESCE($1, name), sku = COALESCE($2, sku),
        category = COALESCE($3, category), description = COALESCE($4, description),
        size = COALESCE($5, size), color = COALESCE($6, color),
        unit_price = COALESCE($7, unit_price), currency = COALESCE($8, currency),
        stock_quantity = COALESCE($9, stock_quantity), reorder_level = COALESCE($10, reorder_level),
        warehouse = COALESCE($11, warehouse), status = COALESCE($12, status),
        supplier = COALESCE($13, supplier), updated_at = NOW()
      WHERE id = $14 RETURNING *
    `, [name, sku, category, description, size, color, unit_price, currency,
        stock_quantity, reorder_level, warehouse, status, supplier, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A product with this SKU already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/products/:id/stock — quick stock adjustment (WMS)
router.patch('/:id/stock', [
  body('adjustment').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { adjustment } = req.body;
  try {
    const result = await pool.query(`
      UPDATE products
      SET stock_quantity = GREATEST(0, stock_quantity + $1),
          status = CASE WHEN GREATEST(0, stock_quantity + $1) = 0 THEN 'out_of_stock'
                        WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
          updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [adjustment, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
