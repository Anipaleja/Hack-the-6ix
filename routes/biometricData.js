const express = require('express');
const router = express.Router();
const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const AdvancedHealthAI = require('../utils/advancedHealthAI');

const healthAI = new AdvancedHealthAI();

// POST /api/biometric-data - Store new biometric reading
router.post('/', async (req, res) => {
  try {
    const { userId, deviceId, dataType, value, unit, metadata } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get historical data for anomaly detection
    const historicalData = await BiometricData.find({
      userId,
      dataType,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ createdAt: -1 }).limit(100);

    // Create new biometric entry
    const biometricData = new BiometricData({
      userId,
      deviceId,
      dataType,
      value,
      unit,
      metadata: metadata || {},
      quality: req.body.quality || 'good',
      confidence: req.body.confidence || 0.9
    });

    // AI Analysis
    if (historicalData.length > 5) {
      const anomalies = healthAI.detectAnomalies(biometricData, historicalData);
      
      if (anomalies.length > 0) {
        const highestSeverity = anomalies.reduce((max, anomaly) => 
          ['low', 'medium', 'high', 'critical'].indexOf(anomaly.severity) > 
          ['low', 'medium', 'high', 'critical'].indexOf(max) ? anomaly.severity : max, 'low'
        );

        biometricData.aiAnalysis.status = highestSeverity === 'critical' ? 'critical' : 
                                         highestSeverity === 'high' ? 'abnormal' : 'borderline';
        biometricData.aiAnalysis.anomalyScore = Math.max(...anomalies.map(a => a.confidence || 0));
      }
    }

    // Determine normal range based on data type and user profile
    const normalRanges = {
      heart_rate: { min: 60, max: 100 },
      blood_pressure: { min: 90, max: 140 }, // systolic
      temperature: { min: 97.0, max: 99.5 },
      oxygen_saturation: { min: 95, max: 100 }
    };

    if (normalRanges[dataType]) {
      biometricData.aiAnalysis.normalRange = normalRanges[dataType];
    }

    // Trend analysis
    if (historicalData.length > 3) {
      const recentTrend = historicalData.slice(0, 5);
      const avgRecent = recentTrend.reduce((sum, d) => sum + d.value, 0) / recentTrend.length;
      const currentValue = value;

      if (currentValue > avgRecent * 1.1) {
        biometricData.aiAnalysis.trend = 'improving';
      } else if (currentValue < avgRecent * 0.9) {
        biometricData.aiAnalysis.trend = 'declining';
      } else {
        biometricData.aiAnalysis.trend = 'stable';
      }
    }

    await biometricData.save();

    res.status(201).json({
      message: 'Biometric data recorded successfully',
      data: biometricData,
      analysis: {
        anomalies: biometricData.aiAnalysis.anomalyScore > 0.5 ? 'detected' : 'none',
        status: biometricData.aiAnalysis.status,
        trend: biometricData.aiAnalysis.trend
      }
    });

  } catch (error) {
    console.error('Error storing biometric data:', error);
    res.status(500).json({ error: 'Failed to store biometric data' });
  }
});

// GET /api/biometric-data/user/:userId - Get user's biometric data
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dataType, days = 30, limit = 100 } = req.query;

    const query = {
      userId,
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    };

    if (dataType) {
      query.dataType = dataType;
    }

    const biometricData = await BiometricData.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Group data by type for easier consumption
    const groupedData = biometricData.reduce((acc, data) => {
      if (!acc[data.dataType]) {
        acc[data.dataType] = [];
      }
      acc[data.dataType].push(data);
      return acc;
    }, {});

    res.json({
      totalRecords: biometricData.length,
      dataTypes: Object.keys(groupedData),
      data: groupedData,
      summary: {
        latestReadings: Object.keys(groupedData).reduce((acc, type) => {
          acc[type] = groupedData[type][0]; // Most recent
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
  }
});

// GET /api/biometric-data/analytics/:userId - Advanced analytics
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = '30d' } = req.query;

    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    
    const biometricData = await BiometricData.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Group by data type for analysis
    const dataByType = biometricData.reduce((acc, data) => {
      if (!acc[data.dataType]) {
        acc[data.dataType] = [];
      }
      acc[data.dataType].push(data);
      return acc;
    }, {});

    const analytics = {};

    // Generate analytics for each data type
    for (const [dataType, data] of Object.entries(dataByType)) {
      if (data.length < 3) continue;

      const values = data.map(d => d.value);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate variability
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Trend analysis
      const trendAnalysis = healthAI.analyzeTrends(data.map(d => ({ healthData: { severity: d.value } })));

      // Anomaly detection
      const anomalousReadings = data.filter(d => d.aiAnalysis.anomalyScore > 0.5);

      analytics[dataType] = {
        summary: {
          average: Math.round(avg * 100) / 100,
          min,
          max,
          standardDeviation: Math.round(stdDev * 100) / 100,
          totalReadings: data.length
        },
        trend: trendAnalysis,
        anomalies: {
          count: anomalousReadings.length,
          percentage: Math.round((anomalousReadings.length / data.length) * 100),
          recent: anomalousReadings.slice(0, 3)
        },
        qualityMetrics: {
          averageConfidence: data.reduce((sum, d) => sum + d.confidence, 0) / data.length,
          poorQualityCount: data.filter(d => d.quality === 'poor').length
        }
      };
    }

    // Cross-correlation analysis
    const correlations = Object.keys(dataByType).length > 1 ? 
      healthAI.analyzeSymptomCorrelations([], biometricData, []) : [];

    res.json({
      timeframe,
      userId,
      analytics,
      correlations,
      overallHealth: {
        riskScore: Math.random() * 0.3, // Mock risk score
        healthTrendDirection: 'stable',
        recommendations: [
          'Continue regular monitoring',
          'Maintain current health routine'
        ]
      }
    });

  } catch (error) {
    console.error('Error generating biometric analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// GET /api/biometric-data/alerts/:userId - Get health alerts
router.get('/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const criticalData = await BiometricData.find({
      userId,
      'aiAnalysis.status': { $in: ['abnormal', 'critical'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ createdAt: -1 });

    const alerts = criticalData.map(data => ({
      id: data._id,
      type: data.dataType,
      value: data.value,
      status: data.aiAnalysis.status,
      timestamp: data.createdAt,
      severity: data.aiAnalysis.status === 'critical' ? 'high' : 'medium',
      message: `${data.dataType} reading of ${data.value} ${data.unit} is ${data.aiAnalysis.status}`,
      anomalyScore: data.aiAnalysis.anomalyScore
    }));

    res.json({
      alertCount: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'high').length,
      alerts: alerts.slice(0, 10) // Most recent 10 alerts
    });

  } catch (error) {
    console.error('Error fetching health alerts:', error);
    res.status(500).json({ error: 'Failed to fetch health alerts' });
  }
});

// POST /api/biometric-data/batch - Batch upload biometric data
router.post('/batch', async (req, res) => {
  try {
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'Invalid readings array' });
    }

    const processedReadings = [];
    const errors = [];

    for (let i = 0; i < readings.length; i++) {
      try {
        const reading = readings[i];
        const biometricData = new BiometricData({
          ...reading,
          quality: reading.quality || 'good',
          confidence: reading.confidence || 0.9
        });

        await biometricData.save();
        processedReadings.push(biometricData);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.json({
      message: 'Batch processing completed',
      processed: processedReadings.length,
      errors: errors.length,
      errorDetails: errors
    });

  } catch (error) {
    console.error('Error processing batch biometric data:', error);
    res.status(500).json({ error: 'Failed to process batch data' });
  }
});

module.exports = router;
