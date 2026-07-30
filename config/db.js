/**
 * MongoDB Database Configuration
 * Establishes connection to MongoDB using Mongoose
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 * @returns {Promise} Mongoose connection promise
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * Useful for testing and graceful shutdown
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
