const mongoose = require('mongoose');

const medicationAlarmSchema = new mongoose.Schema({
  medication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medication',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'acknowledged', 'snoozed', 'missed', 'cancelled'],
    default: 'pending'
  },
  acknowledgedAt: Date,
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  snoozeUntil: Date,
  snoozeReason: String,
  missedAt: Date,
  missedReason: String,
  reminderCount: {
    type: Number,
    default: 0
  },
  maxReminders: {
    type: Number,
    default: 3
  },
  reminderInterval: {
    type: Number, // minutes
    default: 5
  },
  notificationsSent: [{
    type: {
      type: String,
      enum: ['push', 'sms', 'email', 'socket']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    },
    errorMessage: String
  }],
  metadata: {
    dosesSkipped: {
      type: Number,
      default: 0
    },
    consecutiveMissed: {
      type: Number,
      default: 0
    },
    alarmVolume: Number,
    customSound: String,
    vibrationPattern: String,
    emergencyContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
medicationAlarmSchema.index({ patient: 1, scheduledTime: -1 });
medicationAlarmSchema.index({ status: 1, scheduledTime: 1 });
medicationAlarmSchema.index({ medication: 1, status: 1 });
medicationAlarmSchema.index({ familyId: 1, scheduledTime: -1 });

// Virtual for checking if alarm is overdue
medicationAlarmSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'active') return false;
  const now = new Date();
  const overdueThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
  return (now - this.scheduledTime) > overdueThreshold;
});

// Virtual for time until alarm
medicationAlarmSchema.virtual('timeUntilAlarm').get(function() {
  const now = new Date();
  return this.scheduledTime - now; // milliseconds until alarm
});

// Virtual for formatted scheduled time
medicationAlarmSchema.virtual('formattedTime').get(function() {
  return this.scheduledTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
});

// Methods
medicationAlarmSchema.methods.acknowledge = async function(userId, timestamp = new Date()) {
  this.status = 'acknowledged';
  this.acknowledgedAt = timestamp;
  this.acknowledgedBy = userId;
  await this.save();
  return this;
};

medicationAlarmSchema.methods.snooze = async function(minutes = 15, reason = '') {
  this.status = 'snoozed';
  this.snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
  this.snoozeReason = reason;
  await this.save();
  return this;
};

medicationAlarmSchema.methods.markMissed = async function(reason = '') {
  this.status = 'missed';
  this.missedAt = new Date();
  this.missedReason = reason;
  this.metadata.consecutiveMissed = (this.metadata.consecutiveMissed || 0) + 1;
  await this.save();
  return this;
};

medicationAlarmSchema.methods.addNotificationSent = async function(type, status = 'sent', errorMessage = null) {
  this.notificationsSent.push({
    type,
    sentAt: new Date(),
    status,
    errorMessage
  });
  await this.save();
  return this;
};

medicationAlarmSchema.methods.incrementReminder = async function() {
  this.reminderCount += 1;
  await this.save();
  return this;
};

// Static methods
medicationAlarmSchema.statics.getActiveAlarms = function(userId) {
  return this.find({
    patient: userId,
    status: { $in: ['pending', 'active', 'snoozed'] }
  }).populate('medication').sort({ scheduledTime: 1 });
};

medicationAlarmSchema.statics.getOverdueAlarms = function(userId) {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.find({
    patient: userId,
    status: 'active',
    scheduledTime: { $lt: thirtyMinutesAgo }
  }).populate('medication');
};

medicationAlarmSchema.statics.getTodaysAlarms = function(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    patient: userId,
    scheduledTime: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).populate('medication').sort({ scheduledTime: 1 });
};

medicationAlarmSchema.statics.getAdherenceStats = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        patient: userId,
        scheduledTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        acknowledged: {
          $sum: {
            $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0]
          }
        },
        missed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'missed'] }, 1, 0]
          }
        },
        snoozed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'snoozed'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const result = stats[0] || { total: 0, acknowledged: 0, missed: 0, snoozed: 0 };
  result.adherenceRate = result.total > 0 ? (result.acknowledged / result.total) * 100 : 0;
  
  return result;
};

medicationAlarmSchema.statics.getFamilyAlarmHistory = function(familyId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    familyId,
    scheduledTime: { $gte: startDate }
  })
  .populate('patient', 'firstName lastName')
  .populate('medication', 'commonName brandName dosage')
  .sort({ scheduledTime: -1 })
  .limit(100);
};

// Pre-save middleware
medicationAlarmSchema.pre('save', function(next) {
  // Reset consecutive missed count if alarm is acknowledged
  if (this.isModified('status') && this.status === 'acknowledged') {
    this.metadata.consecutiveMissed = 0;
  }
  
  // Update metadata
  if (this.isModified('status') && this.status === 'missed') {
    this.metadata.dosesSkipped = (this.metadata.dosesSkipped || 0) + 1;
  }
  
  next();
});

// Post-save middleware for real-time updates
medicationAlarmSchema.post('save', function(doc) {
  // Emit socket events for status changes
  if (doc.isModified('status')) {
    const io = require('../server').io;
    if (io) {
      // Notify patient
      io.to(doc.patient.toString()).emit('alarmStatusChanged', {
        alarmId: doc._id,
        status: doc.status,
        medication: doc.medication,
        timestamp: new Date()
      });

      // Notify family room
      if (doc.familyId) {
        io.to(`family_${doc.familyId}`).emit('familyAlarmUpdate', {
          alarmId: doc._id,
          patientId: doc.patient,
          status: doc.status,
          medicationId: doc.medication,
          timestamp: new Date()
        });
      }
    }
  }
});

// Ensure virtual fields are serialized
medicationAlarmSchema.set('toJSON', { virtuals: true });
medicationAlarmSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MedicationAlarm', medicationAlarmSchema);
