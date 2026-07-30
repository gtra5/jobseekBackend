const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const { body, validationResult } = require("express-validator");

// Validation middleware
const validateJobInput = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ max: 2000 })
    .withMessage("Job description cannot exceed 2000 characters"),
  body("category")
    .notEmpty()
    .withMessage("Job category is required")
    .isIn([
      "Web Development",
      "Mobile Development",
      "UI/UX Design",
      "Data Science",
      "DevOps",
      "Cybersecurity",
      "Cloud Computing",
      "AI/ML",
      "Other",
    ])
    .withMessage("Invalid job category"),
  body("budget")
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),
  body("budgetType")
    .notEmpty()
    .withMessage("Budget type is required")
    .isIn(["Fixed Price", "Hourly Rate", "Project-based"])
    .withMessage("Invalid budget type"),
  body("skillsRequired")
    .isArray()
    .withMessage("Skills must be an array")
    .optional(),
  body("experienceLevel")
    .notEmpty()
    .withMessage("Experience level is required")
    .isIn(["Entry Level", "Intermediate", "Expert", "Director"])
    .withMessage("Invalid experience level"),
  body("projectDuration")
    .notEmpty()
    .withMessage("Project duration is required")
    .isIn([
      "Less than 1 month",
      "1-3 months",
      "3-6 months",
      "More than 6 months",
    ])
    .withMessage("Invalid project duration"),
  body("clientName")
    .trim()
    .notEmpty()
    .withMessage("Client name is required")
    .isLength({ max: 100 })
    .withMessage("Client name cannot exceed 100 characters"),
  body("clientEmail")
    .trim()
    .notEmpty()
    .withMessage("Client email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
];

// @route   POST /api/jobs
// @desc    Create a new job
// @access  Public (should be protected with auth in production)
router.post("/", validateJobInput, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      budget,
      budgetType,
      skillsRequired,
      experienceLevel,
      projectDuration,
      clientName,
      clientEmail,
    } = req.body;

    const job = new Job({
      title,
      description,
      category,
      budget,
      budgetType,
      skillsRequired: skillsRequired || [],
      experienceLevel,
      projectDuration,
      clientName,
      clientEmail,
    });

    const savedJob = await job.save();

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      job: savedJob,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating job",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// @route   GET /api/jobs
// @desc    Get all jobs with optional filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, experienceLevel, status, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (status) query.status = status;
    else query.status = "Open";

    if (search) {
      query.$text = { $search: search };
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching jobs",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// ✅ ADDED ROUTE: Must be defined BEFORE /:id
// @route   GET /api/jobs/employer/my-jobs
// @desc    Get all jobs posted by the employer
// @access  Public (should be protected with auth middleware in production)
router.get("/employer/my-jobs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    
    // Optional filter by client Email or ID if passed in query/auth
    const query = {};
    if (req.query.clientEmail) {
      query.clientEmail = req.query.clientEmail;
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching employer jobs",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get a single job by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Error fetching job:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while fetching job",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update a job
// @access  Public (should be protected with auth in production)
router.put("/:id", validateJobInput, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const {
      title,
      description,
      category,
      budget,
      budgetType,
      skillsRequired,
      experienceLevel,
      projectDuration,
      status,
    } = req.body;

    job.title = title || job.title;
    job.description = description || job.description;
    job.category = category || job.category;
    job.budget = budget || job.budget;
    job.budgetType = budgetType || job.budgetType;
    job.skillsRequired = skillsRequired || job.skillsRequired;
    job.experienceLevel = experienceLevel || job.experienceLevel;
    job.projectDuration = projectDuration || job.projectDuration;
    job.status = status || job.status;

    const updatedJob = await job.save();

    res.json({
      success: true,
      message: "Job updated successfully",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating job",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete a job
// @access  Public (should be protected with auth in production)
router.delete("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while deleting job",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;