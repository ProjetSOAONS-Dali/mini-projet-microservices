const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { publishOrderCreated, publishOrderUpdated } = require('./kafkaProducer');

const PROTO_PATH = path.join(__dirname, '../proto/order.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const orderProto = grpc.loadPackageDefinition(packageDef).order;

// ── Méthodes gRPC ─────────────────────────────────────────────────────────────

const getOrder = (call, callback) => {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(call.request.order_id);
    if (!row) return callback({ code: grpc.status.NOT_FOUND, message: 'Commande introuvable' });
    const order = { ...row, items: JSON.parse(row.items) };
    callback(null, { order });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const getOrdersByCustomer = (call, callback) => {
  try {
    const rows = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC')
                   .all(call.request.customer_id);
    const orders = rows.map(r => ({ ...r, items: JSON.parse(r.items) }));
    callback(null, { orders });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const createOrder = async (call, callback) => {
  try {
    const { customer_id, items } = call.request;
    const id    = uuidv4();
    const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    db.prepare(`
      INSERT INTO orders (id, customer_id, items, total, status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `).run(id, customer_id, JSON.stringify(items), total);

    const order = { id, customer_id, items, total, status: 'PENDING', created_at: new Date().toISOString() };

    // Publier l'événement Kafka
    await publishOrderCreated(order);

    callback(null, { order });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

const updateOrderStatus = async (call, callback) => {
  try {
    const { order_id, status } = call.request;
    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Statut invalide' });
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order_id);
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!row) return callback({ code: grpc.status.NOT_FOUND, message: 'Commande introuvable' });
    const order = { ...row, items: JSON.parse(row.items) };

    // Publier l'événement Kafka
    await publishOrderUpdated(order);

    callback(null, { order });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
};

// ── Démarrer le serveur gRPC ──────────────────────────────────────────────────

const server = new grpc.Server();
server.addService(orderProto.OrderService.service, {
  getOrder, getOrdersByCustomer, createOrder, updateOrderStatus,
});

const PORT = 50052;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) { console.error(' Erreur démarrage OrderService:', err); return; }
  console.log(` OrderService gRPC démarré sur le port ${PORT}`);
});