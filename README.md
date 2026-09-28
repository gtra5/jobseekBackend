# JobSeek Backend API

A comprehensive Node.js/Express backend API for the JobSeek platform with MongoDB Atlas, featuring job management, user authentication, external job aggregation, real-time messaging, skill assessments, and advanced security features.

## 🚀 Features

### Core Functionality

- ✅ **User Authentication** - Registration, login, logout with JWT tokens and refresh token rotation
- ✅ **Email Verification** - OTP-based email verification system with rate limiting
- ✅ **Job Management** - Full CRUD operations for job postings with advanced filtering
- ✅ **Job Applications** - Apply to jobs with comprehensive status tracking (pending → reviewed → interview → hired)
- ✅ **External Job Aggregation** - Fetch jobs from multiple external APIs (Adzuna, Findwork, Remotive, Arbeitnow) with intelligent caching
- ✅ **Real-time Messaging** - Socket.io-based chat system between employers and job seekers
- ✅ **Skill Assessments** - Curated multiple-choice assessments for skill verification
- ✅ **Notifications** - Real-time notification system with in-app and email delivery
- ✅ **File Uploads** - AWS S3 integration for resume/profile uploads with secure storage
- ✅ **Advanced Rate Limiting** - Tiered rate limiting (general, auth, external jobs, realtime)
- ✅ **Input Validation** - Comprehensive request validation with express-validator
- ✅ **Security** - Helmet.js, CORS configuration, NoSQL injection protection, secure headers
- ✅ **Account Cleanup** - Automated cleanup service for soft-deleted accounts
- ✅ **Graceful Shutdown** - Proper handling of SIGTERM for deployment environments

### External Job Sources

- **Adzuna** - Requires APP_ID and APP_KEY (comprehensive job listings)
- **Findwork** - Requires API key with Bearer token authentication (tech-focused jobs)
- **JSearch via RapidAPI** - Requires RAPIDAPI_KEY (extensive job database)
- **Remotive** - Public API (remote jobs only)
- **Arbeitnow** - Public API (general job board)

All external job sources include intelligent caching with configurable TTL and XSS sanitization for user-generated content.

## � API Response Format

All API endpoints follow a consistent response format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🔐 Authentication Flow

### Registration Flow

1. User submits registration data (email, password, role)
2. Server validates input and hashes password
3. OTP is generated and sent to email
4. User verifies email with OTP
5. Account becomes active and isEmailVerified = true

### Login Flow

1. User submits credentials
2. Server validates and generates access + refresh tokens
3. Access token is returned (short-lived, e.g., 15 minutes)
4. Refresh token is stored in database (long-lived, e.g., 7 days)
5. Client uses access token for authenticated requests
6. When access token expires, client uses refresh token to get new access token

### Token Security

- Access tokens are JWT signed with JWT_SECRET
- Refresh tokens are stored in database with expiration
- Refresh tokens can be revoked (logout, security incident)
- Password changes invalidate all refresh tokens
- Tokens contain user ID and role for authorization

## �📁 Project Structure

