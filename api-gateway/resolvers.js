const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

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

// ── Resolvers GraphQL ─────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    product:          (_, { id })              => rpc(productClient, 'getProduct',          { product_id: id }).then(r => r.product),
    products:         (_, { query, category }) => rpc(productClient, 'searchProducts',      { query: query || '', category: category || '' }).then(r => r.products),
    order:            (_, { id })              => rpc(orderClient,   'getOrder',            { order_id: id }).then(r => r.order),
    ordersByCustomer: (_, { customer_id })     => rpc(orderClient,   'getOrdersByCustomer', { customer_id }).then(r => r.orders),
    notifications:    (_, { customer_id })     => rpc(notifClient,   'getNotifications',    { customer_id }).then(r => r.notifications),
  },
  Mutation: {
    createProduct:          (_, args)                 => rpc(productClient, 'createProduct',     args).then(r => r.product),
    updateProduct:          (_, { id, ...rest })      => rpc(productClient, 'updateProduct',     { product_id: id, ...rest }).then(r => r.product),
    deleteProduct:          (_, { id })               => rpc(productClient, 'deleteProduct',     { product_id: id }).then(r => r.success),
    createOrder:            (_, args)                 => rpc(orderClient,   'createOrder',       args).then(r => r.order),
    updateOrderStatus:      (_, { order_id, status }) => rpc(orderClient,   'updateOrderStatus', { order_id, status }).then(r => r.order),
    markNotificationAsRead: (_, { notification_id })  => rpc(notifClient,   'markAsRead',        { notification_id }).then(r => r.success),
  },
};

module.exports = resolvers;
