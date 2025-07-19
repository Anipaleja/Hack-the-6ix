const express = require('express');
const router = express.Router();
const HealthLog = require('../models/HealthLog');
const User = require('../models/User');

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

// POST create new health log
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
    
    const healthLog = new HealthLog({
      userId,
      transcription,
      audioFile,
      deviceId,
      metadata: metadata || {},
      healthData: healthData || {}
    });
    
    await healthLog.save();
    await healthLog.populate('userId', 'name email');
    
    res.status(201).json({
      message: 'Health log created successfully',
      healthLog
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
