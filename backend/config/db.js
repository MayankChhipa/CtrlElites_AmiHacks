const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  // Don't reconnect if Mongoose is already connected/connecting
  if (
    mongoose.connection.readyState === 1 ||
    mongoose.connection.readyState === 2
  ) {
    console.log('✅ MongoDB is already connected/connecting.');
    return;
  }

  const uri =
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/surplus_to_shelter';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    console.log(
      `✅ MongoDB Connected to: ${mongoose.connection.host}`
    );

    return mongoose.connection;
  } catch (err) {
    console.warn(
      `⚠️ Could not connect to MongoDB: ${err.message}`
    );

    // Only use MongoMemoryServer during development
    const isDevelopment =
      process.env.NODE_ENV !== 'production';

    if (!isDevelopment) {
      throw new Error(
        `MongoDB connection failed in production: ${err.message}`
      );
    }

    try {
      console.log(
        '🔄 Starting In-Memory MongoDB for development...'
      );

      const { MongoMemoryServer } = require('mongodb-memory-server');

      mongod = await MongoMemoryServer.create();

      const inMemoryUri = mongod.getUri();

      await mongoose.connect(inMemoryUri, {
        serverSelectionTimeoutMS: 5000,
      });

      console.log(
        `✅ In-Memory MongoDB Connected at: ${inMemoryUri}`
      );

      return mongoose.connection;
    } catch (memErr) {
      console.error(
        `❌ Failed to start In-Memory MongoDB: ${memErr.message}`
      );

      throw memErr;
    }
  }
};

/**
 * Gracefully close MongoDB connections.
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed.');
    }

    if (mongod) {
      await mongod.stop();
      mongod = null;
      console.log('🛑 In-Memory MongoDB stopped.');
    }
  } catch (err) {
    console.error(
      `❌ Error while closing MongoDB: ${err.message}`
    );
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;