```
jobseekBackend/
├── .env                        # Local environment configuration
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── app.js                     # Express app configuration
├── server.js                  # Server entry point
├── package.json               # Dependencies and scripts
├── package-lock.json          # Locked dependency tree
├── jest.config.js             # Jest configuration
├── README.md                  # Project documentation
├── SECURITY_DATABASE.md       # Database security policy
├── SECURITY_INCIDENT_RESPONSE.md
├── SECURITY_PRIORITY.md       # Security priorities and checklist
├── SECURITY_SECRETS.md        # Secret management guidance
├── _chat_test.js              # Chat-related probe/test file
├── _query_probe.js            # Query/debugging probe file
├── config/
│   ├── cloudinary.js          # Cloudinary configuration (deprecated, uses AWS S3)
│   └── db.js                 # MongoDB connection configuration
├── constants/
│   ├── professions.js         # Profession taxonomy (single source of truth)
│   └── skills.js             # Skills taxonomy by category
├── controllers/
│   ├── applicationController.js
│   ├── assessmentController.js
│   ├── authController.js
│   ├── chatController.js
│   ├── externalJobController.js
│   ├── jobController.js
│   ├── notificationController.js
│   └── userController.js
├── logs/                     # Runtime logs directory
├── middleware/
│   ├── authMiddleware.js      # JWT authentication with Socket.io support
│   ├── errorHandler.js         # Global error handling middleware
│   ├── otpRateLimit.js         # Stricter rate limiting for OTP endpoints
│   ├── requestLogger.js        # Request logging middleware
│   ├── roleMiddleware.js       # Role-based access control (admin/employer/jobseeker)
│   ├── uploadMiddleware.js     # File upload handling with Multer
│   └── validateRequest.js      # Comprehensive request validation
├── models/
│   ├── Application.js          # Job application with interview tracking
│   ├── Assessment.js           # Skill assessment question bank
│   ├── AssessmentResult.js     # User assessment results
│   ├── Conversation.js         # Chat conversation model
│   ├── index.js               # Model exports and seeding
│   ├── Job.js                 # Job posting model
│   ├── Message.js             # Chat message model
│   ├── Notification.js        # User notification model
│   ├── OTP.js                 # One-time password model
│   ├── RefreshToken.js        # JWT refresh token model
│   ├── seedAssessment.js      # Assessment seeder
│   └── User.js                # User model (jobseeker/employer/admin)
├── routes/
│   ├── applicationRoutes.js
│   ├── assessmentRoutes.js
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   ├── externalJobRoutes.js
│   ├── jobs.js
│   ├── notificationRoutes.js
│   ├── otp.js
│   ├── professionRoutes.js
│   ├── skillsRoutes.js
│   └── userRoutes.js
├── services/
│   ├── cleanupService.js      # Automated account cleanup for soft-deleted accounts
│   ├── emailService.js         # Email sending (Nodemailer) with header injection protection
│   ├── jobSourcingService.js   # External job aggregation with caching and XSS protection
│   ├── otpService.js           # OTP generation and verification
│   ├── queueService.js         # BullMQ job queue management
│   ├── storageService.js      # Storage service abstraction
│   └── uploadService.js        # AWS S3 file uploads
├── sockets/
│   └── chatSocket.js          # Socket.io real-time messaging handler
│   ├── storageService.js      # Storage service abstraction
│   └── uploadService.js        # AWS S3 file uploads
├── tests/
│   ├── auth.test.js
│   └── setup.js
├── utils/
│   ├── apiResponse.js         # Standardized API response formatting
│   ├── asyncHandler.js         # Async error handling wrapper
│   ├── cache.js               # In-memory caching utility
│   ├── generateToken.js       # JWT token generation
│   ├── logger.js              # Winston-based logging
│   └── validators.js          # Custom validation utilities
└── node_modules/             # Installed project dependencies
```

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** MongoDB Atlas with Mongoose ODM
- **Authentication:** JWT (access + refresh tokens) with bcryptjs password hashing
- **Validation:** express-validator for request validation
- **Security:** Helmet.js, express-rate-limit, XSS protection, NoSQL injection prevention
- **File Upload:** Multer + AWS S3 (presigned URLs)
- **Email:** Nodemailer with SMTP support
- **Real-time:** Socket.io for chat functionality
- **Job Queue:** BullMQ with Redis (background jobs)
- **External APIs:** Axios for external job API integration
- **Logging:** Winston + Pino for structured logging
- **Testing:** Jest with Supertest for API testing

## 📋 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email with OTP

### Jobs (Platform)

- `POST /api/jobs` - Create job (employer only)
- `GET /api/jobs` - Get all jobs (with filters: category, profession, jobType, location, salary range)
- `GET /api/jobs/:id` - Get single job
- `PUT /api/jobs/:id` - Update job (employer only)
- `DELETE /api/jobs/:id` - Delete job (employer only)

### External Jobs

