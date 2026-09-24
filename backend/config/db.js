const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/surplus_to_shelter';
  
  try {
    // Attempt standard connection with 2.5s server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`✅ MongoDB Connected to: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`⚠️ Could not connect to primary MongoDB (${err.message}).`);
    
    // In-memory fallback for seamless hackathon development
    try {
      console.log('🔄 Spinning up In-Memory MongoDB Server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const inMemoryUri = mongod.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`✅ In-Memory MongoDB Connected at: ${inMemoryUri}`);
    } catch (memErr) {
      console.error('❌ Failed to start In-Memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
