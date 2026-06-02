const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, assigned_to } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }
    if (assigned_to) { conditions.push(`c.assigned_to = $${idx++}`); params.push(assigned_to); }
    if (search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.company ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM customers c ${where}`, params
    );

    params.push(limit, offset);
    const result = await pool.query(`
      SELECT c.*, u.name as assigned_name, u.email as assigned_email
      FROM customers c
      LEFT JOIN users u ON c.assigned_to = u.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name as assigned_name
      FROM customers c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const deals = await pool.query('SELECT * FROM deals WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]);
    const activities = await pool.query(`
      SELECT a.*, u.name as user_name FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.customer_id = $1 ORDER BY a.created_at DESC LIMIT 20
    `, [req.params.id]);
    const tasks = await pool.query('SELECT * FROM tasks WHERE customer_id = $1 ORDER BY due_date ASC', [req.params.id]);

    res.json({
      customer: result.rows[0],
      deals: deals.rows,
      activities: activities.rows,
      tasks: tasks.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('status').optional().isIn(['lead', 'prospect', 'customer', 'churned'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, company, position, status, source, notes, tags, assigned_to } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO customers (name, email, phone, company, position, status, source, notes, tags, assigned_to, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [name, email, phone, company, position, status || 'lead', source, notes, tags, assigned_to, req.user.id]);

    await pool.query(`
      INSERT INTO activities (type, title, customer_id, created_by)
      VALUES ('customer_added', $1, $2, $3)
    `, [`New customer added: ${name}`, result.rows[0].id, req.user.id]);

    res.status(201).json({ customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { name, email, phone, company, position, status, source, notes, tags, assigned_to } = req.body;
  try {
    const result = await pool.query(`
      UPDATE customers SET
        name = COALESCE($1, name), email = COALESCE($2, email),
        phone = COALESCE($3, phone), company = COALESCE($4, company),
        position = COALESCE($5, position), status = COALESCE($6, status),
        source = COALESCE($7, source), notes = COALESCE($8, notes),
        tags = COALESCE($9, tags), assigned_to = COALESCE($10, assigned_to),
        updated_at = NOW()
      WHERE id = $11 RETURNING *
    `, [name, email, phone, company, position, status, source, notes, tags, assigned_to, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
