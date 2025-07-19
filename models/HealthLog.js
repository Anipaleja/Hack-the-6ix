const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transcription: {
    type: String,
    required: true,
    trim: true
  },
  audioFile: {
    type: String, // Store file path or URL to audio file
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  deviceId: {
    type: String,
    required: false
  },
  metadata: {
    duration: {
      type: Number, // Duration in seconds
      default: 0
    },
    confidence: {
      type: Number, // Transcription confidence score (0-1)
      default: 0
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  healthData: {
    symptoms: [{
      type: String
    }],
    severity: {
      type: Number,
      min: 1,
      max: 10,
      default: null
    },
    tags: [{
      type: String
    }],
    mood: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'terrible'],
      default: null
    },
    // Keyword detection results
    detectedKeywords: [{
      word: String,
      category: {
        type: String,
        enum: ['symptom', 'emotion', 'medication', 'body_part', 'severity', 'time', 'activity']
      },
      confidence: Number,
      position: Number // Position in transcription
    }],
    // Medical entities detected
    medicalEntities: [{
      entity: String,
      type: {
        type: String,
        enum: ['condition', 'medication', 'dosage', 'frequency', 'body_part', 'symptom']
      },
      confidence: Number
    }],
    // Time-based context
    timeContext: {
      when: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'night', 'after_meal', 'before_meal', 'exercise', 'rest']
      },
      duration: String, // "2 hours", "since yesterday", etc.
      frequency: String // "daily", "occasionally", "first time", etc.
    }
  },
  processed: {
    type: Boolean,
    default: false
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
healthLogSchema.index({ userId: 1, timestamp: -1 });
healthLogSchema.index({ timestamp: -1 });
healthLogSchema.index({ processed: 1 });

module.exports = mongoose.model('HealthLog', healthLogSchema);
