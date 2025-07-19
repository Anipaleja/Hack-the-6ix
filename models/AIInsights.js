const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  insightType: {
    type: String,
    enum: ['health_trend', 'symptom_correlation', 'medication_effectiveness', 'lifestyle_recommendation', 'risk_assessment', 'anomaly_detection'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  dataPoints: [{
    date: Date,
    value: mongoose.Schema.Types.Mixed,
    source: String
  }],
  recommendations: [{
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: String
  }],
  correlations: [{
    factor: String,
    correlation: Number,
    significance: String
  }],
  predictiveMetrics: {
    likelihood: Number,
    timeframe: String,
    riskFactors: [String]
  },
  isAcknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for performance
aiInsightSchema.index({ userId: 1, createdAt: -1 });
aiInsightSchema.index({ insightType: 1, severity: 1 });
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
