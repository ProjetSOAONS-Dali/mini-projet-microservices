const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'orders.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    items       TEXT NOT NULL,
    total       REAL NOT NULL,
    status      TEXT DEFAULT 'PENDING',
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db