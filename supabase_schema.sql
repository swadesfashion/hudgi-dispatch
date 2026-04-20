-- ============================================================
-- HUDGI DISPATCH — SUPABASE SCHEMA
-- Run this in your Supabase SQL editor (once)
-- ============================================================

-- Orders table: one row per Shopify order
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no        TEXT NOT NULL,          -- e.g. #3561
  customer_name   TEXT,
  phone           TEXT,
  address1        TEXT,
  address2        TEXT,
  city            TEXT,
  pincode         TEXT,
  state           TEXT,
  product_name    TEXT,
  subtotal        NUMERIC,
  shipping        NUMERIC,
  total           NUMERIC,
  payment_method  TEXT,
  channel         TEXT,                   -- 'shopify', 'amazon', etc.
  shopify_created_at TIMESTAMPTZ,
  import_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  imported_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_no)
);

-- Dispatches table: one row per dispatched order (after barcode scan)
CREATE TABLE IF NOT EXISTS dispatches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_no        TEXT NOT NULL,
  barcode         TEXT,                   -- India Post barcode (scanned)
  weight_grams    INTEGER DEFAULT 250,
  length_cm       NUMERIC DEFAULT 27,
  breadth_cm      NUMERIC DEFAULT 18,
  height_cm       NUMERIC DEFAULT 2,
  cod_type        TEXT,                   -- 'COD' or ''
  cod_value       NUMERIC DEFAULT 0,
  dispatch_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  dispatched_at   TIMESTAMPTZ DEFAULT NOW(),
  label_printed   BOOLEAN DEFAULT FALSE,
  ip_exported     BOOLEAN DEFAULT FALSE,  -- exported to India Post tracker
  UNIQUE(order_no, dispatch_date)
);

-- Settings table: key-value store for app config
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('sender_name',    'The S.W.A.D.E.S Style, Truly Indic Fashion'),
  ('sender_address', 'Bengaluru, Karnataka – 560001'),
  ('sender_phone',   '9876543210'),
  ('sender_gstin',   '29XXXXXXXXXXXZ'),
  ('default_weight', '250'),
  ('default_length', '27'),
  ('default_breadth','18'),
  ('default_height', '2')
ON CONFLICT (key) DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_import_date  ON orders(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_no      ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_dispatches_date      ON dispatches(dispatch_date DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_barcode   ON dispatches(barcode);

-- Row Level Security: disable for now (shared-password app, no user-level auth)
ALTER TABLE orders     DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings   DISABLE ROW LEVEL SECURITY;
