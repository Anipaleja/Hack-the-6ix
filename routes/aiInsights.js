const express = require('express');
const router = express.Router();
const AIInsight = require('../models/AIInsights');
const HealthLog = require('../models/HealthLog');
const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const AdvancedHealthAI = require('../utils/advancedHealthAI');

const healthAI = new AdvancedHealthAI();

// GET /api/ai-insights/user/:userId - Get AI insights for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, severity, acknowledged = 'all', limit = 20 } = req.query;

    const query = { userId };

    if (type) {
      query.insightType = type;
    }

    if (severity) {
      query.severity = severity;
    }

    if (acknowledged === 'true') {
      query.isAcknowledged = true;
    } else if (acknowledged === 'false') {
      query.isAcknowledged = false;
    }

    const insights = await AIInsight.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Group insights by type
    const groupedInsights = insights.reduce((acc, insight) => {
      if (!acc[insight.insightType]) {
        acc[insight.insightType] = [];
      }
      acc[insight.insightType].push(insight);
      return acc;
    }, {});

    res.json({
      totalInsights: insights.length,
      unacknowledged: insights.filter(i => !i.isAcknowledged).length,
      critical: insights.filter(i => i.severity === 'critical').length,
      insights: groupedInsights,
      summary: {
        mostCommonType: Object.keys(groupedInsights).reduce((a, b) => 
          groupedInsights[a].length > groupedInsights[b].length ? a : b
        ),
        averageConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
      }
    });

  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// POST /api/ai-insights/generate/:userId - Generate new AI insights
router.post('/generate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent health logs (last 30 days)
    const healthLogs = await HealthLog.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Get recent biometric data (last 30 days)
    const biometricData = await BiometricData.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Generate personalized insights
    const personalizedInsights = healthAI.generatePersonalizedInsights(
      userId, healthLogs, biometricData, user.profile
    );

    // Generate predictive insights
    const predictiveInsights = healthAI.predictHealthTrends(userId, '7d');

    // Correlation analysis
    const correlations = healthAI.analyzeSymptomCorrelations(
      healthLogs.flatMap(log => log.detectedKeywords?.symptoms || []),
      biometricData,
      []
    );

    const allInsights = [];

    // Convert personalized insights to database format
    for (const insight of personalizedInsights) {
      const aiInsight = new AIInsight({
        userId,
        insightType: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        severity: insight.severity,
        recommendations: insight.recommendations || [],
        dataPoints: []
      });

      await aiInsight.save();
      allInsights.push(aiInsight);
    }

    // Generate risk assessment insight
    if (predictiveInsights.riskFactors.length > 0) {
      const riskInsight = new AIInsight({
        userId,
        insightType: 'risk_assessment',
        title: 'Health Risk Assessment',
        description: `Identified ${predictiveInsights.riskFactors.length} potential risk factors`,
        confidence: 0.8,
        severity: predictiveInsights.riskFactors.some(r => r.likelihood > 0.7) ? 'high' : 'medium',
        predictiveMetrics: {
          likelihood: Math.max(...predictiveInsights.riskFactors.map(r => r.likelihood)),
          timeframe: '7d',
          riskFactors: predictiveInsights.riskFactors.map(r => r.factor)
        },
        recommendations: predictiveInsights.recommendations
      });

      await riskInsight.save();
      allInsights.push(riskInsight);
    }

    // Generate correlation insights
    if (correlations.length > 0) {
      for (const correlation of correlations) {
        const correlationInsight = new AIInsight({
          userId,
          insightType: 'symptom_correlation',
          title: 'Health Pattern Correlation',
          description: correlation.insight,
          confidence: Math.abs(correlation.correlation),
          severity: correlation.significance === 'high' ? 'medium' : 'low',
          correlations: [{
            factor: correlation.factors.join(' & '),
            correlation: correlation.correlation,
            significance: correlation.significance
          }]
        });

        await correlationInsight.save();
        allInsights.push(correlationInsight);
      }
    }

    // Anomaly detection insights
    const recentAnomalies = await BiometricData.find({
      userId,
      'aiAnalysis.anomalyScore': { $gt: 0.7 },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    if (recentAnomalies.length > 0) {
      const anomalyInsight = new AIInsight({
        userId,
        insightType: 'anomaly_detection',
        title: 'Health Anomalies Detected',
        description: `${recentAnomalies.length} unusual health readings detected in the past week`,
        confidence: 0.85,
        severity: recentAnomalies.some(a => a.aiAnalysis.status === 'critical') ? 'high' : 'medium',
        dataPoints: recentAnomalies.map(a => ({
          date: a.createdAt,
          value: a.value,
          source: a.dataType
        })),
        recommendations: [{
          action: 'Review recent anomalous readings with healthcare provider',
          priority: 'high',
          category: 'medical'
        }]
      });

      await anomalyInsight.save();
      allInsights.push(anomalyInsight);
    }

    res.json({
      message: 'AI insights generated successfully',
      generatedCount: allInsights.length,
      insights: allInsights,
      categories: [...new Set(allInsights.map(i => i.insightType))],
      processing: {
        healthLogsAnalyzed: healthLogs.length,
        biometricDataAnalyzed: biometricData.length,
        correlationsFound: correlations.length,
        anomaliesDetected: recentAnomalies.length
      }
    });

  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

// PUT /api/ai-insights/:id/acknowledge - Acknowledge an insight
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const insight = await AIInsight.findById(id);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    insight.isAcknowledged = true;
    insight.acknowledgedAt = new Date();
    
    if (feedback) {
      insight.userFeedback = feedback;
    }

    await insight.save();

    res.json({
      message: 'Insight acknowledged successfully',
      insight
    });

  } catch (error) {
    console.error('Error acknowledging insight:', error);
    res.status(500).json({ error: 'Failed to acknowledge insight' });
  }
});

