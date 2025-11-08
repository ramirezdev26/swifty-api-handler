import mongoose from 'mongoose';

class MongoDBConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swifty_read';

      this.connection = await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('[MongoDB] Connected to read model database');

      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('[MongoDB] Disconnected, attempting to reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      console.error('[MongoDB] Connection failed:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export default new MongoDBConnection();
