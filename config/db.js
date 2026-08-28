/**
 * MongoDB Database Configuration
 * Establishes connection to MongoDB using Mongoose
 */

const mongoose = require('mongoose');

/**
 * Validate required environment variables
 */
const validateEnv = () => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

/**
 * Connect to MongoDB
 * @returns {Promise} Mongoose connection promise
 */
const connectDB = async () => {
  try {
    validateEnv();
    
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
