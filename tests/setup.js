/**
 * Test Setup
 * Setup file for Jest tests
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/jobseek_test';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test_password';
process.env.EMAIL_FROM = 'Test <test@test.com>';

// Mock Redis for BullMQ
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Set timeout for database operations
jest.setTimeout(10000);
