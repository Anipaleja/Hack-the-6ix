class AdvancedHealthAI {
  constructor() {
    this.anomalyThresholds = {
      heart_rate: { min: 50, max: 120, criticalMin: 40, criticalMax: 150 },
      blood_pressure: { 
        systolic: { min: 90, max: 140, criticalMin: 80, criticalMax: 180 },
        diastolic: { min: 60, max: 90, criticalMin: 50, criticalMax: 120 }
      },
      temperature: { min: 97.0, max: 99.5, criticalMin: 95.0, criticalMax: 103.0 },
      oxygen_saturation: { min: 95, max: 100, criticalMin: 90, criticalMax: 100 }
    };

    this.correlationFactors = [
      'sleep_quality', 'stress_level', 'activity_level', 'medication_adherence',
      'weather', 'diet', 'hydration', 'social_interaction'
    ];
  }

  // Advanced anomaly detection using statistical methods
  detectAnomalies(data, historicalData) {
    const anomalies = [];
    
    // Z-score based anomaly detection
    const mean = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = Math.abs((data.value - mean) / stdDev);
    
    if (zScore > 2.5) {
      anomalies.push({
        type: 'statistical_outlier',
        severity: zScore > 3.5 ? 'high' : 'medium',
        description: `${data.dataType} value deviates significantly from normal pattern`,
        zScore: zScore,
        confidence: Math.min(0.95, zScore / 4)
      });
    }

    // Threshold-based anomaly detection
    const thresholds = this.anomalyThresholds[data.dataType];
    if (thresholds) {
      if (data.value < thresholds.criticalMin || data.value > thresholds.criticalMax) {
        anomalies.push({
          type: 'critical_threshold',
          severity: 'critical',
          description: `${data.dataType} is in critical range`,
          confidence: 0.9
        });
      } else if (data.value < thresholds.min || data.value > thresholds.max) {
        anomalies.push({
          type: 'abnormal_threshold',
          severity: 'medium',
          description: `${data.dataType} is outside normal range`,
          confidence: 0.8
        });
      }
    }

    return anomalies;
  }

  // Predictive health modeling
  predictHealthTrends(userId, timeframe = '7d') {
    const predictions = {
      riskFactors: [],
      improvements: [],
      deteriorations: [],
      recommendations: []
    };

    // Mock advanced ML predictions (in real implementation, this would call ML models)
    const riskScore = Math.random();
    
    if (riskScore > 0.7) {
      predictions.riskFactors.push({
        factor: 'cardiovascular_risk',
        likelihood: riskScore,
        timeframe: timeframe,
        recommendation: 'Increase cardiovascular monitoring frequency'
      });
    }

    predictions.recommendations.push({
      category: 'lifestyle',
      action: 'Maintain regular sleep schedule based on detected patterns',
      priority: 'medium',
      confidence: 0.85
    });

    return predictions;
  }

  // Symptom correlation analysis
  analyzeSymptomCorrelations(symptoms, biometricData, environmentalData) {
    const correlations = [];

    // Example: Sleep quality vs stress level correlation
    const sleepData = biometricData.filter(d => d.dataType === 'sleep_quality');
    const stressData = biometricData.filter(d => d.dataType === 'stress_level');

    if (sleepData.length > 5 && stressData.length > 5) {
      // Calculate Pearson correlation coefficient
      const correlation = this.calculatePearsonCorrelation(sleepData, stressData);
      
      if (Math.abs(correlation) > 0.5) {
        correlations.push({
          factors: ['sleep_quality', 'stress_level'],
          correlation: correlation,
          significance: Math.abs(correlation) > 0.7 ? 'high' : 'medium',
          insight: correlation < 0 ? 'Poor sleep quality correlates with higher stress levels' : 'Good sleep quality correlates with lower stress levels'
        });
      }
    }

    return correlations;
  }

  // Voice pattern analysis for emotional and health state detection
  analyzeVoicePatterns(audioMetadata, transcription) {
    const analysis = {
      emotionalState: 'neutral',
      stressIndicators: [],
      healthIndicators: [],
      confidence: 0.7
    };

    // Voice frequency analysis (mock)
    if (audioMetadata.avgFrequency) {
      if (audioMetadata.avgFrequency < 120) {
        analysis.emotionalState = 'sad';
        analysis.healthIndicators.push('potential_depression_marker');
      } else if (audioMetadata.avgFrequency > 200) {
        analysis.emotionalState = 'anxious';
        analysis.stressIndicators.push('elevated_vocal_stress');
      }
    }

    // Speech pattern analysis
    const words = transcription.toLowerCase().split(' ');
    const stressWords = ['tired', 'exhausted', 'overwhelmed', 'anxious', 'worried'];
    const painWords = ['hurt', 'pain', 'ache', 'sore', 'uncomfortable'];

    const stressCount = words.filter(word => stressWords.includes(word)).length;
    const painCount = words.filter(word => painWords.includes(word)).length;

    if (stressCount > 2) {
      analysis.stressIndicators.push('verbal_stress_expressions');
    }
    if (painCount > 1) {
      analysis.healthIndicators.push('pain_expressions');
    }

    return analysis;
  }

  // Generate personalized health insights
  generatePersonalizedInsights(userId, healthData, biometricData, userProfile) {
    const insights = [];

    // Trend analysis
    const recentData = healthData.slice(-30); // Last 30 entries
    if (recentData.length > 10) {
      const trendAnalysis = this.analyzeTrends(recentData);
      
      insights.push({
        type: 'health_trend',
        title: 'Health Trend Analysis',
        description: `Your overall health trend is ${trendAnalysis.direction}`,
        confidence: trendAnalysis.confidence,
        severity: trendAnalysis.direction === 'declining' ? 'medium' : 'low',
        recommendations: trendAnalysis.recommendations
      });
    }

    // Medication effectiveness analysis
    const medicationLogs = healthData.filter(log => 
      log.detectedKeywords.categories.includes('medications')
    );

    if (medicationLogs.length > 5) {
      insights.push({
        type: 'medication_effectiveness',
        title: 'Medication Effectiveness Analysis',
        description: 'Analysis of medication impact on symptoms',
        confidence: 0.8,
        severity: 'low',
        recommendations: [{
          action: 'Continue current medication regimen',
          priority: 'medium',
          category: 'medication'
        }]
      });
    }

    return insights;
  }

  // Helper method for Pearson correlation
  calculatePearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xValues = x.slice(0, n).map(d => d.value);
    const yValues = y.slice(0, n).map(d => d.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = yValues.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Trend analysis helper
  analyzeTrends(data) {
    if (data.length < 5) return { direction: 'insufficient_data', confidence: 0 };

    // Simple linear regression for trend
    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => d.healthData.severity || 5);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    const direction = slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable';
    const confidence = Math.min(0.95, Math.abs(slope) * 2);

    const recommendations = [];
    if (direction === 'declining') {
      recommendations.push({
        action: 'Schedule consultation with healthcare provider',
        priority: 'high',
        category: 'medical'
      });
    }

    return { direction, confidence, recommendations };
  }
}

module.exports = AdvancedHealthAI;
