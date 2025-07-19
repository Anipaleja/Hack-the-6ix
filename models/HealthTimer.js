const mongoose = require('mongoose');

const healthTimerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active'
  },
  timerType: {
    type: String,
    enum: ['check_in', 'medication', 'exercise', 'custom'],
    default: 'check_in'
  },
  notificationSettings: {
    sendEmergencyAlert: {
      type: Boolean,
      default: true
    },
    alertDelayMinutes: {
      type: Number,
      default: 5 // How long to wait before sending emergency alert
    },
    emergencyContactIds: [{
      type: mongoose.Schema.Types.ObjectId
    }]
  },
  deviceId: {
    type: String,
    required: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  lastReminderSent: {
    type: Date,
    default: null
  },
  emergencyAlertSent: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
healthTimerSchema.index({ userId: 1, status: 1 });
healthTimerSchema.index({ scheduledTime: 1, status: 1 });
healthTimerSchema.index({ status: 1, scheduledTime: 1 });

// Add a method to check if timer has expired
healthTimerSchema.methods.isExpired = function() {
  return new Date() > this.scheduledTime && this.status === 'active';
};

// Add a method to get time remaining
healthTimerSchema.methods.getTimeRemaining = function() {
  const now = new Date();
  const remaining = this.scheduledTime - now;
  return Math.max(0, remaining);
};

module.exports = mongoose.model('HealthTimer', healthTimerSchema);
