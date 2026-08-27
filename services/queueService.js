/**
 * Queue Service
 * Set up BullMQ with Redis to offload heavy tasks
 * Handles background email sending and scheduled job sourcing
 */

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendEmail, sendOTPEmail, sendApplicationStatusEmail, sendInterviewEmail } = require('./emailService');
const logger = require('../utils/logger');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// Create Redis connection
const connection = new IORedis(redisConfig);

connection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

connection.on('connect', () => {
  logger.info('Connected to Redis');
});

/**
 * Create email queue
 */
const emailQueue = new Queue('email-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Create job sourcing queue
 */
const jobSourcingQueue = new Queue('job-sourcing-queue', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

/**
 * Add email job to queue
 * @param {string} type - Email type (otp, welcome, status, interview)
 * @param {Object} data - Email data
 * @returns {Promise<Job>}
 */
const addEmailJob = async (type, data) => {
  try {
    const job = await emailQueue.add(type, data, {
      jobId: `${type}_${Date.now()}`,
    });
    logger.info(`Email job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding email job to queue:', error);
    throw error;
  }
};

/**
 * Add job sourcing job to queue
 * @param {string} source - Job source (adzuna, findwork, remotive)
 * @param {Object} data - Sourcing data
 * @returns {Promise<Job>}
 */
const addJobSourcingJob = async (source, data) => {
  try {
    const job = await jobSourcingQueue.add(source, data, {
      jobId: `${source}_${Date.now()}`,
    });
    logger.info(`Job sourcing job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding job sourcing job to queue:', error);
    throw error;
  }
};

/**
 * Email queue worker
 */
const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { type, data } = job.data;
    
    logger.info(`Processing email job: ${job.id}, type: ${type}`);
    
    switch (type) {
      case 'otp':
        await sendOTPEmail(data.email, data.otp, data.otpType);
        break;
      case 'welcome':
        await sendEmail({
          to: data.email,
          subject: 'Welcome to Jobseek!',
          html: data.html,
        });
        break;
      case 'status':
        await sendApplicationStatusEmail(
          data.email,
          data.name,
          data.jobTitle,
          data.status
        );
        break;
      case 'interview':
        await sendInterviewEmail(
          data.email,
          data.name,
          data.jobTitle,
          data.interviewDate,
          data.interviewType
        );
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
    
    logger.info(`Email job completed: ${job.id}`);
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  logger.info(`Email job completed: ${job.id}`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job failed: ${job?.id}, error: ${err.message}`);
});

/**
 * Job sourcing queue worker
 */
const jobSourcingWorker = new Worker(
  'job-sourcing-queue',
  async (job) => {
    const { source, data } = job.data;
    
    logger.info(`Processing job sourcing job: ${job.id}, source: ${source}`);
    
    // Job sourcing logic will be handled by jobSourcingService
    // This worker will call the appropriate service based on source
    const { aggregateJobs } = require('./jobSourcingService');
    
    switch (source) {
      case 'adzuna':
        await aggregateJobs('adzuna', data);
        break;
      case 'findwork':
        await aggregateJobs('findwork', data);
        break;
      case 'remotive':
        await aggregateJobs('remotive', data);
        break;
      default:
        throw new Error(`Unknown job source: ${source}`);
    }
    
    logger.info(`Job sourcing job completed: ${job.id}`);
  },
  {
    connection,
    concurrency: 2,
  }
);

jobSourcingWorker.on('completed', (job) => {
  logger.info(`Job sourcing job completed: ${job.id}`);
});

jobSourcingWorker.on('failed', (job, err) => {
  logger.error(`Job sourcing job failed: ${job?.id}, error: ${err.message}`);
});

/**
 * Graceful shutdown
 */
const gracefulShutdown = async () => {
  logger.info('Closing queues and workers...');
  
  await emailWorker.close();
  await jobSourcingWorker.close();
  await emailQueue.close();
  await jobSourcingQueue.close();
  await connection.quit();
  
  logger.info('Graceful shutdown completed');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  addEmailJob,
  addJobSourcingJob,
  emailQueue,
  jobSourcingQueue,
  emailWorker,
  jobSourcingWorker,
};
