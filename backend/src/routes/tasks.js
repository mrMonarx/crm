const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, assigned_to, customer_id } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }
    if (assigned_to) { conditions.push(`t.assigned_to = $${idx++}`); params.push(assigned_to); }
    if (customer_id) { conditions.push(`t.customer_id = $${idx++}`); params.push(customer_id); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(`
      SELECT t.*, c.name as customer_name, u.name as assigned_name
      FROM tasks t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.assigned_to = u.id
      ${where}
      ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
    `, params);

    res.json({ tasks: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', [
  body('title').trim().notEmpty(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, due_date, customer_id, deal_id, assigned_to } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, customer_id, deal_id, assigned_to, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [title, description, status || 'pending', priority || 'medium', due_date, customer_id, deal_id, assigned_to, req.user.id]);

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const { title, description, status, priority, due_date, assigned_to } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date), assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [title, description, status, priority, due_date, assigned_to, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    if (status === 'completed') {
      const task = result.rows[0];
      if (task.customer_id) {
        await pool.query(`
          INSERT INTO activities (type, title, customer_id, task_id, created_by)
          VALUES ('task_completed', $1, $2, $3, $4)
        `, [`Task completed: ${task.title}`, task.customer_id, task.id, req.user.id]);
      }
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
