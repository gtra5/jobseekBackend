/**
 * Auth Routes Tests
 * Integration tests for authentication routes using Jest and Supertest
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up database
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should return error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test123!',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      // Register user first
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error for missing email', async () => {
      const loginData = {
        password: 'Test123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error for missing password', async () => {
      const loginData = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully with valid OTP', async () => {
      // Register user first
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        role: 'jobseeker',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Request password reset (this would normally send OTP via email)
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userData.email });

      // Reset password with OTP (mock OTP for testing)
      const resetData = {
        email: userData.email,
        otp: '123456', // Mock OTP
        newPassword: 'NewTest123!',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error for invalid OTP', async () => {
      const resetData = {
        email: 'test@example.com',
        otp: '000000',
        newPassword: 'NewTest123!',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error for weak new password', async () => {
      const resetData = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'weak',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
