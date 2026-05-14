const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');

const app = express();
app.use(cors());
app.use(express.json());

// ── Clients gRPC ──────────────────────────────────────────────────────────────

const load = (file) => {
  const def = protoLoader.loadSync(
    path.join(__dirname, '../proto', file),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
  );
  return grpc.loadPackageDefinition(def);
};

const productClient = new (load('product.proto').product.ProductService)(
  'localhost:50051', grpc.credentials.createInsecure()
);
const orderClient = new (load('order.proto').order.OrderService)(
  'localhost:50052', grpc.credentials.createInsecure()
);
const notifClient = new (load('notification.proto').notification.NotificationService)(
  'localhost:50053', grpc.credentials.createInsecure()
);

const rpc = (client, method, req) =>
  new Promise((res, rej) =>
    client[method](req, (err, r) => (err ? rej(err) : res(r)))
  );

// ── REST — Products ───────────────────────────────────────────────────────────

app.get('/products', async (req, res) => {
  try {
    const r = await rpc(productClient, 'searchProducts', {
      query: req.query.q || '', category: req.query.category || '',
    });
    res.json({ success: true, count: r.products.length, data: r.products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'getProduct', { product_id: req.params.id });
    res.json({ success: true, data: r.product });
  } catch (err) {
    res.status(err.code === 5 ? 404 : 500).json({ success: false, error: err.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    const r = await rpc(productClient, 'createProduct', req.body);
    res.status(201).json({ success: true, data: r.product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'updateProduct', { product_id: req.params.id, ...req.body });
    res.json({ success: true, data: r.product });
  } catch (err) {
    res.status(err.code === 5 ? 404 : 500).json({ success: false, error: err.message });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const r = await rpc(productClient, 'deleteProduct', { product_id: req.params.id });
    res.json({ success: true, message: r.message });
  } catch (err) {
    res.status(err.code === 5 ? 404 : 500).json({ success: false, error: err.message });
  }
});

// ── REST — Orders ─────────────────────────────────────────────────────────────

app.post('/orders', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'createOrder', req.body);
    res.status(201).json({ success: true, data: r.order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'getOrder', { order_id: req.params.id });
    res.json({ success: true, data: r.order });
  } catch (err) {
    res.status(err.code === 5 ? 404 : 500).json({ success: false, error: err.message });
  }
});

app.patch('/orders/:id/status', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'updateOrderStatus', {
      order_id: req.params.id, status: req.body.status,
    });
    res.json({ success: true, data: r.order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/customers/:customerId/orders', async (req, res) => {
  try {
    const r = await rpc(orderClient, 'getOrdersByCustomer', { customer_id: req.params.customerId });
    res.json({ success: true, count: r.orders.length, data: r.orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── REST — Notifications ──────────────────────────────────────────────────────

app.get('/notifications/:customerId', async (req, res) => {
  try {
    const r = await rpc(notifClient, 'getNotifications', { customer_id: req.params.customerId });
    res.json({ success: true, count: r.notifications.length, data: r.notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/notifications/:id/read', async (req, res) => {
  try {
    const r = await rpc(notifClient, 'markAsRead', { notification_id: req.params.id });
    res.json({ success: true, read: r.success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GraphQL ───────────────────────────────────────────────────────────────────

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.gql'), 'utf8');
const apolloServer = new ApolloServer({ typeDefs, resolvers });

apolloServer.start().then(() => {
  app.use('/graphql', expressMiddleware(apolloServer));
  console.log(' GraphQL disponible sur http://localhost:3000/graphql');
});

// ── Démarrer le serveur ───────────────────────────────────────────────────────

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n API Gateway démarré sur http://localhost:${PORT}`);
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('  GET    /products                  GET    /products/:id');
  console.log('  POST   /products                  PUT    /products/:id');
  console.log('  DELETE /products/:id');
  console.log('  POST   /orders                    GET    /orders/:id');
  console.log('  PATCH  /orders/:id/status         GET    /customers/:id/orders');
  console.log('  GET    /notifications/:customerId  PATCH  /notifications/:id/read');
  console.log('  POST   /graphql');
  console.log('──────────────────────────────────────────────────────────────────');
});
