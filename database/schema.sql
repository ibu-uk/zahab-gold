-- ============================================================
--  ZAHAB GOLD MANAGEMENT SYSTEM — MySQL Schema v2.0
--  Compatible with MySQL 8.0+
--  Default admin login: admin@zahab.com / Admin@1234
-- ============================================================

CREATE DATABASE IF NOT EXISTS zahab_gold CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zahab_gold;

-- ─── COUNTRIES & BRANCHES ────────────────────────────────────
CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code CHAR(2) NOT NULL UNIQUE,
  flag VARCHAR(10),
  currency_code CHAR(3) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  country_id INT NOT NULL,
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(150),
  manager_name VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

-- ─── USERS & ROLES ───────────────────────────────────────────
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  role_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ─── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  nationality VARCHAR(80),
  id_number VARCHAR(50),
  address TEXT,
  loyalty_points INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ─── GOLD RATES & CURRENCIES ─────────────────────────────────
CREATE TABLE gold_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  usd_per_oz DECIMAL(10,4) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_date (date),
  INDEX idx_date (date)
);

CREATE TABLE currencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code CHAR(3) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  symbol VARCHAR(10),
  rate_to_usd DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
  is_gcc TINYINT(1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE karat_making_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  category VARCHAR(60) NOT NULL,
  karat VARCHAR(10) NOT NULL,
  making_pct DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branch_cat_karat (branch_id, category, karat),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ─── ITEM CATALOG ────────────────────────────────────────────
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  name_ar VARCHAR(80),
  icon VARCHAR(10),
  sort_order INT DEFAULT 0
);

CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  category_id INT NOT NULL,
  karat VARCHAR(10) NOT NULL,
  weight_grams DECIMAL(10,4) NOT NULL,
  making_pct DECIMAL(5,2) DEFAULT 8.00,
  description TEXT,
  description_ar TEXT,
  is_active TINYINT(1) DEFAULT 1,
  is_special_order TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_sku (sku),
  INDEX idx_karat (karat),
  INDEX idx_active (is_active)
);

CREATE TABLE item_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE item_branch_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  branch_id INT NOT NULL,
  qty INT DEFAULT 0,
  min_qty INT DEFAULT 1,
  UNIQUE KEY uq_item_branch (item_id, branch_id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ─── INVOICES & SALES ────────────────────────────────────────
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  customer_id INT,
  user_id INT NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'KWD',
  exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
  gold_rate_usd DECIMAL(10,4) NOT NULL,
  subtotal DECIMAL(14,4) NOT NULL DEFAULT 0,
  making_total DECIMAL(14,4) NOT NULL DEFAULT 0,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(14,4) DEFAULT 0,
  vat_pct DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(14,4) NOT NULL DEFAULT 0,
  total DECIMAL(14,4) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','card','bank_transfer','knet','installment') DEFAULT 'cash',
  payment_status ENUM('paid','pending','partial','refunded') DEFAULT 'paid',
  notes TEXT,
  notes_ar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_branch_date (branch_id, created_at),
  INDEX idx_status (payment_status)
);

CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  item_id INT,
  name VARCHAR(200) NOT NULL,
  karat VARCHAR(10) NOT NULL,
  weight_grams DECIMAL(10,4) NOT NULL,
  making_pct DECIMAL(5,2) DEFAULT 8.00,
  gold_rate_used DECIMAL(10,4) NOT NULL,
  unit_price DECIMAL(14,4) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  line_total DECIMAL(14,4) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- ─── RETURNS / REFUNDS ────────────────────────────────────────
CREATE TABLE returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(40) NOT NULL UNIQUE,
  invoice_id INT NOT NULL,
  branch_id INT NOT NULL,
  customer_id INT,
  user_id INT NOT NULL,
  reason TEXT,
  return_type ENUM('full','partial') DEFAULT 'full',
  refund_amount DECIMAL(14,4) DEFAULT 0,
  currency_code CHAR(3) DEFAULT 'KWD',
  refund_method ENUM('cash','card','store_credit','bank_transfer') DEFAULT 'cash',
  status ENUM('pending','approved','completed','rejected') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_invoice (invoice_id),
  INDEX idx_status (status)
);

CREATE TABLE return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  invoice_item_id INT,
  item_id INT,
  name VARCHAR(200) NOT NULL,
  karat VARCHAR(10),
  weight_grams DECIMAL(10,4) DEFAULT 0,
  qty INT DEFAULT 1,
  refund_amount DECIMAL(14,4) DEFAULT 0,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
);

-- ─── BUYBACKS (Purchase from customer) ───────────────────────
CREATE TABLE buybacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyback_number VARCHAR(40) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  customer_id INT,
  user_id INT NOT NULL,
  item_description VARCHAR(200),
  category VARCHAR(80),
  karat VARCHAR(10) NOT NULL,
  gross_weight DECIMAL(10,4) NOT NULL,
  net_weight DECIMAL(10,4),
  deduction_pct DECIMAL(5,2) DEFAULT 0,
  purity_tested TINYINT(1) DEFAULT 0,
  gold_rate_usd DECIMAL(10,4) NOT NULL,
  exchange_rate DECIMAL(12,6) DEFAULT 1,
  amount_paid DECIMAL(14,4) NOT NULL,
  currency_code CHAR(3) DEFAULT 'KWD',
  payment_method ENUM('cash','bank_transfer') DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_branch_date (branch_id, created_at)
);

