/**
 * Job Sourcing Service
 * Aggregates external job listings from multiple APIs:
 * - Adzuna (requires APP_ID and APP_KEY)
 * - Findwork (requires Bearer token)
 * - JSearch via RapidAPI (requires RAPIDAPI_KEY)
 * - Remotive (public JSON)
 * - Arbeitnow (public JSON)
 */

const axios = require('axios');
const xss = require('xss');

/**
 * Sanitize string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return xss(str, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  });
};

/**
 * Sanitize job object recursively
 * @param {Object} job - Job object to sanitize
 * @returns {Object} Sanitized job object
 */
const sanitizeJob = (job) => {
  const sanitized = { ...job };
  
  const stringFields = ['title', 'company', 'location', 'description', 'category', 'applyUrl'];
  stringFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });

  // Sanitize arrays of strings
  if (sanitized.tags && Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map(tag => sanitizeString(tag));
  }

  return sanitized;
};

/**
 * Normalize job data from various APIs to unified schema
 * @param {Object} job - Raw job data from external API
 * @param {string} source - API source name
 * @returns {Object} Normalized job object
 */
const normalizeJob = (job, source) => {
  const normalized = {
    id: null,
    title: '',
    company: '',
    location: '',
    description: '',
    jobType: 'Full-time',
    salary: null,
    applyUrl: '',
    source: source,
    postedAt: null,
    category: '',
    tags: [],
    remote: false,
  };

  switch (source) {
    case 'adzuna':
      normalized.id = job.id || job.job_id;
      normalized.title = job.title || '';
      normalized.company = job.company?.display_name || '';
      normalized.location = job.location?.display_name || '';
      normalized.description = job.description || '';
      normalized.jobType = mapAdzunaContractType(job.contract_type);
      normalized.salary = parseAdzunaSalary(job.salary_min, job.salary_max, job.salary_currency);
      normalized.applyUrl = job.redirect_url || job.url || '';
      normalized.postedAt = job.created || job.posted_at;
      normalized.category = job.category?.label || '';
      normalized.tags = job.tags || [];
      normalized.remote = job.location?.display_name?.toLowerCase().includes('remote') || false;
      break;

    case 'findwork':
      normalized.id = job.id || job.slug;
      normalized.title = job.role || job.title || '';
      normalized.company = job.company_name || '';
      normalized.location = job.location || '';
      normalized.description = job.text || job.description || '';
      normalized.jobType = mapFindworkEmploymentType(job.employment_type);
      normalized.salary = job.salary ? { min: null, max: null, currency: 'USD', text: job.salary } : null;
      normalized.applyUrl = job.url || job.apply_url || '';
      normalized.postedAt = job.posted_at || job.published_at;
      normalized.category = job.category || '';
      normalized.tags = job.tags || [];
      normalized.remote = job.remote || false;
      break;

    case 'jsearch':
      normalized.id = job.job_id || job.job_id;
      normalized.title = job.job_title || '';
      normalized.company = job.employer_name || '';
      normalized.location = job.job_location || '';
      normalized.description = job.job_description || '';
      normalized.jobType = mapJSearchJobType(job.job_employment_type);
      normalized.salary = parseJSearchSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency);
      normalized.applyUrl = job.job_apply_link || job.job_google_link || '';
      normalized.postedAt = job.job_posted_at_datetime_utc;
      normalized.category = job.job_category || '';
      normalized.tags = job.job_highlights?.Qualifications || [];
      normalized.remote = job.job_is_remote || false;
      break;

    case 'remotive':
      normalized.id = job.id || job.slug;
      normalized.title = job.title || '';
      normalized.company = job.company_name || '';
      normalized.location = job.candidate_required_location || 'Remote';
      normalized.description = job.description || '';
      normalized.jobType = mapRemotiveJobType(job.job_type);
      normalized.salary = job.salary ? { min: null, max: null, currency: 'USD', text: job.salary } : null;
      normalized.applyUrl = job.url || job.apply_url || '';
      normalized.postedAt = job.publication_date || job.created_at;
      normalized.category = job.category || '';
      normalized.tags = job.tags || [];
      normalized.remote = true; // Remotive is exclusively remote
      break;

    case 'arbeitnow':
      normalized.id = job.slug || job.id;
      normalized.title = job.title || '';
      normalized.company = job.company_name || '';
      normalized.location = job.location || '';
      normalized.description = job.description || '';
      normalized.jobType = job.job_types?.[0]
        ? mapArbeitnowJobType(job.job_types[0])
        : 'Full-time';
      normalized.salary = job.salary ? { min: null, max: null, currency: 'USD', text: job.salary } : null;
      normalized.applyUrl = job.url || job.apply_url || '';
      normalized.postedAt = job.created_at || job.published_at;
      normalized.category = job.tags?.[0] || '';
      normalized.tags = job.tags || [];
      normalized.remote = job.remote || false;
      break;

    default:
      throw new Error(`Unknown source: ${source}`);
  }

  // Sanitize the normalized job to prevent XSS
  return sanitizeJob(normalized);
};

