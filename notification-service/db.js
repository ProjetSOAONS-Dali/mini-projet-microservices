const { createRxDatabase, addRxPlugin } = require('rxdb');

const {
  getRxStorageMemory
} = require('rxdb/plugins/storage-memory');

const {
  RxDBDevModePlugin
} = require('rxdb/plugins/dev-mode');

addRxPlugin(RxDBDevModePlugin);

const notificationSchema = {
  version: 0,

  primaryKey: 'id',

  type: 'object',

  properties: {

    id: {
      type: 'string',
      maxLength: 100,
    },

    type: {
      type: 'string',
    },

    message: {
      type: 'string',
    },

    order_id: {
      type: 'string',
    },

    customer_id: {
      type: 'string',
      maxLength: 100,
    },

    read: {
      type: 'boolean',
      default: false,
    },

    created_at: {
      type: 'string',
    },
  },

  required: [
    'id',
    'type',
    'message',
    'customer_id',
  ],
};

let dbInstance = null;

const initDB = async () => {

  if (dbInstance) {
    return dbInstance;
  }

  console.log('⏳ Initialisation RxDB...');

  dbInstance = await createRxDatabase({

    name: 'notifdb',

    storage: getRxStorageMemory(),

    multiInstance: false,

    ignoreDuplicate: true,
  });

  await dbInstance.addCollections({

    notifications: {
      schema: notificationSchema,
    },
  });

  console.log('✅ RxDB initialisée');

  return dbInstance;
};

const getDB = async () => {

  if (!dbInstance) {
    throw new Error('DB non initialisée');
  }

  return dbInstance;
};

module.exports = {
  initDB,
  getDB,
};