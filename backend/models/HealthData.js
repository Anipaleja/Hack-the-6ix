const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  // User identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },

  // Data source
  source: {
    type: String,
    required: true,
    enum: ['apple_health', 'google_fit', 'manual', 'device_sync', 'wearable']
  },
  deviceInfo: {
    name: String,
    model: String,
    manufacturer: String,
    platform: String,
    appVersion: String
  },

  // Health metrics
  metrics: {
    // Vital signs
    heartRate: {
      value: Number,
      unit: { type: String, default: 'bpm' },
      context: String, // resting, active, recovery
      accuracy: String
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      unit: { type: String, default: 'mmHg' },
      context: String
    },
    bloodOxygen: {
      value: Number,
      unit: { type: String, default: '%' },
      context: String
    },
    bodyTemperature: {
      value: Number,
      unit: { type: String, default: '°F' },
      context: String
    },
    respiratoryRate: {
      value: Number,
      unit: { type: String, default: 'breaths/min' },
      context: String
    },

    // Activity and fitness
    steps: {
      value: Number,
      unit: { type: String, default: 'steps' },
      goal: Number
    },
    distance: {
      value: Number,
      unit: { type: String, default: 'miles' },
      activityType: String
    },
    calories: {
      burned: Number,
      consumed: Number,
      net: Number,
      unit: { type: String, default: 'kcal' }
    },
    activeMinutes: {
      light: Number,
      moderate: Number,
      vigorous: Number,
      total: Number
    },
    exercise: {
      type: String,
      duration: Number, // minutes
      intensity: String,
      calories: Number
    },

    // Sleep data
    sleep: {
      duration: Number, // minutes
      efficiency: Number, // percentage
      stages: {
        deep: Number,
        light: Number,
        rem: Number,
        awake: Number
      },
      bedtime: Date,
      wakeTime: Date,
      quality: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent']
      }
    },

    // Body composition
    weight: {
      value: Number,
      unit: { type: String, default: 'lbs' },
      context: String
    },
    height: {
      value: Number,
      unit: { type: String, default: 'inches' }
    },
    bmi: {
      value: Number,
      category: String
    },
    bodyFat: {
      percentage: Number,
      mass: Number
    },
    muscleMass: {
      percentage: Number,
      mass: Number
    },

    // Nutrition
    nutrition: {
      water: {
        value: Number,
        unit: { type: String, default: 'fl oz' },
        goal: Number
      },
      caffeine: {
        value: Number,
        unit: { type: String, default: 'mg' }
      },
      macros: {
        carbs: Number,
        protein: Number,
        fat: Number,
        fiber: Number,
        sugar: Number
      }
    },

    // Mental health and stress
    stress: {
      level: Number, // 0-100
      context: String,
      triggers: [String]
    },
    mood: {
      rating: Number, // 1-10
      description: String,
      factors: [String]
    },
    mindfulness: {
      duration: Number, // minutes
      type: String // meditation, breathing, etc.
    },

    // Women's health
    menstrualHealth: {
      cycle: {
        phase: String,
        dayOfCycle: Number,
        predictedStart: Date,
        symptoms: [String]
      }
    },

    // Environmental data
    environment: {
      airQuality: Number,
      uvIndex: Number,
      temperature: Number,
      humidity: Number
    }
  },

  // Timestamp and validation
  recordedAt: {
    type: Date,
    required: true
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
  
  // Data quality
  dataQuality: {
    accuracy: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    completeness: Number, // percentage of expected fields populated
    source_confidence: Number, // 0-1
    validated: {
      type: Boolean,
      default: false
    },
    anomaly_score: Number // 0-1, higher means more anomalous
  },

  // Aggregation info
  aggregationType: {
    type: String,
    enum: ['instant', 'hourly', 'daily', 'weekly', 'monthly'],
    default: 'instant'
  },
  aggregationPeriod: {
    start: Date,
    end: Date
  },

  // Notes and context
  notes: String,
  tags: [String],
  context: {
    activity: String,
    location: String,
    weather: String,
    medication_taken: Boolean,
    stress_level: String
  },

  // Privacy and sharing
  isPrivate: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    permissions: [String]
  }]
}, {
  timestamps: true
});