- `GET /api/external-jobs/aggregate` - Aggregate jobs from all external sources
- `GET /api/external-jobs/all` - Get flattened list of all external jobs
- `GET /api/external-jobs/:source` - Get jobs from specific source
- `GET /api/external-jobs/sources` - Get available sources
- `GET /api/external-jobs/categories` - Get job categories

### Applications

- `POST /api/applications` - Apply to a job
- `GET /api/applications` - Get user's applications
- `GET /api/applications/:id` - Get single application
- `PUT /api/applications/:id` - Update application status (employer)
- `DELETE /api/applications/:id` - Withdraw application

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/upload` - Upload profile picture
- `GET /api/users/:id` - Get user by ID

### Notifications

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### OTP

- `POST /api/otp/send` - Send OTP (email/SMS)
- `POST /api/otp/verify` - Verify OTP
- `POST /api/otp/resend` - Resend OTP

### Chat (Real-time Messaging)

- `GET /api/chat/conversations` - Get user's conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id/messages` - Get messages in conversation
- `POST /api/chat/conversations/:id/messages` - Send message
- `PUT /api/chat/conversations/:id/read` - Mark conversation as read

### Assessments

- `GET /api/assessments` - Get available skill assessments
- `GET /api/assessments/:id` - Get specific assessment
- `POST /api/assessments/:id/submit` - Submit assessment answers
- `GET /api/assessments/results` - Get user's assessment results

### Professions & Skills

- `GET /api/professions` - Get available professions
- `GET /api/skills` - Get skills by category

### Health

- `GET /health` - Health check
- `GET /` - API info and endpoints

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/gtra5/jobseekBackend.git
cd jobseekBackend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:

#### Required Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_access_key
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key
FRONTEND_URL=http://localhost:5174
```

#### Optional Variables (Email)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=JobSeek <noreply@jobseek.com>
```

#### Optional Variables (AWS S3)

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=voraq-uploads
```

#### Optional Variables (External Job APIs)

```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
FINDWORK_API_KEY=your_findwork_api_key
RAPIDAPI_KEY=your_rapidapi_key
```

#### Optional Variables (Redis for BullMQ)

```env
REDIS_URL=redis://localhost:6379
```

### 4. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Whitelist your IP address (or use `0.0.0.0/0` for development)
4. Create a database user with username and password
5. Get your connection string
6. Update `MONGODB_URI` in your `.env` file

### 5. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `JWT_REFRESH_SECRET` in your `.env` file with the generated string.

### 6. Start the Server

```bash
npm start
```

The server will run on `http://localhost:5000`

## 🔐 Security Features

1. **Helmet.js** - Sets various HTTP headers for security (CSP, HSTS, X-Frame-Options, etc.)
2. **Tiered Rate Limiting** - Different limits for different endpoints:
   - General API: 100 req/15min (2000 in development)
   - Auth endpoints: 5 req/15min (100 in development)
   - External jobs: 30 req/15min (200 in development)
   - Chat/notifications: 300 req/15min (500 in development)
3. **Input Validation** - Validates all incoming data with express-validator
4. **NoSQL Injection Protection** - Manual sanitization of request body, params, and query to prevent MongoDB operator injection
5. **XSS Protection** - xss library for sanitizing user-generated content in external jobs
6. **CORS** - Configured to allow requests only from specified origins with credentials support
7. **Environment Variables** - Secrets stored in `.env` file (never commit to git)
8. **JWT Authentication** - Secure token-based authentication with access + refresh token rotation
9. **Password Hashing** - bcryptjs with salt rounds for secure password storage
10. **Email Header Injection Protection** - Sanitization of email headers to prevent SMTP injection
11. **Error Handling** - Proper error messages without exposing sensitive data
12. **Soft Delete** - Accounts are soft-deleted with automated cleanup service

## 🚢 Deployment

### Render Deployment

1. **Whitelist Render IPs in MongoDB Atlas**
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (for development) or specific Render IP ranges

2. **Add Environment Variables in Render**
   - Add all variables from your `.env` file to Render's environment variables
   - Set `NODE_ENV=production`

3. **Render Build Settings**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Runtime: Node.js (select appropriate version)