-- ─── SUPPLIERS ────────────────────────────────────────────────
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150),
  country VARCHAR(80),
  city VARCHAR(80),
  phone VARCHAR(30),
  email VARCHAR(150),
  contact_person VARCHAR(100),
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── PURCHASE ORDERS (Stock Intake) ──────────────────────────
CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(40) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  supplier_id INT,
  user_id INT NOT NULL,
  status ENUM('draft','ordered','received','cancelled') DEFAULT 'draft',
  total_cost DECIMAL(14,4) DEFAULT 0,
  currency_code CHAR(3) DEFAULT 'KWD',
  order_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  item_id INT,
  name VARCHAR(200) NOT NULL,
  karat VARCHAR(10),
  weight_grams DECIMAL(10,4) DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  unit_cost DECIMAL(14,4) DEFAULT 0,
  total_cost DECIMAL(14,4) DEFAULT 0,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- ─── SPECIAL ORDERS ──────────────────────────────────────────
CREATE TABLE special_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  customer_id INT,
  user_id INT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT,
  karat VARCHAR(10) NOT NULL,
  approx_weight DECIMAL(10,4),
  advance_amount DECIMAL(14,4) DEFAULT 0,
  advance_currency CHAR(3) DEFAULT 'KWD',
  estimated_total DECIMAL(14,4),
  currency_code CHAR(3) DEFAULT 'KWD',
  due_date DATE,
  status ENUM('pending','design','fabrication','quality','ready','delivered','cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_branch (branch_id)
);

CREATE TABLE special_order_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES special_orders(id) ON DELETE CASCADE
);

CREATE TABLE special_order_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(60) NOT NULL,
  notes TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES special_orders(id) ON DELETE CASCADE
);

-- ─── STOCK TRANSFERS ─────────────────────────────────────────
CREATE TABLE stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_branch_id INT NOT NULL,
  to_branch_id INT NOT NULL,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  status ENUM('pending','in_transit','received','cancelled') DEFAULT 'received',
  notes TEXT,
  transfer_date DATE,
  received_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  FOREIGN KEY (to_branch_id)   REFERENCES branches(id),
  FOREIGN KEY (user_id)        REFERENCES users(id),
  FOREIGN KEY (item_id)        REFERENCES items(id)
);

-- ─── INSTALLMENTS ────────────────────────────────────────────
CREATE TABLE installment_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_number VARCHAR(40) NOT NULL UNIQUE,
  invoice_id INT NOT NULL,
  customer_id INT,
  branch_id INT,
  total_amount DECIMAL(14,4) NOT NULL,
  down_payment DECIMAL(14,4) DEFAULT 0,
  remaining_amount DECIMAL(14,4) NOT NULL,
  num_installments INT NOT NULL DEFAULT 12,
  installment_amount DECIMAL(14,4) NOT NULL,
  currency_code CHAR(3) DEFAULT 'KWD',
  start_date DATE NOT NULL,
  status ENUM('active','completed','defaulted','cancelled') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE installment_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(14,4) NOT NULL,
  paid_amount DECIMAL(14,4) DEFAULT 0,
  paid_date DATE,
  status ENUM('pending','paid','overdue','partial') DEFAULT 'pending',
  payment_method ENUM('cash','card','bank_transfer','knet') DEFAULT 'cash',
  received_by INT,
  notes TEXT,
  FOREIGN KEY (plan_id) REFERENCES installment_plans(id) ON DELETE CASCADE,
  INDEX idx_due (due_date),
  INDEX idx_status (status)
);

-- ─── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(150),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(80),
  record_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at),
  INDEX idx_user (user_id),
  INDEX idx_module (module)
);

-- ─── HELD SALES ───────────────────────────────────────────────
CREATE TABLE held_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  user_id INT,
  label VARCHAR(100),
  cart_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  setting_key VARCHAR(80) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branch_key (branch_id, setting_key),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ─────────────────────────────────────────────────────────────
--  SEED DATA
-- ─────────────────────────────────────────────────────────────

INSERT INTO countries (name, code, flag, currency_code, vat_rate) VALUES
('Kuwait',       'KW', '🇰🇼', 'KWD', 0.00),
('Saudi Arabia', 'SA', '🇸🇦', 'SAR', 15.00),
('UAE',          'AE', '🇦🇪', 'AED', 5.00),
('Bahrain',      'BH', '🇧🇭', 'BHD', 10.00),
('Qatar',        'QA', '🇶🇦', 'QAR', 0.00),
('Oman',         'OM', '🇴🇲', 'OMR', 5.00);