// Calculate health score
healthDataSchema.methods.calculateHealthScore = function() {
  let score = 0;
  let factors = 0;

  const metrics = this.metrics;

  // Heart rate score (resting heart rate)
  if (metrics.heartRate && metrics.heartRate.context === 'resting') {
    const hr = metrics.heartRate.value;
    if (hr >= 60 && hr <= 100) score += 20;
    else if (hr >= 50 && hr <= 110) score += 15;
    else score += 5;
    factors++;
  }

  // Steps score
  if (metrics.steps) {
    const steps = metrics.steps.value;
    if (steps >= 10000) score += 20;
    else if (steps >= 7500) score += 15;
    else if (steps >= 5000) score += 10;
    else score += 5;
    factors++;
  }

  // Sleep score
  if (metrics.sleep && metrics.sleep.duration) {
    const sleepHours = metrics.sleep.duration / 60;
    if (sleepHours >= 7 && sleepHours <= 9) score += 20;
    else if (sleepHours >= 6 && sleepHours <= 10) score += 15;
    else score += 5;
    factors++;
  }

  // Blood pressure score
  if (metrics.bloodPressure) {
    const systolic = metrics.bloodPressure.systolic;
    const diastolic = metrics.bloodPressure.diastolic;
    if (systolic <= 120 && diastolic <= 80) score += 20;
    else if (systolic <= 140 && diastolic <= 90) score += 10;
    else score += 5;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 0;
};

// Get trends for a specific metric
healthDataSchema.statics.getTrends = async function(userId, metric, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        recordedAt: { $gte: startDate },
        [`metrics.${metric}`]: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" }
        },
        avgValue: { $avg: `$metrics.${metric}.value` },
        minValue: { $min: `$metrics.${metric}.value` },
        maxValue: { $max: `$metrics.${metric}.value` },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ];

  return this.aggregate(pipeline);
};

// Check for anomalies
healthDataSchema.methods.detectAnomalies = function() {
  const anomalies = [];
  const metrics = this.metrics;

  // Heart rate anomalies
  if (metrics.heartRate) {
    const hr = metrics.heartRate.value;
    if (hr > 200 || hr < 30) {
      anomalies.push({
        metric: 'heartRate',
        value: hr,
        severity: 'high',
        message: 'Heart rate outside normal range'
      });
    }
  }

  // Blood pressure anomalies
  if (metrics.bloodPressure) {
    const systolic = metrics.bloodPressure.systolic;
    const diastolic = metrics.bloodPressure.diastolic;
    
    if (systolic > 180 || diastolic > 120) {
      anomalies.push({
        metric: 'bloodPressure',
        value: `${systolic}/${diastolic}`,
        severity: 'high',
        message: 'Blood pressure critically high'
      });
    }
  }

  // Blood oxygen anomalies
  if (metrics.bloodOxygen && metrics.bloodOxygen.value < 90) {
    anomalies.push({
      metric: 'bloodOxygen',
      value: metrics.bloodOxygen.value,
      severity: 'high',
      message: 'Blood oxygen level dangerously low'
    });
  }

  this.dataQuality.anomaly_score = anomalies.length > 0 ? 
    anomalies.reduce((acc, a) => acc + (a.severity === 'high' ? 0.3 : 0.1), 0) : 0;

  return anomalies;
};

// Index for efficient queries
healthDataSchema.index({ user: 1, recordedAt: -1 });
healthDataSchema.index({ familyId: 1, recordedAt: -1 });
healthDataSchema.index({ source: 1, recordedAt: -1 });
healthDataSchema.index({ 'metrics.heartRate.value': 1 });
healthDataSchema.index({ 'metrics.steps.value': 1 });

module.exports = mongoose.model('HealthData', healthDataSchema);
