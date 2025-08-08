const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  // Query content
  question: {
    type: String,
    required: true,
    trim: true
  },
  context: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'medication',
      'symptoms',
      'emergency',
      'general_health',
      'nutrition',
      'exercise',
      'mental_health',
      'chronic_condition',
      'prevention',
      'diagnosis'
    ]
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },

  // AI Response
  aiResponse: {
    content: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    sources: [String],
    disclaimers: [String],
    recommendedActions: [String],
    redFlags: [String], // Warning signs that need medical attention
    followUpQuestions: [String]
  },

  // Medical context from user's data
  relevantMedications: [{
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication'
    },
    relevance: String
  }],
  relevantHealthData: [{
    dataType: String,
    value: Number,
    unit: String,
    timestamp: Date,
    relevance: String
  }],
  relevantConditions: [String],

  // User and family
  askedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },

  // Sharing and notifications
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['doctor', 'next_of_kin']
    },
    notified: {
      type: Boolean,
      default: false
    },
    notifiedAt: Date,
    viewed: {
      type: Boolean,
      default: false
    },
    viewedAt: Date
  }],

  // Professional review
  doctorReview: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    accuracy: {
      type: String,
      enum: ['accurate', 'partially_accurate', 'inaccurate', 'needs_attention']
    },
    recommendsFollowUp: {
      type: Boolean,
      default: false
    },
    appointmentNeeded: {
      type: Boolean,
      default: false
    }
  },

  // Query metadata
  processingTime: Number, // milliseconds
  aiModel: String,
  language: {
    type: String,
    default: 'en'
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['pending', 'processed', 'reviewed', 'archived'],
    default: 'pending'
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },

  // User feedback
  userFeedback: {
    helpful: {
      type: Boolean
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    submittedAt: Date
  },

  // Follow-up
  followUpQueries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Query'
  }],
  originalQuery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Query'
  }
}, {
  timestamps: true
});

// Determine urgency based on content
querySchema.methods.analyzeUrgency = function() {
  const emergencyKeywords = [
    'chest pain', 'difficulty breathing', 'unconscious', 'bleeding heavily',
    'severe pain', 'heart attack', 'stroke', 'overdose', 'allergic reaction',
    'suicide', 'emergency', 'urgent', 'help'
  ];

  const highUrgencyKeywords = [
    'pain', 'fever', 'nausea', 'vomiting', 'dizziness', 'shortness of breath',
    'swelling', 'rash', 'infection', 'injury'
  ];

  const questionLower = this.question.toLowerCase();

  if (emergencyKeywords.some(keyword => questionLower.includes(keyword))) {
    this.urgency = 'emergency';
    this.isEmergency = true;
  } else if (highUrgencyKeywords.some(keyword => questionLower.includes(keyword))) {
    this.urgency = 'high';
  }

  return this.urgency;
};

// Check if family notification is needed
querySchema.methods.shouldNotifyFamily = function() {
  return this.urgency === 'emergency' || 
         this.urgency === 'high' || 
         this.aiResponse.redFlags.length > 0;
};

// Mark as viewed by user
querySchema.methods.markViewedBy = function(userId) {
  const sharedUser = this.sharedWith.find(s => s.user.toString() === userId.toString());
  if (sharedUser) {
    sharedUser.viewed = true;
    sharedUser.viewedAt = new Date();
  }
  return this.save();
};

// Add to shared list
querySchema.methods.shareWith = function(userId, role) {
  const existingShare = this.sharedWith.find(s => s.user.toString() === userId.toString());
  if (!existingShare) {
    this.sharedWith.push({
      user: userId,
      role: role
    });
  }
  return this.save();
};

// Calculate response time
querySchema.virtual('responseTime').get(function() {
  if (this.processingTime) {
    return `${this.processingTime}ms`;
  }
  return null;
});

// Get urgency color for UI
querySchema.virtual('urgencyColor').get(function() {
  const colors = {
    'low': 'green',
    'medium': 'blue',
    'high': 'orange',
    'emergency': 'red'
  };
  return colors[this.urgency] || 'gray';
});

// Index for efficient queries
querySchema.index({ patient: 1, createdAt: -1 });
querySchema.index({ familyId: 1, createdAt: -1 });
querySchema.index({ urgency: 1, status: 1 });
querySchema.index({ isEmergency: 1, createdAt: -1 });

module.exports = mongoose.model('Query', querySchema);
