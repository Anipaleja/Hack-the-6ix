const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  deviceIds: [{
    type: String
  }],
  profile: {
    age: {
      type: Number,
      min: 1,
      max: 150
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    medicalConditions: [{
      condition: String,
      diagnosedDate: Date,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      }
    }],
    allergies: [{
      type: String
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date
    }]
  },
  preferences: {
    reminderFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'daily'
    },
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add indexes
userSchema.index({ email: 1 });
userSchema.index({ deviceIds: 1 });

module.exports = mongoose.model('User', userSchema);
