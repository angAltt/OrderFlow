-- =============================================================
-- OrderFlow - Database Schema
-- Engine: MySQL 8.0+ (InnoDB, utf8mb4)
--
-- Runs against the database you connect to, so it also works on
-- hosted MySQL (Railway, Aiven, etc.) where the database already exists.
-- WARNING: drops and recreates the OrderFlow tables.
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- products
-- -------------------------------------------------------------
CREATE TABLE products (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  sku         VARCHAR(50)    NOT NULL,
  name        VARCHAR(150)   NOT NULL,
  category    VARCHAR(80)    NOT NULL DEFAULT 'General',
  description TEXT           NULL,
  price       DECIMAL(10, 2) NOT NULL,
  stock       INT UNSIGNED   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_stock (stock),
  KEY idx_products_category (category),
  CONSTRAINT chk_products_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- orders
-- order_number is assigned right after insert (ORD-<1000 + id>)
-- inside the same transaction, so it is nullable at insert time.
-- -------------------------------------------------------------
CREATE TABLE orders (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_number   VARCHAR(20)    NULL,
  customer_name  VARCHAR(120)   NOT NULL,
  customer_email VARCHAR(150)   NULL,
  status         ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  total_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_by     INT UNSIGNED   NULL,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_status (status),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- order_items
-- product_name / unit_price are snapshots taken at purchase time,
-- so deleting or repricing a product never alters order history.
-- -------------------------------------------------------------
CREATE TABLE order_items (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id     INT UNSIGNED   NOT NULL,
  product_id   INT UNSIGNED   NULL,
  product_name VARCHAR(150)   NOT NULL,
  unit_price   DECIMAL(10, 2) NOT NULL,
  quantity     INT UNSIGNED   NOT NULL,
  subtotal     DECIMAL(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT chk_order_items_qty CHECK (quantity > 0),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
