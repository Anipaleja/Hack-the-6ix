const mongoose = require('mongoose');

const biometricDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  dataType: {
    type: String,
    enum: ['heart_rate', 'blood_pressure', 'temperature', 'oxygen_saturation', 'sleep_quality', 'stress_level', 'activity_level', 'voice_analysis'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.9
  },
  metadata: {
    duration: Number,
    environment: String,
    activity: String,
    position: String,
    deviceVersion: String,
    calibrated: {
      type: Boolean,
      default: true
    }
  },
  aiAnalysis: {
    normalRange: {
      min: Number,
      max: Number
    },
    status: {
      type: String,
      enum: ['normal', 'borderline', 'abnormal', 'critical'],
      default: 'normal'
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'fluctuating'],
      default: 'stable'
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processingErrors: [String]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
biometricDataSchema.index({ userId: 1, dataType: 1, createdAt: -1 });
biometricDataSchema.index({ deviceId: 1, createdAt: -1 });
biometricDataSchema.index({ 'aiAnalysis.status': 1, createdAt: -1 });
biometricDataSchema.index({ 'aiAnalysis.anomalyScore': 1 });

// TTL index for old data (90 days retention)
biometricDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('BiometricData', biometricDataSchema);