// GET /api/ai-insights/dashboard/:userId - Dashboard summary
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get insights from last 7 days
    const recentInsights = await AIInsight.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Get critical insights that need attention
    const criticalInsights = await AIInsight.find({
      userId,
      severity: 'critical',
      isAcknowledged: false
    }).sort({ createdAt: -1 }).limit(5);

    // Get high-confidence recommendations
    const topRecommendations = await AIInsight.find({
      userId,
      confidence: { $gte: 0.8 },
      recommendations: { $exists: true, $ne: [] },
      isAcknowledged: false
    }).sort({ confidence: -1 }).limit(10);

    // Health score calculation (mock)
    const healthScore = Math.max(0, Math.min(100, 
      85 - (criticalInsights.length * 5) + (recentInsights.length * 2)
    ));

    // Trend analysis
    const insightsByDay = {};
    recentInsights.forEach(insight => {
      const day = insight.createdAt.toISOString().split('T')[0];
      if (!insightsByDay[day]) {
        insightsByDay[day] = 0;
      }
      insightsByDay[day]++;
    });

    res.json({
      healthScore,
      summary: {
        totalInsights: recentInsights.length,
        criticalAlerts: criticalInsights.length,
        unacknowledged: recentInsights.filter(i => !i.isAcknowledged).length,
        averageConfidence: recentInsights.reduce((sum, i) => sum + i.confidence, 0) / recentInsights.length || 0
      },
      criticalInsights,
      topRecommendations: topRecommendations.flatMap(insight => 
        insight.recommendations.map(rec => ({
          ...rec,
          insightTitle: insight.title,
          confidence: insight.confidence,
          insightId: insight._id
        }))
      ).slice(0, 5),
      trends: {
        insightsByDay,
        mostCommonType: recentInsights.length > 0 ? 
          recentInsights.reduce((acc, insight) => {
            acc[insight.insightType] = (acc[insight.insightType] || 0) + 1;
            return acc;
          }, {}) : {}
      },
      recentInsights: recentInsights.slice(0, 5)
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// DELETE /api/ai-insights/:id - Delete an insight
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const insight = await AIInsight.findByIdAndDelete(id);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({ message: 'Insight deleted successfully' });

  } catch (error) {
    console.error('Error deleting insight:', error);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

module.exports = router;
