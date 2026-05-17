// api-gateway/index.js — VERSION FINALE AVEC SSE TEMPS RÉEL
const express      = require('express');
const { ApolloServer }     = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const cors         = require('cors');
const grpc         = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');
const fs           = require('fs');
const path         = require('path');
const resolvers    = require('./resolvers');
const { sseHandler, pushToClient } = require('./sse');

const app = express();
app.use(cors());
app.use(express.json());

// ── Clients gRPC ──────────────────────────────────────────────────
const load = (file) => {
  const def = protoLoader.loadSync(
    path.join(__dirname, '../proto', file),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
  );
  return grpc.loadPackageDefinition(def);
};

const productClient = new (load('product.proto').product.ProductService)('localhost:50051', grpc.credentials.createInsecure());
const orderClient   = new (load('order.proto').order.OrderService)('localhost:50052', grpc.credentials.createInsecure());
const notifClient   = new (load('notification.proto').notification.NotificationService)('localhost:50053', grpc.credentials.createInsecure());

const rpc = (client, method, req) =>
  new Promise((res, rej) => client[method](req, (err, r) => (err ? rej(err) : res(r))));

// ── REST — PRODUCTS ───────────────────────────────────────────────
app.get('/products', async (req, res) => {
  try {
    const r = await rpc(productClient, 'searchProducts', { query: req.query.q||'', category: req.query.category||'' });
    res.json({ success: true, count: r.products.length, data: r.products });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

app.get('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'getProduct', { product_id: req.params.id });
    res.json({ success: true, data: r.product });
  } catch(e){ res.status(e.code===5?404:500).json({ success: false, error: e.message }); }
});

app.post('/products', async (req, res) => {
  try {
    const r = await rpc(productClient, 'createProduct', req.body);
    res.status(201).json({ success: true, data: r.product });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

app.put('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'updateProduct', { product_id: req.params.id, ...req.body });
    res.json({ success: true, data: r.product });
  } catch(e){ res.status(e.code===5?404:500).json({ success: false, error: e.message }); }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'deleteProduct', { product_id: req.params.id });
    res.json({ success: true, message: r.message });
  } catch(e){ res.status(e.code===5?404:500).json({ success: false, error: e.message }); }
});

// ── REST — ORDERS ─────────────────────────────────────────────────
app.post('/orders', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'createOrder', req.body);
    res.status(201).json({ success: true, data: r.order });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'getOrder', { order_id: req.params.id });
    res.json({ success: true, data: r.order });
  } catch(e){ res.status(e.code===5?404:500).json({ success: false, error: e.message }); }
});

app.patch('/orders/:id/status', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'updateOrderStatus', { order_id: req.params.id, status: req.body.status });
    res.json({ success: true, data: r.order });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

app.get('/customers/:customerId/orders', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'getOrdersByCustomer', { customer_id: req.params.customerId });
    res.json({ success: true, count: r.orders.length, data: r.orders });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

// ── REST — NOTIFICATIONS ──────────────────────────────────────────
app.get('/notifications/:customerId', async (req, res) => {
  try {
    const r = await rpc(notifClient, 'getNotifications', { customer_id: req.params.customerId });
    res.json({ success: true, count: r.notifications.length, data: r.notifications });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

app.patch('/notifications/:id/read', async (req, res) => {
  try {
    const r = await rpc(notifClient, 'markAsRead', { notification_id: req.params.id });
    res.json({ success: true, read: r.success });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

// ── SSE — NOTIFICATIONS TEMPS RÉEL ───────────────────────────────
// Le frontend se connecte à GET /events/:customerId
// et reçoit les nouvelles notifications en push (sans polling client)
app.get('/events/:customerId', sseHandler);

// Polling interne côté serveur (toutes les 2s) :
// vérifie les nouvelles notifications et les pousse via SSE
const notifCache = new Map(); // customerId → Set d'IDs déjà poussés

setInterval(async () => {
  const { sseClients } = require('./sse');
  for (const [customerId] of sseClients) {
    if (!notifCache.has(customerId)) notifCache.set(customerId, new Set());
    const seen = notifCache.get(customerId);
    try {
      const r = await rpc(notifClient, 'getNotifications', { customer_id: customerId });
      r.notifications
        .filter(n => !seen.has(n.id) && !n.read)
        .forEach(n => {
          seen.add(n.id);
          pushToClient(customerId, n);
          console.log(`📤 SSE push → ${customerId} : [${n.type}]`);
        });
    } catch { /* NotificationService pas encore démarré */ }
  }
}, 2000);

console.log('✅ SSE polling démarré (intervalle 2s)');

// ── GraphQL ───────────────────────────────────────────────────────
const typeDefs     = fs.readFileSync(path.join(__dirname, 'schema.gql'), 'utf8');
const apolloServer = new ApolloServer({ typeDefs, resolvers });
apolloServer.start().then(() => {
  app.use('/graphql', expressMiddleware(apolloServer));
  console.log('✅ GraphQL → http://localhost:3000/graphql');
});

// ── Frontend statique ─────────────────────────────────────────────
// Sert automatiquement frontend/index.html sur http://localhost:3000
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Démarrer ──────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway     → http://localhost:${PORT}`);
  console.log(`🎨 Frontend        → http://localhost:${PORT}/index.html`);
  console.log(`📡 SSE events      → http://localhost:${PORT}/events/:customerId`);
  console.log(`🔷 GraphQL         → http://localhost:${PORT}/graphql`);
  console.log('──────────────────────────────────────────────');
});