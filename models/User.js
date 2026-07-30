/**
 * User Model
 * Represents both Job Seekers and Employers
 * Role: 'jobseeker' | 'employer' | 'admin'
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['jobseeker', 'employer', 'admin'],
      default: 'jobseeker',
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Profile fields for all users
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    // Job Seeker specific fields
    profile: {
      headline: {
        type: String,
        trim: true,
      },
      skills: [
        {
          type: String,
          trim: true,
        },
      ],
      experience: [
        {
          title: String,
          company: String,
          location: String,
          startDate: Date,
          endDate: Date,
          current: { type: Boolean, default: false },
          description: String,
        },
      ],
      education: [
        {
          degree: String,
          institution: String,
          fieldOfStudy: String,
          startDate: Date,
          endDate: Date,
          description: String,
        },
      ],
      resume: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
      preferredJobTypes: [
        {
          type: String,
          enum: ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'],
        },
      ],
      preferredLocations: [String],
      expectedSalary: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'USD' },
      },
      portfolioUrl: String,
      linkedinUrl: String,
      githubUrl: String,
    },
    // Employer specific fields
    company: {
      name: {
        type: String,
        trim: true,
      },
      logo: {
        url: String,
        publicId: String,
      },
      industry: String,
      companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      },
      website: String,
      description: String,
      foundedYear: Number,
      location: {
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
    },
    // Notification preferences
    notificationSettings: {
      email: {
        jobAlerts: { type: Boolean, default: true },
        applicationUpdates: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
      push: {
        jobAlerts: { type: Boolean, default: true },
        applicationUpdates: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
/**
 * Compare password method
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} Password match result
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get full name
 * @returns {string} Full name
 */
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

/**
 * Get profile completion percentage
 * @returns {number} Completion percentage (0-100)
 */
userSchema.methods.getProfileCompletion = function () {
  if (this.role === 'jobseeker') {
    const fields = [
      this.firstName,
      this.lastName,
      this.phone,
      this.profile.headline,
      this.profile.skills?.length > 0,
      this.profile.experience?.length > 0,
      this.profile.education?.length > 0,
      this.profile.resume?.url,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  } else if (this.role === 'employer') {
    const fields = [
      this.firstName,
      this.lastName,
      this.phone,
      this.company.name,
      this.company.industry,
      this.company.companySize,
      this.company.description,
      this.company.logo?.url,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }
  return 0;
};

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
