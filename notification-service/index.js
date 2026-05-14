const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const { getDB, initDB } = require('./db');
const { startConsumer } = require('./kafkaConsumer');

const PROTO_PATH = path.join(__dirname, '../proto/notification.proto');

const pkg = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const notifProto = grpc.loadPackageDefinition(pkg).notification;

// ─────────────────────────────────────────────
// Handlers gRPC
// ─────────────────────────────────────────────

const getNotifications = async (call, callback) => {
  try {
    const db = await getDB();

    const docs = await db.notifications.find({
      selector: {
        customer_id: call.request.customer_id,
      },
    }).exec();

    const notifications = docs
      .map(doc => doc.toJSON())
      .sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      );

    callback(null, { notifications });

  } catch (e) {
    console.error(e);

    callback({
      code: grpc.status.INTERNAL,
      message: e.message,
    });
  }
};

const markAsRead = async (call, callback) => {
  try {
    const db = await getDB();

    const doc = await db.notifications
      .findOne(call.request.notification_id)
      .exec();

    if (!doc) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Notification introuvable',
      });
    }

    await doc.patch({
      read: true,
    });

    callback(null, {
      success: true,
    });

  } catch (e) {
    console.error(e);

    callback({
      code: grpc.status.INTERNAL,
      message: e.message,
    });
  }
};

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const start = async () => {
  try {

    // IMPORTANT
    await initDB();

    // Start Kafka consumer
    await startConsumer();

    const server = new grpc.Server();

    server.addService(
      notifProto.NotificationService.service,
      {
        getNotifications,
        markAsRead,
      }
    );

    const PORT = 50053;

    server.bindAsync(
      `0.0.0.0:${PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          console.error('❌ NotificationService:', err);
          return;
        }

        console.log(
          `✅ NotificationService gRPC démarré → port ${PORT}`
        );

        server.start();
      }
    );

  } catch (err) {
    console.error('❌ Erreur démarrage service:', err);
  }
};

start();