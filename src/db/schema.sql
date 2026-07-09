-- The Candy Connection — SQLite schema
-- Executed by src/db/database.js on startup (idempotent) and by src/db/seed.js.

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  image_path  TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  price       TEXT,                       -- number as text OR "Price on Request"
  packaging   TEXT,                       -- e.g. "500g Pack", "Box of 24"
  image_path  TEXT,
  is_visible  INTEGER NOT NULL DEFAULT 1, -- boolean (0/1)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  email         TEXT,
  rating        INTEGER NOT NULL,          -- 1..5
  review_text   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved'
  is_verified   INTEGER NOT NULL DEFAULT 0, -- boolean (0/1)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  username              TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  must_change_password  INTEGER NOT NULL DEFAULT 0 -- boolean (0/1)
);

-- Contact-form submissions (backup to WhatsApp). Shown in the admin Inbox.
CREATE TABLE IF NOT EXISTS inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0, -- boolean (0/1)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