### Other Platforms

The backend can be deployed to any Node.js hosting platform:

- Heroku
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Vercel (serverless)

## 📊 Database Models

### User

- **Authentication**: email, password (hashed), isEmailVerified, lastLogin
- **Role**: jobseeker, employer, admin
- **Profile**: firstName, lastName, phone, avatar
- **Job Seeker Profile**: headline, skills, experience, education, resume, primaryCategory, preferredJobTypes, preferredLocations, expectedSalary, portfolioUrl, linkedinUrl, githubUrl, verifiedSkills
- **Employer Profile**: company name, logo, industry, companySize, website, description, foundedYear, location
- **Professions**: Array of professions for personalized job feed
- **Notification Settings**: Email and push preferences for job alerts, application updates, messages, marketing
- **Account Status**: isActive, isDeleted, deletedAt (soft delete with automated cleanup)

### Job

- **Basic Info**: title, description, profession, category
- **Location**: location, jobType (Full-time, Part-time, Contract, Internship, Remote, Hybrid)
- **Requirements**: skills, requirements, benefits, experienceLevel, educationLevel
- **Salary**: min, max, currency
- **Employer**: reference to User
- **Status**: isActive, isDeleted (soft delete)
- **Deadlines**: applicationDeadline

### Application

- **References**: job, jobSeeker, employer
- **Status**: pending, reviewed, shortlisted, interview, offered, rejected, withdrawn, hired
- **Content**: coverLetter, resumeSnapshot, answers (custom questions)
- **Timestamps**: appliedAt, reviewedAt, withdrawnAt
- **Interviews**: Array of interview objects with scheduling, type, location, feedback
- **External Jobs**: isExternalJob, externalJobId, externalSource
- **Employer Notes**: employerNotes, rating (1-5)
- **Prevention**: One application per job per user (enforced via unique index)

### Notification

- **Recipient**: reference to User
- **Type**: application, job, system, message
- **Content**: title, message
- **Status**: isRead, createdAt

### OTP

- **Target**: email/phone
- **Code**: OTP code
- **Purpose**: registration, login, password_reset, email_verification
- **Expiration**: expiresAt, used

### Assessment

- **Category**: skillCategory (unique per difficulty level)
- **Content**: title, description, difficulty (beginner/intermediate/advanced)
- **Settings**: passScore (default 70), timeLimitMinutes (default 10)
- **Questions**: Array of multiple-choice questions with options and correctIndex
- **Status**: isActive

### AssessmentResult

- **User**: reference to User
- **Assessment**: reference to Assessment
- **Score**: achieved score
- **Status**: passed (boolean)
- **Timestamp**: completedAt

### Conversation

- **Participants**: Array of two User references
- **Context**: optional job reference
- **Last Message**: denormalized reference for list performance
- **Timestamps**: lastMessageAt, createdAt, updatedAt

### Message

- **Conversation**: reference to Conversation
- **Sender**: reference to User
- **Content**: text
- **Status**: isRead
- **Timestamps**: createdAt, updatedAt

### RefreshToken

- **User**: reference to User
- **Token**: refresh token string
- **Expiration**: expiresAt
- **Status**: isRevoked, revokedAt

## 🧪 Testing

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Test health endpoint
curl http://localhost:5000/health

