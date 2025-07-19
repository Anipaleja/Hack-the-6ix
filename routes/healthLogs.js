const express = require('express');
const router = express.Router();
const HealthLog = require('../models/HealthLog');
const User = require('../models/User');
const TranscriptionAnalyzer = require('../utils/transcriptionAnalyzer');

// Initialize transcription analyzer
const analyzer = new TranscriptionAnalyzer();

// GET all health logs for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    const query = { userId };
    
    // Add date filtering if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const healthLogs = await HealthLog.find(query)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await HealthLog.countDocuments(query);
    
    res.json({
      healthLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health logs', message: error.message });
  }
});

// GET single health log by ID
router.get('/:id', async (req, res) => {
  try {
    const healthLog = await HealthLog.findById(req.params.id)
      .populate('userId', 'name email');
    
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }
    
    res.json(healthLog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health log', message: error.message });
  }
});

// POST create new health log with automatic transcription analysis
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      transcription,
      audioFile,
      deviceId,
      metadata,
      healthData
    } = req.body;
    
    // Validate required fields
    if (!userId || !transcription) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'transcription'] 
      });
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Analyze transcription for keywords and medical entities
    const analysis = analyzer.analyze(transcription);
    
    // Merge analyzed data with any provided healthData
    const processedHealthData = {
      symptoms: analysis.symptoms,
      severity: analysis.severity,
      mood: analysis.mood,
      tags: analysis.tags,
      detectedKeywords: analysis.detectedKeywords,
      medicalEntities: analysis.medicalEntities,
      timeContext: analysis.timeContext,
      // Override with any manually provided data
      ...healthData
    };
    
    const healthLog = new HealthLog({
      userId,
      transcription,
      audioFile,
      deviceId,
      metadata: metadata || {},
      healthData: processedHealthData,
      processed: true, // Mark as processed since we analyzed it
      processedAt: new Date()
    });
    
    await healthLog.save();
    await healthLog.populate('userId', 'name email');
    
    res.status(201).json({
      message: 'Health log created and analyzed successfully',
      healthLog,
      analysis: {
        keywordsDetected: analysis.detectedKeywords.length,
        medicalEntitiesFound: analysis.medicalEntities.length,
        symptomsIdentified: analysis.symptoms.length,
        severityDetected: analysis.severity,
        moodDetected: analysis.mood,
        processingComplete: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health log', message: error.message });
  }
});

// PUT update health log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const healthLog = await HealthLog.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');
    
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }
    
    res.json({
      message: 'Health log updated successfully',
      healthLog
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update health log', message: error.message });
  }
});

// DELETE health log
router.delete('/:id', async (req, res) => {
  try {
    const healthLog = await HealthLog.findByIdAndDelete(req.params.id);
    
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }
    
    res.json({ message: 'Health log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete health log', message: error.message });
  }
});

// POST analyze transcription without saving (for testing)
router.post('/analyze', async (req, res) => {
  try {
    const { transcription } = req.body;
    
    if (!transcription) {
      return res.status(400).json({ error: 'Transcription text is required' });
    }
    
    const analysis = analyzer.analyze(transcription);
    
    res.json({
      message: 'Transcription analyzed successfully',
      originalText: transcription,
      analysis: {
        symptoms: analysis.symptoms,
        severity: analysis.severity,
        mood: analysis.mood,
        detectedKeywords: analysis.detectedKeywords,
        medicalEntities: analysis.medicalEntities,
        timeContext: analysis.timeContext,
        suggestedTags: analysis.tags
      },
      summary: {
        keywordsFound: analysis.detectedKeywords.length,
        medicalEntitiesFound: analysis.medicalEntities.length,
        symptomsIdentified: analysis.symptoms.length,
        confidenceScore: analysis.detectedKeywords.length > 0 ? 
          analysis.detectedKeywords.reduce((sum, kw) => sum + kw.confidence, 0) / analysis.detectedKeywords.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze transcription', message: error.message });
  }
});

// POST process transcription (for AI analysis)
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { healthData } = req.body;
    
    const healthLog = await HealthLog.findByIdAndUpdate(
      id,
      {
        healthData: { ...healthData },
        processed: true,
        processedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name email');
    
    if (!healthLog) {
      return res.status(404).json({ error: 'Health log not found' });
    }
    
    res.json({
      message: 'Health log processed successfully',
      healthLog
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process health log', message: error.message });
  }
});

// GET health analytics for user
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const logs = await HealthLog.find({
      userId,
      timestamp: { $gte: startDate },
      processed: true
    });
    
    // Basic analytics
    const analytics = {
      totalLogs: logs.length,
      averageMood: logs.filter(log => log.healthData.mood).length > 0 
        ? logs.reduce((sum, log) => {
            const moodScore = { terrible: 1, poor: 2, fair: 3, good: 4, excellent: 5 }[log.healthData.mood] || 0;
            return sum + moodScore;
          }, 0) / logs.filter(log => log.healthData.mood).length
        : null,
      commonSymptoms: {},
      moodTrends: []
    };
    
    // Count symptoms
    logs.forEach(log => {
      if (log.healthData.symptoms) {
        log.healthData.symptoms.forEach(symptom => {
          analytics.commonSymptoms[symptom] = (analytics.commonSymptoms[symptom] || 0) + 1;
        });
      }
    });
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate analytics', message: error.message });
  }
});

module.exports = router;
