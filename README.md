# JobSeek Backend API

A comprehensive Node.js/Express backend API for the JobSeek platform with MongoDB Atlas, featuring job management, user authentication, external job aggregation, and real-time notifications.

## 🚀 Features

### Core Functionality

- ✅ **User Authentication** - Registration, login, logout with JWT tokens
- ✅ **Email Verification** - OTP-based email verification system
- ✅ **Job Management** - Full CRUD operations for job postings
- ✅ **Job Applications** - Apply to jobs with status tracking
- ✅ **External Job Aggregation** - Fetch jobs from multiple external APIs (Adzuna, Findwork, Remotive, Arbeitnow)
- ✅ **Notifications** - Real-time notification system
- ✅ **File Uploads** - Cloudinary integration for resume/profile uploads
- ✅ **Rate Limiting** - DDoS protection with express-rate-limit
- ✅ **Input Validation** - Comprehensive request validation with express-validator
- ✅ **Security** - Helmet.js, CORS configuration, secure headers

### External Job Sources

- **Adzuna** - Requires APP_ID and APP_KEY
- **Findwork** - Requires API key with Token authentication
- **Remotive** - Public API (remote jobs)
- **Arbeitnow** - Public API (job board)

## 📁 Project Structure

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
│   ├── cloudinary.js          # Cloudinary configuration
│   └── db.js                 # MongoDB connection configuration
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
│   ├── authMiddleware.js      # JWT authentication
│   ├── errorHandler.js         # Global error handling
│   ├── otpRateLimit.js         # OTP rate limiting
│   ├── requestLogger.js        # Request logging middleware
│   ├── roleMiddleware.js       # Role-based access control
│   ├── uploadMiddleware.js     # File upload handling
│   └── validateRequest.js      # Request validation
├── models/
│   ├── Application.js
│   ├── Assessment.js
│   ├── AssessmentResult.js
│   ├── Conversation.js
│   ├── index.js
│   ├── Job.js
│   ├── Message.js
│   ├── Notification.js
│   ├── OTP.js
│   ├── RefreshToken.js
│   ├── seedAssessment.js
│   └── User.js
├── routes/
│   ├── applicationRoutes.js
│   ├── assessmentRoutes.js
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   ├── externalJobRoutes.js
│   ├── jobs.js
│   ├── notificationRoutes.js
│   ├── otp.js
│   └── userRoutes.js
├── services/
│   ├── cleanupService.js
│   ├── emailService.js         # Email sending (Nodemailer)
│   ├── jobSourcingService.js   # External job aggregation
│   ├── otpService.js           # OTP generation and verification
│   ├── queueService.js
│   ├── storageService.js
│   ├── uploadService.js        # Cloudinary file uploads
│   └── ...
├── tests/
│   ├── auth.test.js
│   └── setup.js
├── utils/
│   ├── apiResponse.js
│   ├── asyncHandler.js
│   ├── cache.js
│   ├── generateToken.js
│   ├── logger.js
│   └── validators.js
└── node_modules/             # Installed project dependencies
```

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** express-validator
- **Security:** Helmet.js, bcryptjs
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer
- **External APIs:** Axios for API calls

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
- `GET /api/jobs` - Get all jobs (with filters)
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

#### Optional Variables (Cloudinary)

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### Optional Variables (External Job APIs)

```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
FINDWORK_API_KEY=your_findwork_api_key
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

1. **Helmet.js** - Sets various HTTP headers for security
2. **Rate Limiting** - Limits requests to prevent abuse (100 req/15min, 5 req/15min for auth)
3. **Input Validation** - Validates all incoming data with express-validator
4. **CORS** - Configured to allow requests only from specified origins
5. **Environment Variables** - Secrets stored in `.env` file (never commit to git)
6. **JWT Authentication** - Secure token-based authentication
7. **Password Hashing** - bcryptjs for secure password storage
8. **Error Handling** - Proper error messages without exposing sensitive data

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

- name, email, password (hashed)
- role (jobseeker, employer, admin)
- profile picture, resume
- skills, experience, education
- isEmailVerified

### Job

- title, description, category
- location, jobType (full-time, part-time, contract, remote)
- salary range, budget
- skills required, experience level
- employer (reference to User)
- status (active, closed, draft)

### Application

- job (reference), applicant (reference)
- status (pending, reviewed, accepted, rejected)
- cover letter, resume
- appliedAt, updatedAt

### Notification

- recipient (reference to User)
- type (application, job, system)
- title, message
- isRead, createdAt

### OTP

- email/phone, code
- purpose (registration, login, password_reset, email_verification)
- expiresAt, used

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API info
curl http://localhost:5000/

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123","role":"jobseeker"}'
```

## 🐛 Troubleshooting

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
