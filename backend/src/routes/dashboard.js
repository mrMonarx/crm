const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [customers, deals, tasks, revenue, products] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'lead') as leads,
          COUNT(*) FILTER (WHERE status = 'prospect') as prospects,
          COUNT(*) FILTER (WHERE status = 'customer') as customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
        FROM customers
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE stage = 'closed_won') as won,
          COUNT(*) FILTER (WHERE stage = 'closed_lost') as lost,
          COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as active,
          SUM(value) FILTER (WHERE stage = 'closed_won') as total_revenue,
          SUM(value) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as pipeline_value
        FROM deals
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue
        FROM tasks
      `),
      pool.query(`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          SUM(value) as revenue,
          COUNT(*) as deals_count
        FROM deals
        WHERE stage = 'closed_won'
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE stock_quantity <= reorder_level) as low_stock,
          COALESCE(SUM(stock_quantity), 0) as total_units,
          COALESCE(SUM(stock_quantity * unit_price), 0) as inventory_value
        FROM products
      `)
    ]);

    res.json({
      customers: customers.rows[0],
      deals: deals.rows[0],
      tasks: tasks.rows[0],
      products: products.rows[0],
      monthly_revenue: revenue.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/recent-activities
router.get('/activities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, c.name as customer_name, u.name as user_name, u.avatar as user_avatar
      FROM activities a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 15
    `);
    res.json({ activities: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/top-deals
router.get('/top-deals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.name as customer_name, c.company
      FROM deals d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.stage NOT IN ('closed_lost')
      ORDER BY d.value DESC
      LIMIT 5
    `);
    res.json({ deals: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