/**
 * Map Adzuna contract types to standard job types
 */
const mapAdzunaContractType = (contractType) => {
  const typeMap = {
    'full_time': 'Full-time',
    'part_time': 'Part-time',
    'contract': 'Contract',
    'permanent': 'Full-time',
    'temporary': 'Contract',
    'internship': 'Contract',
  };
  return typeMap[contractType?.toLowerCase()] || 'Full-time';
};

/**
 * Map Findwork employment types to standard job types
 */
const mapFindworkEmploymentType = (employmentType) => {
  const typeMap = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'freelance': 'Contract',
  };
  return typeMap[employmentType?.toLowerCase()] || 'Full-time';
};

/**
 * Map JSearch employment types to standard job types
 */
const mapJSearchJobType = (jobType) => {
  if (!jobType) return 'Full-time';
  const type = jobType.toLowerCase();
  if (type.includes('full')) return 'Full-time';
  if (type.includes('part')) return 'Part-time';
  if (type.includes('contract') || type.includes('freelance')) return 'Contract';
  if (type.includes('remote')) return 'Remote';
  return 'Full-time';
};

/**
 * Map Remotive job types to standard job types
 */
const mapRemotiveJobType = (jobType) => {
  const typeMap = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'freelance': 'Contract',
  };
  return typeMap[jobType?.toLowerCase()] || 'Full-time';
};

/**
 * Map Arbeitnow job types to standard job types
 */
const mapArbeitnowJobType = (jobType) => {
  const typeMap = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'freelance': 'Contract',
  };
  return typeMap[jobType?.toLowerCase()] || 'Full-time';
};

/**
 * Parse Adzuna salary data
 */
const parseAdzunaSalary = (min, max, currency = 'USD') => {
  if (!min && !max) return null;
  return {
    min: min || null,
    max: max || null,
    currency: currency || 'USD',
    text: max ? `${currency} ${min} - ${max}` : `${currency} ${min}`,
  };
};

/**
 * Parse JSearch salary data
 */
const parseJSearchSalary = (min, max, currency = 'USD') => {
  if (!min && !max) return null;
  return {
    min: min || null,
    max: max || null,
    currency: currency || 'USD',
    text: max ? `${currency} ${min} - ${max}` : `${currency} ${min}`,
  };
};

/**
 * Fetch jobs from Adzuna API
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Normalized jobs
 */