# Test API info
curl http://localhost:5000/

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123","role":"jobseeker"}'
```

### Test Coverage

Jest is configured with coverage collection for:
- Controllers
- Middleware
- Services
- Utils

Coverage reports are generated in the `coverage/` directory.

## 🏗️ Architecture Highlights

### Server Initialization

The server (`server.js`) follows a clean startup sequence:
1. Load environment variables
2. Connect to MongoDB with validation
3. Seed assessment question bank (ensures assessments exist)
4. Start account cleanup service (periodic soft-delete cleanup)
5. Create HTTP server
6. Initialize Socket.io for real-time messaging
7. Start listening on configured port
8. Handle graceful shutdown (SIGTERM) for deployment environments

### Real-time Messaging

Socket.io is integrated with JWT authentication for secure real-time communication:
- WebSocket connections require valid JWT tokens
- Messages are persisted to MongoDB for history
- Real-time notifications are sent to participants
- Supports typing indicators and read receipts

### External Job Aggregation

The job sourcing service provides:
- **Intelligent Caching**: Stable cache keys based on search parameters to avoid unnecessary API calls
- **XSS Protection**: All external job content is sanitized before storage
- **Timeout Protection**: 8-second timeout on all external API calls to prevent hanging
- **Source Aggregation**: Fetches from multiple sources and normalizes to common format
- **Date Filtering**: Configurable recency filtering (default 30 days)

### Rate Limiting Strategy

Tiered rate limiting prevents abuse while allowing normal usage:
- **General API**: Standard limit for most endpoints
- **Auth**: Stricter limit for sensitive operations
- **External Jobs**: Lower limit due to third-party API costs
- **Real-time**: Higher limit for chat/notifications (normal user behavior)
- **Development Mode**: Significantly higher limits for local development

### Security Architecture

- **NoSQL Injection Prevention**: Manual sanitization of MongoDB operators ($, etc.) in request data
- **Password Security**: bcrypt with salt rounds, passwords never returned in queries
- **Token Rotation**: Refresh token system for enhanced security
- **Soft Delete**: Accounts are marked deleted rather than removed, with automated cleanup
- **Input Sanitization**: XSS protection for user-generated content
- **Email Security**: Header injection prevention in email service

## � Key Dependencies

### Core
- `express` 5.x - Web framework
- `mongoose` 9.x - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `dotenv` - Environment variable management

### Security
- `helmet` - HTTP security headers
- `express-rate-limit` - Rate limiting
- `express-validator` - Request validation
- `xss` - XSS protection
- `cors` - CORS configuration

### Real-time & Background Jobs
- `socket.io` - WebSocket support
- `bullmq` - Job queue
- `ioredis` - Redis client

### File Upload & Storage
- `multer` - File upload handling
- `@aws-sdk/client-s3` - AWS S3 integration
- `@aws-sdk/s3-request-presigner` - S3 presigned URLs

### External APIs
- `axios` - HTTP client for external APIs
- `nodemailer` - Email sending
- `otp-generator` - OTP generation
- `twilio` - SMS support (optional)

### Logging & Monitoring
- `winston` - Structured logging
- `pino` - High-performance logging
- `pino-pretty` - Pretty console output

## 🔧 Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| PORT | No | Server port | 5000 |
| NODE_ENV | No | Environment mode | development |
| MONGODB_URI | Yes | MongoDB connection string | - |
| JWT_SECRET | Yes | JWT access token secret | - |
| JWT_REFRESH_SECRET | Yes | JWT refresh token secret | - |
| FRONTEND_URL | Yes | Frontend URL for CORS | http://localhost:5174 |
| EMAIL_HOST | No | SMTP host | smtp.gmail.com |
| EMAIL_PORT | No | SMTP port | 587 |
| EMAIL_SECURE | No | SMTP secure flag | false |
| EMAIL_USER | No | SMTP username | - |
| EMAIL_PASS | No | SMTP password | - |
| EMAIL_FROM | No | From email address | - |
| AWS_ACCESS_KEY_ID | No | AWS access key | - |
| AWS_SECRET_ACCESS_KEY | No | AWS secret key | - |
| AWS_REGION | No | AWS region | us-east-1 |
| AWS_S3_BUCKET_NAME | No | S3 bucket name | - |
| ADZUNA_APP_ID | No | Adzuna API ID | - |
| ADZUNA_APP_KEY | No | Adzuna API key | - |
| FINDWORK_API_KEY | No | Findwork API key | - |
| RAPIDAPI_KEY | No | RapidAPI key | - |
| REDIS_URL | No | Redis connection URL | - |

## �🐛 Troubleshooting

### MongoDB Connection Issues

- Verify your MongoDB Atlas connection string
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure your database user has the correct permissions
- Check for the `MONGODB_URI` typo (should not have duplicate prefix)

### CORS Errors

- Verify `FRONTEND_URL` matches your frontend URL exactly
- Check that the frontend is making requests to the correct backend URL

### Port Already in Use

- Change the `PORT` in your `.env` file
- Or stop the process using port 5000

### External Jobs Not Loading

- Verify API keys are set in `.env`
- Check backend logs for API errors
- Ensure external APIs are accessible
- Check cache is not stale (external jobs are cached for performance)

### Socket.io Connection Issues

- Verify JWT token is valid and not expired
- Check that `FRONTEND_URL` matches exactly (Socket.io uses same CORS config)
- Ensure WebSocket connections are not blocked by firewall/proxy
- Check browser console for Socket.io errors

### Email Not Sending

- Verify SMTP credentials are correct
- Check that email provider allows less secure apps (Gmail requires App Password)
- Verify `EMAIL_HOST` and `EMAIL_PORT` are correct
- Check firewall allows outbound SMTP traffic

### File Upload Failures

- Verify AWS credentials are correct and have S3 permissions
- Check S3 bucket exists and is in the correct region
- Ensure bucket policy allows public read access for uploaded files
- Verify file size doesn't exceed limits (10MB default)

### Rate Limiting Errors

- Check if you're in development mode (limits are higher)
- Verify rate limits in `app.js` match your needs
- Consider increasing limits for legitimate high-volume usage
- Check for stuck rate limiters (restart server)

### Assessment Questions Not Loading

- Check that assessment seeding completed successfully on server start
- Verify database connection is working
- Check server logs for seeding errors
- Manually trigger seeding if needed

## 🎯 Constants & Taxonomy

The backend maintains single sources of truth for static data:

### Professions (`constants/professions.js`)

The profession taxonomy is the authoritative list used across:
- Job model validation
- User profession preferences
- External job mapping
- Frontend (fetched via API)

**Professions:** Software Engineering & IT, Design & Creative, Marketing & Sales, Customer Support, Finance & Accounting, Human Resources, Operations & Admin, Healthcare, Education, Writing & Content, Legal, Engineering (Non-Software), Other

### Skills (`constants/skills.js`)

Skills are organized by category for better UX:
- Programming Languages (JavaScript, Python, Java, etc.)
- Web Frontend (React, Vue, Angular, etc.)
- Web Backend (Node.js, Django, Spring, etc.)
- Database (PostgreSQL, MongoDB, Redis, etc.)
- DevOps & Cloud (Docker, Kubernetes, AWS, etc.)
- Mobile Development (React Native, Flutter, etc.)
- Data Science & AI (Pandas, TensorFlow, etc.)
- Design & UI (Figma, Adobe XD, etc.)
- Testing & QA (Jest, Cypress, Selenium, etc.)

**Important:** The frontend fetches these dynamically via API - never hardcode them in the frontend.

## ⚡ Performance Considerations

### Database Indexing

Strategic indexes are defined on all models for optimal query performance:
- User: role, isVerified, verifiedSkills
- Job: text search (title, description, skills), category, status, createdAt
- Application: job, jobSeeker, employer, status, composite indexes
- Conversation: participants, unique on participants+job
- Assessment: skillCategory + difficulty (unique)

### Caching Strategy

- **External Jobs**: Cached by search parameters to avoid repeated API calls
- **In-Memory Cache**: Simple caching utility for frequently accessed data
- **Database Query Optimization**: Selective field projection to reduce data transfer

### File Upload Optimization

- **Presigned URLs**: Direct S3 uploads to reduce server load
- **File Size Limits**: 10MB limit enforced in middleware
- **Image Optimization**: Consider client-side optimization before upload

### Rate Limiting Optimization

- **Tiered Limits**: Different limits prevent resource starvation
- **Development Mode**: Higher limits for local development
- **Route-Specific**: Tailored limits per endpoint type

## 📝 License

ISC

## 👥 Author

JobSeek Team

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section above

---

**Last Updated:** September 2025  
**Version:** 1.0.0  
**Author:** JobSeek Team
