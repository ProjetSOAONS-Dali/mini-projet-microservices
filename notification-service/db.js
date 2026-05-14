const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

// RxDB : base de données NoSQL réactive (in-memory pour Node.js)
let dbInstance = null;

const getDB = async () => {
  if (dbInstance) return dbInstance;

  const { createRxDatabase } = await import('rxdb');
  const { getRxStorageMemory } = await import('rxdb/plugins/storage-memory');

  dbInstance = await createRxDatabase({
    name:            'notifications_db',
    storage:         getRxStorageMemory(),
    ignoreDuplicate: true,
  });

  await dbInstance.addCollections({
    notifications: {
      schema: {
        version:    0,
        primaryKey: 'id',
        type:       'object',
        properties: {
          id:          { type: 'string', maxLength: 100 },
          type:        { type: 'string' },
          message:     { type: 'string' },
          order_id:    { type: 'string' },
          customer_id: { type: 'string', maxLength: 100 },
          read:        { type: 'boolean' },
          created_at:  { type: 'string' },
        },
        required: ['id', 'type', 'message', 'customer_id'],
        indexes:  ['customer_id'],
      },
    },
  });

  console.log('RxDB NotificationService initialisée (NoSQL in-memory)');
  return dbInstance;
};

module.exports = { getDB };
