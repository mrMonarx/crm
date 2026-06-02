const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/deals
router.get('/', async (req, res) => {
  try {
    const { stage, customer_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (stage) { conditions.push(`d.stage = $${idx++}`); params.push(stage); }
    if (customer_id) { conditions.push(`d.customer_id = $${idx++}`); params.push(customer_id); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const result = await pool.query(`
      SELECT d.*, c.name as customer_name, c.company, u.name as assigned_name
      FROM deals d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.assigned_to = u.id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    const total = await pool.query(`SELECT COUNT(*) FROM deals d ${where}`, params.slice(0, -2));

    res.json({
      deals: result.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/deals/pipeline — Kanban board data
router.get('/pipeline', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.name as customer_name, c.company
      FROM deals d
      LEFT JOIN customers c ON d.customer_id = c.id
      ORDER BY d.value DESC
    `);

    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const pipeline = {};
    stages.forEach(s => {
      pipeline[s] = {
        deals: result.rows.filter(d => d.stage === s),
        total_value: result.rows.filter(d => d.stage === s).reduce((sum, d) => sum + parseFloat(d.value || 0), 0),
        count: result.rows.filter(d => d.stage === s).length
      };
    });

    res.json({ pipeline });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/deals
router.post('/', [
  body('title').trim().notEmpty(),
  body('value').optional().isNumeric(),
  body('stage').optional().isIn(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  body('probability').optional().isInt({ min: 0, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, customer_id, value, currency, stage, probability, expected_close_date, assigned_to, notes } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO deals (title, customer_id, value, currency, stage, probability, expected_close_date, assigned_to, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [title, customer_id, value || 0, currency || 'USD', stage || 'lead', probability || 0, expected_close_date, assigned_to, notes]);

    if (customer_id) {
      await pool.query(`
        INSERT INTO activities (type, title, customer_id, deal_id, created_by)
        VALUES ('deal_updated', $1, $2, $3, $4)
      `, [`New deal created: ${title}`, customer_id, result.rows[0].id, req.user.id]);
    }

    res.status(201).json({ deal: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/deals/:id
router.put('/:id', async (req, res) => {
  const { title, value, currency, stage, probability, expected_close_date, assigned_to, notes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE deals SET
        title = COALESCE($1, title), value = COALESCE($2, value),
        currency = COALESCE($3, currency), stage = COALESCE($4, stage),
        probability = COALESCE($5, probability),
        expected_close_date = COALESCE($6, expected_close_date),
        assigned_to = COALESCE($7, assigned_to),
        notes = COALESCE($8, notes), updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [title, value, currency, stage, probability, expected_close_date, assigned_to, notes, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ deal: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM deals WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ message: 'Deal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
