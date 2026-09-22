/**
 * Public Profile Tests
 * Tests for the public profile endpoint to ensure no sensitive data is exposed
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
const PROFESSIONS = require('../constants/professions');

describe('GET /api/users/:id/public', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should return public profile for jobseeker without authentication', async () => {
    const user = await User.create({
      email: 'jobseeker@example.com',
      password: 'TestPassword123@',
      role: 'jobseeker',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.jpg',
      professions: ['Software Engineering & IT'],
      profile: {
        headline: 'Full Stack Developer',
        skills: ['JavaScript', 'React', 'Node.js'],
        verifiedSkills: [
          { skill: 'JavaScript', score: 85, passed: true, verifiedAt: new Date() },
        ],
        portfolioUrl: 'https://portfolio.example.com',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        githubUrl: 'https://github.com/johndoe',
        preferredJobTypes: ['Full-time', 'Remote'],
        primaryCategory: 'Web Development',
        expectedSalary: { min: 50000, max: 100000, currency: 'USD' },
        resume: { url: 'https://example.com/resume.pdf', publicId: 'abc123', uploadedAt: new Date() },
      },
      notificationSettings: {
        email: { jobAlerts: true, applicationUpdates: true, messages: true, marketing: false },
        push: { jobAlerts: true, applicationUpdates: true, messages: true },
      },
      lastLogin: new Date(),
      isActive: true,
      isDeleted: false,
    });

    const response = await request(app)
      .get(`/api/users/${user._id}/public`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('profile');
    
    const profile = response.body.data.profile;
    
    // Verify public fields are present
    expect(profile).toHaveProperty('firstName', 'John');
    expect(profile).toHaveProperty('lastName', 'Doe');
    expect(profile).toHaveProperty('avatar', 'https://example.com/avatar.jpg');
    expect(profile).toHaveProperty('role', 'jobseeker');
    expect(profile).toHaveProperty('professions');
    expect(profile.profile).toHaveProperty('headline', 'Full Stack Developer');
    expect(profile.profile).toHaveProperty('skills');
    expect(profile.profile).toHaveProperty('verifiedSkills');
    expect(profile.profile).toHaveProperty('portfolioUrl', 'https://portfolio.example.com');
    expect(profile.profile).toHaveProperty('linkedinUrl', 'https://linkedin.com/in/johndoe');
    expect(profile.profile).toHaveProperty('githubUrl', 'https://github.com/johndoe');
    expect(profile.profile).toHaveProperty('preferredJobTypes');
    expect(profile.profile).toHaveProperty('primaryCategory', 'Web Development');

    // Verify sensitive fields are NOT exposed
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
    expect(profile).not.toHaveProperty('password');
    expect(profile).not.toHaveProperty('notificationSettings');
    expect(profile).not.toHaveProperty('lastLogin');
    expect(profile).not.toHaveProperty('isActive');
    expect(profile).not.toHaveProperty('isDeleted');
    expect(profile).not.toHaveProperty('isVerified');
    expect(profile).not.toHaveProperty('isEmailVerified');
    expect(profile).not.toHaveProperty('createdAt');
    expect(profile).not.toHaveProperty('updatedAt');
    expect(profile.profile).not.toHaveProperty('expectedSalary');
    expect(profile.profile).not.toHaveProperty('resume');
  });

  it('should return public profile for employer without authentication', async () => {
    const user = await User.create({
      email: 'employer@example.com',
      password: 'TestPassword123@',
      role: 'employer',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
      avatar: 'https://example.com/company-logo.jpg',
      professions: ['Engineering (Non-Software)'],
      company: {
        name: 'Tech Corp',
        logo: { url: 'https://example.com/logo.jpg', publicId: 'xyz789' },
        industry: 'Technology',
        website: 'https://techcorp.com',
        companySize: '1000+',
        description: 'A tech company',
        foundedYear: 2010,
      },
      notificationSettings: {
        email: { jobAlerts: true, applicationUpdates: true, messages: true, marketing: false },
        push: { jobAlerts: true, applicationUpdates: true, messages: true },
      },
      lastLogin: new Date(),
      isActive: true,
      isDeleted: false,
    });

    const response = await request(app)
      .get(`/api/users/${user._id}/public`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('profile');
    
    const profile = response.body.data.profile;
    
    // Verify public fields are present
    expect(profile).toHaveProperty('firstName', 'Jane');
    expect(profile).toHaveProperty('lastName', 'Smith');
    expect(profile).toHaveProperty('avatar', 'https://example.com/company-logo.jpg');
    expect(profile).toHaveProperty('role', 'employer');
    expect(profile).toHaveProperty('professions');
    expect(profile.company).toHaveProperty('name', 'Tech Corp');
    expect(profile.company).toHaveProperty('logo');
    expect(profile.company).toHaveProperty('industry', 'Technology');
    expect(profile.company).toHaveProperty('website', 'https://techcorp.com');

    // Verify sensitive fields are NOT exposed
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
    expect(profile).not.toHaveProperty('password');
    expect(profile).not.toHaveProperty('notificationSettings');
    expect(profile).not.toHaveProperty('lastLogin');
    expect(profile).not.toHaveProperty('isActive');
    expect(profile).not.toHaveProperty('isDeleted');
    expect(profile).not.toHaveProperty('createdAt');
    expect(profile).not.toHaveProperty('updatedAt');
    expect(profile.company).not.toHaveProperty('companySize');
    expect(profile.company).not.toHaveProperty('description');
    expect(profile.company).not.toHaveProperty('foundedYear');
    expect(profile.company).not.toHaveProperty('location');
  });

  it('should return 404 for nonexistent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/api/users/${fakeId}/public`)
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
  });

  it('should return 404 for deleted user', async () => {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123@', 10);
    
    const user = await User.create({
      email: 'deleted@example.com',
      password: hashedPassword,
      role: 'jobseeker',
      firstName: 'Deleted',
      lastName: 'User',
      isDeleted: true,
    });

    const response = await request(app)
      .get(`/api/users/${user._id}/public`)
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
  });

  it('should handle invalid user ID safely', async () => {
    const response = await request(app)
      .get('/api/users/invalid-id/public')
      .expect(422);

    expect(response.body).toHaveProperty('success', false);
  });
});