INSERT INTO branches (name, country_id, city, phone, email, manager_name) VALUES
('Kuwait City Main', 1, 'Kuwait City', '+965-2200-0001', 'kw-main@zahab.com', 'Ahmad Al-Rashidi'),
('Salmiya Branch',   1, 'Salmiya',     '+965-2200-0002', 'kw-salm@zahab.com', 'Sara Al-Mansouri'),
('Riyadh Branch',    2, 'Riyadh',      '+966-11-000-0001','sa-riyad@zahab.com','Mohammed Al-Harbi'),
('Dubai Branch',     3, 'Dubai',       '+971-4-000-0001', 'ae-dubai@zahab.com','Fatima Al-Kuwari'),
('Manama Branch',    4, 'Manama',      '+973-1700-0001',  'bh-manam@zahab.com','Khalid Al-Otaibi'),
('Doha Branch',      5, 'Doha',        '+974-4000-0001',  'qa-doha@zahab.com', 'Noor Al-Ansari'),
('Muscat Branch',    6, 'Muscat',      '+968-2400-0001',  'om-muscat@zahab.com','Hessa Al-Najjar');

INSERT INTO roles (name, permissions) VALUES
('admin',     '["all"]'),
('manager',   '["sales","invoices","orders","reports","items","customers","buybacks","returns","purchases"]'),
('cashier',   '["sales","invoices","orders","customers","buybacks"]'),
('inventory', '["items","stock","purchases"]');

-- Password: Admin@1234
INSERT INTO users (branch_id, role_id, name, email, password_hash, phone) VALUES
(1, 1, 'Super Admin', 'admin@zahab.com', '$2b$10$vfoJoaXCOpv1dx1IweqB5eVveQcgkZ203P.rfJ2ZS8tcz7XS5M4xK', '+965-9999-0000');

INSERT INTO currencies (code, name, symbol, rate_to_usd, is_gcc) VALUES
('KWD', 'Kuwaiti Dinar',  'KD',  0.308000, 1),
('SAR', 'Saudi Riyal',    'SR',  3.750000, 1),
('AED', 'UAE Dirham',     'AED', 3.670000, 1),
('BHD', 'Bahraini Dinar', 'BD',  0.376000, 1),
('QAR', 'Qatari Riyal',   'QR',  3.640000, 1),
('OMR', 'Omani Rial',     'OMR', 0.385000, 1),
('USD', 'US Dollar',      '$',   1.000000, 0),
('EUR', 'Euro',           '€',   0.920000, 0),
('GBP', 'British Pound',  '£',   0.790000, 0);

INSERT INTO categories (name, name_ar, icon, sort_order) VALUES
('Rings',     'خواتم',       '💍', 1),
('Necklaces', 'قلادات',      '📿', 2),
('Bracelets', 'أساور',       '📿', 3),
('Earrings',  'أقراط',       '💎', 4),
('Coins',     'عملات',       '🪙', 5),
('Bars',      'سبائك',       '🥇', 6),
('Pendants',  'تعليقات',     '💎', 7),
('Sets',      'طقم مجوهرات', '👑', 8);

INSERT INTO gold_rates (date, usd_per_oz, source) VALUES (CURDATE(), 3200.00, 'manual');

INSERT INTO karat_making_charges (branch_id, category, karat, making_pct) VALUES
(NULL,'Rings',    '24K',2.0),(NULL,'Rings','22K',8.0),(NULL,'Rings','21K',8.0),(NULL,'Rings','18K',10.0),(NULL,'Rings','14K',12.0),
(NULL,'Necklaces','24K',2.0),(NULL,'Necklaces','22K',9.0),(NULL,'Necklaces','21K',10.0),(NULL,'Necklaces','18K',11.0),(NULL,'Necklaces','14K',13.0),
(NULL,'Bracelets','24K',2.0),(NULL,'Bracelets','22K',9.0),(NULL,'Bracelets','21K',9.0),(NULL,'Bracelets','18K',10.0),(NULL,'Bracelets','14K',12.0),
(NULL,'Earrings', '24K',2.0),(NULL,'Earrings','22K',11.0),(NULL,'Earrings','21K',12.0),(NULL,'Earrings','18K',13.0),(NULL,'Earrings','14K',15.0),
(NULL,'Coins',    '24K',1.0),(NULL,'Coins','22K',1.5),
(NULL,'Bars',     '24K',0.5),(NULL,'Bars','22K',1.0),
(NULL,'Pendants', '24K',2.0),(NULL,'Pendants','22K',10.0),(NULL,'Pendants','21K',10.0),(NULL,'Pendants','18K',12.0),
(NULL,'Sets',     '21K',9.0),(NULL,'Sets','18K',11.0);

INSERT INTO settings (branch_id, setting_key, setting_value) VALUES
(NULL,'shop_name','Zahab Gold & Jewelry'),
(NULL,'shop_name_ar','ذهب للمجوهرات والذهب'),
(NULL,'invoice_prefix','ZHB-'),
(NULL,'default_currency','KWD'),
(NULL,'vat_rate','0'),
(NULL,'invoice_language','bilingual'),
(NULL,'show_gold_rate_on_invoice','1'),
(NULL,'logo_on_invoice','1'),
(NULL,'loyalty_rate','10'),
(NULL,'session_timeout_minutes','30');
