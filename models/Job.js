const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [2000, 'Job description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: {
      values: ['Web Development', 'Mobile Development', 'UI/UX Design', 'Data Science', 'DevOps', 'Cybersecurity', 'Cloud Computing', 'AI/ML', 'Other'],
      message: '{VALUE} is not a valid category'
    }
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [0, 'Budget cannot be negative']
  },
  budgetType: {
    type: String,
    required: [true, 'Budget type is required'],
    enum: {
      values: ['Fixed Price', 'Hourly Rate', 'Project-based'],
      message: '{VALUE} is not a valid budget type'
    }
  },
  skillsRequired: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters']
  }],
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: {
      values: ['Entry Level', 'Intermediate', 'Expert', 'Director'],
      message: '{VALUE} is not a valid experience level'
    }
  },
  projectDuration: {
    type: String,
    required: [true, 'Project duration is required'],
    enum: {
      values: ['Less than 1 month', '1-3 months', '3-6 months', 'More than 6 months'],
      message: '{VALUE} is not a valid project duration'
    }
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Client name cannot exceed 100 characters']
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  applicants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
jobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
jobSchema.index({ title: 'text', description: 'text', skillsRequired: 'text' });
jobSchema.index({ category: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;