const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/activities
router.get('/', async (req, res) => {
  try {
    const { customer_id, type } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (customer_id) { conditions.push(`a.customer_id = $${idx++}`); params.push(customer_id); }
    if (type) { conditions.push(`a.type = $${idx++}`); params.push(type); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(`
      SELECT a.*, u.name as user_name, u.avatar, c.name as customer_name
      FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN customers c ON a.customer_id = c.id
      ${where}
      ORDER BY a.created_at DESC LIMIT 50
    `, params);

    res.json({ activities: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/activities
router.post('/', [
  body('type').isIn(['call', 'email', 'meeting', 'note']),
  body('title').trim().notEmpty(),
  body('customer_id').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { type, title, description, customer_id, deal_id } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO activities (type, title, description, customer_id, deal_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [type, title, description, customer_id, deal_id, req.user.id]);

    res.status(201).json({ activity: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
