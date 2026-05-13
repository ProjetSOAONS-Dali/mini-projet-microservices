const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected = false;

const connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log(' Kafka Producer (OrderService) connecté');
  }
};

const publishOrderCreated = async (order) => {
  await connect();
  await producer.send({
    topic: 'order-created',
    messages: [{
      key: order.id,
      value: JSON.stringify({
        event:       'ORDER_CREATED',
        order_id:    order.id,
        customer_id: order.customer_id,
        total:       order.total,
        items:       order.items,
        timestamp:   new Date().toISOString(),
      }),
    }],
  });
  console.log(` Kafka: order-created publié pour commande ${order.id}`);
};

const publishOrderUpdated = async (order) => {
  await connect();
  await producer.send({
    topic: 'order-updated',
    messages: [{
      key: order.id,
      value: JSON.stringify({
        event:       'ORDER_STATUS_UPDATED',
        order_id:    order.id,
        customer_id: order.customer_id,
        new_status:  order.status,
        timestamp:   new Date().toISOString(),
      }),
    }],
  });
  console.log(` Kafka: order-updated publié pour commande ${order.id}`);
};

module.exports = { publishOrderCreated, publishOrderUpdated };