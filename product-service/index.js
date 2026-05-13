const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// Charger le proto
const PROTO_PATH = path.join(__dirname, '../proto/product.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const productProto = grpc.loadPackageDefinition(packageDef).product;

// ── Implémentation des méthodes gRPC ──────────────────────────────────────────

const getProduct = (call, callback) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?')
                      .get(call.request.product_id);
    if (!product) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Produit introuvable' });
    }
    callback(null, { product });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const searchProducts = (call, callback) => {
  try {
    const { query, category } = call.request;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    if (query)    { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${query}%`, `%${query}%`); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    const products = db.prepare(sql).all(...params);
    callback(null, { products });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const createProduct = (call, callback) => {
  try {
    const { name, description, price, stock, category } = call.request;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, name, description, price, stock, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, price, stock, category);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    callback(null, { product });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const updateProduct = (call, callback) => {
  try {
    const { product_id, name, description, price, stock } = call.request;
    db.prepare(`
      UPDATE products SET name = ?, description = ?, price = ?, stock = ?
      WHERE id = ?
    `).run(name, description, price, stock, product_id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return callback({ code: grpc.status.NOT_FOUND, message: 'Produit introuvable' });
    callback(null, { product });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const deleteProduct = (call, callback) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(call.request.product_id);
    if (result.changes === 0) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Produit introuvable' });
    }
    callback(null, { success: true, message: 'Produit supprimé avec succès' });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

// ── Démarrer le serveur gRPC ──────────────────────────────────────────────────

const server = new grpc.Server();
server.addService(productProto.ProductService.service, {
  getProduct, searchProducts, createProduct, updateProduct, deleteProduct,
});

const PORT = 50051;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) { console.error(' Erreur démarrage ProductService:', err); return; }
  console.log(` ProductService gRPC démarré sur le port ${PORT}`);
});