require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const app = require('./app');
const { seedAssessments } = require('./models');
const { startAccountSweep } = require('./services/cleanupService');
const { initializeSocket } = require('./sockets/chatSocket');

// Connect to MongoDB
connectDB()
  .then(() => seedAssessments() // ensure the assessment question bank exists
    .then((r) => {
      if (r.seeded) console.log(`Seeded ${r.count} skill assessments`);
    }))
  .then(() => startAccountSweep()) // periodically purge long-soft-deleted accounts
  .catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

// Create HTTP server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);
app.set('io', io); // makes io reachable from controllers via req.app.get('io')
console.log('Socket.io initialized');

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle SIGTERM (sent by Render, Docker, etc. on every redeploy/restart)
// Finish in-flight requests and close the DB connection cleanly instead of
// dropping active requests mid-response.
process.on('SIGTERM', () => {
  console.log('SIGTERM received: shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});