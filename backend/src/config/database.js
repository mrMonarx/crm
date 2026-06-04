const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'crm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
});

// Initialize DB schema
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
        avatar VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(30),
        company VARCHAR(150),
        position VARCHAR(100),
        status VARCHAR(20) DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'churned')),
        source VARCHAR(50),
        notes TEXT,
        tags TEXT[],
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        sku VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(60) DEFAULT 'apparel' CHECK (category IN ('apparel', 'outerwear', 'footwear', 'accessories', 'textile', 'other')),
        description TEXT,
        size VARCHAR(20),
        color VARCHAR(40),
        unit_price NUMERIC(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
        reorder_level INTEGER DEFAULT 10,
        warehouse VARCHAR(100) DEFAULT 'Main Warehouse',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'out_of_stock')),
        supplier VARCHAR(150),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        value NUMERIC(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        stage VARCHAR(30) DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
        probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
        expected_close_date DATE,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date TIMESTAMP,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(30) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task_completed', 'deal_updated', 'customer_added')),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
      CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
      CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_activities_customer_id ON activities(customer_id);
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    `);

    // Seed demo admin user
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin1234!', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Admin User', 'admin@crm.com', $1, 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [hash]);

    // Seed sample customers
    await client.query(`
      INSERT INTO customers (name, email, phone, company, status, source)
      VALUES
        ('Jasur Toshmatov', 'jasur@example.com', '+998901234567', 'Toshkent Textile Ltd', 'customer', 'referral'),
        ('Malika Rahimova', 'malika@example.com', '+998712345678', 'Fashion House UZ', 'prospect', 'website'),
        ('Bobur Karimov', 'bobur@example.com', '+998931234567', 'Silk Road Trade', 'lead', 'social_media'),
        ('Nilufar Yusupova', 'nilufar@example.com', '+998901111222', 'Central Asia Apparel', 'customer', 'referral'),
        ('Sherzod Alimov', 'sherzod@example.com', '+998712222333', 'UzExport Co', 'prospect', 'cold_call')
      ON CONFLICT DO NOTHING;
    `);

    // Seed sample products (wholesale apparel)
    await client.query(`
      INSERT INTO products (name, sku, category, description, size, color, unit_price, stock_quantity, reorder_level, warehouse, supplier, status)
      VALUES
        ('Classic Cotton T-Shirt', 'APP-TS-001', 'apparel', 'Premium 100% cotton crew-neck t-shirt for wholesale', 'M', 'White', 4.50, 1200, 200, 'Main Warehouse', 'Toshkent Textile Ltd', 'active'),
        ('Slim Fit Denim Jeans', 'APP-JN-002', 'apparel', 'Stretch denim jeans, wholesale pack', '32', 'Blue', 12.90, 640, 150, 'Main Warehouse', 'Silk Road Trade', 'active'),
        ('Winter Padded Jacket', 'OUT-JK-003', 'outerwear', 'Insulated waterproof winter jacket', 'L', 'Black', 28.00, 85, 50, 'Warehouse B', 'Central Asia Apparel', 'active'),
        ('Leather Casual Sneakers', 'FW-SN-004', 'footwear', 'Genuine leather lace-up sneakers', '42', 'Brown', 22.50, 8, 30, 'Warehouse B', 'UzExport Co', 'out_of_stock'),
        ('Wool Blend Scarf', 'ACC-SC-005', 'accessories', 'Soft wool-blend winter scarf', 'One Size', 'Grey', 6.75, 430, 100, 'Main Warehouse', 'Fashion House UZ', 'active'),
        ('Cotton Bath Towel Set', 'TX-TW-006', 'textile', 'Absorbent cotton bath towels, set of 3', '70x140', 'Beige', 9.20, 0, 80, 'Main Warehouse', 'Toshkent Textile Ltd', 'out_of_stock')
      ON CONFLICT (sku) DO NOTHING;
    `);

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    client.release();
  }
};

// Test muhitida DB initializatsiyasini o'tkazib yuboramiz (CI/CD uchun)
if (process.env.NODE_ENV !== 'test') {
  initDB();
}

module.exports = pool;
