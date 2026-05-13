const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'products.db'));

// Créer la table au démarrage
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL,
    stock       INTEGER DEFAULT 0,
    category    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// Insérer des données de démonstration si la table est vide
const count = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (count.cnt === 0) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, description, price, stock, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insert.run('p1', 'Laptop Pro X',   'Ordinateur haute performance', 1299.99, 15, 'Informatique');
  insert.run('p2', 'Smartphone Y9',  'Téléphone dernière génération', 799.99,  30, 'Mobile');
  insert.run('p3', 'Casque Audio Z', 'Son haute fidélité',           199.99,  50, 'Audio');
  console.log('Données de démonstration insérées dans products');
}

module.exports = db;