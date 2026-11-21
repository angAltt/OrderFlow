-- =============================================================
-- OrderFlow - Seed Data
-- Run AFTER schema.sql. Safe to run again: it wipes and reloads all data.
--
-- Demo credentials:
--   admin@orderflow.dev  / Admin123!   (role: admin)
--   viewer@orderflow.dev / Viewer123!  (role: viewer)
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------
-- Users (bcrypt, cost 10)
-- -------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Alex Morgan', 'admin@orderflow.dev',  '$2b$10$kUFQzmQb95bUnzItNmDvm.oMtNTPB0UrZiGEX9yNpNCVKd2ZtZqKK', 'admin'),
  (2, 'Jamie Chen',  'viewer@orderflow.dev', '$2b$10$7a7VzBm0Ki/eFjJlKc8DrOHlTuWay60/KiQylrlF20ZolYHeXrPni', 'viewer');

-- -------------------------------------------------------------
-- Products (4 of them are below the low-stock threshold of 10)
-- -------------------------------------------------------------
INSERT INTO products (id, sku, name, category, description, price, stock) VALUES
  (1,  'ACC-001', 'Wireless Mouse M240',          'Accessories', 'Silent-click Bluetooth mouse with 18-month battery life.',    24.99, 120),
  (2,  'ACC-002', 'Mechanical Keyboard K8',       'Accessories', 'Hot-swappable 75% layout with brown switches.',               89.00,  45),
  (3,  'ACC-003', 'USB-C Hub 7-in-1',             'Accessories', 'HDMI 4K, 3x USB-A, SD/microSD and 100W passthrough.',         39.50,   8),
  (4,  'DSP-001', '27" 4K IPS Monitor',           'Displays',    '27-inch UHD panel, 99% sRGB, USB-C 65W.',                    329.99,  15),
  (5,  'ACC-004', 'Aluminum Laptop Stand',        'Accessories', 'Adjustable height stand for 10-17 inch laptops.',             34.90,  60),
  (6,  'AUD-001', 'Noise-Cancelling Headphones',  'Audio',       'Over-ear ANC headphones with 30h battery.',                  199.00,   5),
  (7,  'VID-001', 'Full HD 1080p Webcam',         'Video',       '1080p/30fps webcam with dual microphones and privacy cover.', 59.99,  22),
  (8,  'STO-001', 'Portable SSD 1TB',             'Storage',     'USB 3.2 Gen 2 external SSD, up to 1050 MB/s.',               109.00,   3),
  (9,  'FUR-001', 'Ergonomic Office Chair',       'Furniture',   'Mesh back, adjustable lumbar support and 4D armrests.',      249.00,  12),
  (10, 'FUR-002', 'LED Desk Lamp',                'Furniture',   'Dimmable lamp with 5 color modes and USB charging port.',     29.95,   0);

-- -------------------------------------------------------------
-- Orders (totals are calculated from order_items below)
-- -------------------------------------------------------------
INSERT INTO orders (id, order_number, customer_name, customer_email, status, created_by, created_at) VALUES
  (1, 'ORD-1001', 'Emma Johnson',    'emma.johnson@example.com',    'Pending',   1, NOW() - INTERVAL 12 DAY),
  (2, 'ORD-1002', 'Liam Smith',      'liam.smith@example.com',      'Shipped',   1, NOW() - INTERVAL 10 DAY),
  (3, 'ORD-1003', 'Olivia Brown',    'olivia.brown@example.com',    'Delivered', 1, NOW() - INTERVAL 9 DAY),
  (4, 'ORD-1004', 'Noah Davis',      'noah.davis@example.com',      'Cancelled', 1, NOW() - INTERVAL 7 DAY),
  (5, 'ORD-1005', 'Ava Wilson',      'ava.wilson@example.com',      'Pending',   1, NOW() - INTERVAL 5 DAY),
  (6, 'ORD-1006', 'James Taylor',    'james.taylor@example.com',    'Delivered', 1, NOW() - INTERVAL 4 DAY),
  (7, 'ORD-1007', 'Sophia Martinez', 'sophia.martinez@example.com', 'Shipped',   1, NOW() - INTERVAL 2 DAY),
  (8, 'ORD-1008', 'Lucas Anderson',  'lucas.anderson@example.com',  'Delivered', 1, NOW() - INTERVAL 1 DAY);

INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES
  (1, 1,  'Wireless Mouse M240',         24.99, 2),
  (1, 2,  'Mechanical Keyboard K8',      89.00, 1),
  (2, 4,  '27" 4K IPS Monitor',         329.99, 1),
  (2, 5,  'Aluminum Laptop Stand',       34.90, 1),
  (3, 6,  'Noise-Cancelling Headphones',199.00, 1),
  (4, 9,  'Ergonomic Office Chair',     249.00, 1),
  (5, 7,  'Full HD 1080p Webcam',        59.99, 2),
  (5, 3,  'USB-C Hub 7-in-1',            39.50, 1),
  (6, 8,  'Portable SSD 1TB',           109.00, 1),
  (6, 1,  'Wireless Mouse M240',         24.99, 1),
  (7, 10, 'LED Desk Lamp',               29.95, 2),
  (7, 5,  'Aluminum Laptop Stand',       34.90, 1),
  (8, 2,  'Mechanical Keyboard K8',      89.00, 1),
  (8, 4,  '27" 4K IPS Monitor',         329.99, 1);

UPDATE orders o
SET o.total_amount = (
  SELECT COALESCE(SUM(oi.subtotal), 0)
  FROM order_items oi
  WHERE oi.order_id = o.id
)
WHERE o.id > 0; -- explicit key filter so it also runs with MySQL Workbench "safe updates" on

-- Keep AUTO_INCREMENT aligned with seeded IDs
ALTER TABLE users       AUTO_INCREMENT = 3;
ALTER TABLE products    AUTO_INCREMENT = 11;
ALTER TABLE orders      AUTO_INCREMENT = 9;
