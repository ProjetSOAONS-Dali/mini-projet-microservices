// notification-service/kafkaConsumer.js
const { Kafka }    = require('kafkajs');
const { v4: uuid } = require('uuid');
const { getDB }    = require('./db');

const kafka    = new Kafka({ clientId: 'notification-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'notification-group' });

const STATUS_LABELS = {
  CONFIRMED: 'confirmée ✅ — en cours de préparation',
  SHIPPED:   'expédiée 🚚 — en route vers vous',
  DELIVERED: 'livrée 🎉 — profitez bien !',
  CANCELLED: 'annulée ❌',
};

const startConsumer = async () => {
  await consumer.connect();
  console.log('✅ Kafka Consumer (NotificationService) connecté');

  await consumer.subscribe({
    topics:        ['order-created', 'order-updated'],
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let event;
      try {
        event = JSON.parse(message.value?.toString());
      } catch {
        console.warn('⚠️ Message Kafka ignoré (non-JSON)');
        return;
      }

      const db  = await getDB();
      const col = db.notifications;
      const now = new Date().toISOString();
      const shortId = event.order_id?.slice(0, 8) ?? '?';

      if (topic === 'order-created') {
        const total = typeof event.total === 'number'
          ? event.total.toFixed(2) : event.total;
        await col.insert({
          id:          uuid(),
          type:        'ORDER_CREATED',
          message:     `✅ Commande #${shortId} créée — Total : ${total} DT`,
          order_id:    event.order_id,
          customer_id: event.customer_id,
          read:        false,
          created_at:  now,
        });
        console.log(`🔔 [ORDER_CREATED] → client ${event.customer_id}`);
      }

      if (topic === 'order-updated') {
        const label = STATUS_LABELS[event.new_status] ?? `mise à jour : ${event.new_status}`;
        await col.insert({
          id:          uuid(),
          type:        'ORDER_UPDATED',
          message:     `📦 Commande #${shortId} est ${label}`,
          order_id:    event.order_id,
          customer_id: event.customer_id,
          read:        false,
          created_at:  now,
        });
        console.log(`🔔 [ORDER_UPDATED → ${event.new_status}] → client ${event.customer_id}`);
      }
    },
  });
};

module.exports = { startConsumer };
