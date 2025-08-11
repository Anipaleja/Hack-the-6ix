const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const authUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['client', 'doctor', 'next_of_kin'],
    default: 'client'
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  avatar: {
    type: String
  },
  // Family connection
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },
  // Device tokens for push notifications
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  // Health data integration
  healthIntegrations: {
    appleHealth: {
      enabled: {
        type: Boolean,
        default: false
      },
      lastSync: Date,
      accessToken: String
    },
    googleFit: {
      enabled: {
        type: Boolean,
        default: false
      },
      lastSync: Date,
      accessToken: String,
      refreshToken: String
    }
  },
  // Notification preferences
  notificationSettings: {
    medication: {
      type: Boolean,
      default: true
    },
    healthAlerts: {
      type: Boolean,
      default: true
    },
    familyUpdates: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  // Medical information
  medicalInfo: {
    allergies: [String],
    conditions: [String],
    bloodType: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
authUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
authUserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
authUserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.healthIntegrations.appleHealth.accessToken;
  delete user.healthIntegrations.googleFit.accessToken;
  delete user.healthIntegrations.googleFit.refreshToken;
  return user;
};

// Get full name
authUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if user can access family data
authUserSchema.methods.canAccessFamilyData = function() {
  return this.familyId !== null;
};

// Get user's role display name
authUserSchema.virtual('roleDisplay').get(function() {
  const roleMap = {
    'client': 'Patient',
    'doctor': 'Doctor',
    'next_of_kin': 'Family Member'
  };
  return roleMap[this.role] || this.role;
});

module.exports = mongoose.model('AuthUser', authUserSchema);