const fetchAdzunaJobs = async (params = {}) => {
  try {
    const { keywords = '', location = '', page = 1, limit = 10 } = params;
    
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      console.warn('Adzuna API credentials not configured');
      return [];
    }

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/${page}`;
    const response = await axios.get(url, {
      params: {
        app_id: appId,
        app_key: appKey,
        what: keywords,
        where: location,
        'content-type': 'application/json',
        results_per_page: limit,
      },
    });

    if (response.data?.results) {
      return response.data.results.map(job => normalizeJob(job, 'adzuna'));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Adzuna jobs:', error.message, error.response?.data);
    return [];
  }
};

/**
 * Fetch jobs from Findwork API
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Normalized jobs
 */
const fetchFindworkJobs = async (params = {}) => {
  try {
    const { keywords = '', location = '', remote = false, page = 1 } = params;
    
    const apiKey = process.env.FINDWORK_API_KEY;

    if (!apiKey) {
      console.warn('Findwork API key not configured');
      return [];
    }

    const url = 'https://www.findwork.dev/api/jobs/';
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      params: {
        search: keywords,
        location: location,
        remote: remote,
        page: page,
      },
    });

    if (response.data?.results) {
      return response.data.results.map(job => normalizeJob(job, 'findwork'));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Findwork jobs:', error.message, error.response?.data);
    return [];
  }
};

/**
 * Fetch jobs from Remotive API (public)
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Normalized jobs
 */
const fetchRemotiveJobs = async (params = {}) => {
  try {
    const { keywords = '', category = '' } = params;
    
    let url = 'https://remotive.com/api/remote-jobs';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }

    const response = await axios.get(url);

    if (response.data?.jobs) {
      let jobs = response.data.jobs;
      
      // Filter by keywords if provided
      if (keywords) {
        const keywordLower = keywords.toLowerCase();
        jobs = jobs.filter(job => 
          job.title?.toLowerCase().includes(keywordLower) ||
          job.company_name?.toLowerCase().includes(keywordLower) ||
          job.description?.toLowerCase().includes(keywordLower)
        );
      }
      
      return jobs.map(job => normalizeJob(job, 'remotive'));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Remotive jobs:', error.message);
    return [];
  }
};

/**
 * Fetch jobs from Arbeitnow API (public)
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Normalized jobs
 */
const fetchArbeitnowJobs = async (params = {}) => {
  try {
    const { keywords = '' } = params;
    
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    const response = await axios.get(url);

    if (response.data?.data) {
      let jobs = response.data.data;
      
      // Filter by keywords if provided
      if (keywords) {
        const keywordLower = keywords.toLowerCase();
        jobs = jobs.filter(job => 
          job.title?.toLowerCase().includes(keywordLower) ||
          job.company_name?.toLowerCase().includes(keywordLower) ||
          job.description?.toLowerCase().includes(keywordLower)
        );
      }
      
      return jobs.map(job => normalizeJob(job, 'arbeitnow'));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Arbeitnow jobs:', error.message);
    return [];
  }
};

/**
 * Aggregate jobs from all configured sources
 * @param {Object} params - Search parameters
 * @param {Array<string>} sources - Specific sources to fetch from (optional)
 * @returns {Promise<Object>} Aggregated jobs by source
 */
const aggregateJobs = async (params = {}, sources = null) => {
  const allSources = ['adzuna', 'findwork', 'remotive', 'arbeitnow'];
  const sourcesToFetch = sources || allSources;

  const results = {};

  if (sourcesToFetch.includes('adzuna')) {
    results.adzuna = await fetchAdzunaJobs(params);
  }

  if (sourcesToFetch.includes('findwork')) {
    results.findwork = await fetchFindworkJobs(params);
  }

  if (sourcesToFetch.includes('remotive')) {
    results.remotive = await fetchRemotiveJobs(params);
  }

  if (sourcesToFetch.includes('arbeitnow')) {
    results.arbeitnow = await fetchArbeitnowJobs(params);
  }

  return results;
};

/**
 * Get flattened list of all jobs from all sources
 * @param {Object} params - Search parameters
 * @param {Array<string>} sources - Specific sources to fetch from (optional)
 * @returns {Promise<Array>} Flattened array of all jobs
 */
const getAllJobs = async (params = {}, sources = null) => {
  const aggregated = await aggregateJobs(params, sources);
  const allJobs = [];

  Object.keys(aggregated).forEach(source => {
    aggregated[source].forEach(job => {
      allJobs.push(job);
    });
  });

  return allJobs;
};

/**
 * Get available categories from Remotive
 * @returns {Promise<Array>} List of categories
 */
const getRemotiveCategories = async () => {
  try {
    const url = 'https://remotive.com/api/remote-jobs/categories';
    const response = await axios.get(url);
    return response.data?.categories || [];
  } catch (error) {
    console.error('Error fetching Remotive categories:', error.message);
    return [];
  }
};

/**
 * Get configuration status of all job sources
 * @returns {Object} Configuration status for each source
 */
const getSourceStatus = () => {
  return {
    adzuna: {
      configured: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    },
    findwork: {
      configured: !!process.env.FINDWORK_API_KEY,
    },
    remotive: {
      configured: true, // Public API, no credentials needed
    },
    arbeitnow: {
      configured: true, // Public API, no credentials needed
    },
  };
};

module.exports = {
  normalizeJob,
  fetchAdzunaJobs,
  fetchFindworkJobs,
  fetchRemotiveJobs,
  fetchArbeitnowJobs,
  aggregateJobs,
  getAllJobs,
  getRemotiveCategories,
  getSourceStatus,
};
