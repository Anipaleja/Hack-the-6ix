const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const HealthData = require('../models/HealthData');
const HealthDataSyncService = require('../services/healthDataSyncService');
const auth = require('../middleware/auth');

// Initialize health data sync service
const healthDataSync = new HealthDataSyncService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/health-data');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `health-data-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/csv',
      'application/json',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, CSV, JSON, TXT'));
    }
  }
});

router.use(auth);

// Get user's health data summary
router.get('/summary', async (req, res) => {
  try {
    const { timeframe = '7' } = req.query;
    const summary = await healthDataSync.getHealthDataSummary(req.user.id, parseInt(timeframe));

    res.json({
      success: true,
      data: summary,
      timeframe: `${timeframe} days`
    });

  } catch (error) {
    console.error('Error fetching health data summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch health data summary' 
    });
  }
});

// Get specific health data type
router.get('/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      startDate, 
      endDate, 
      source 
    } = req.query;

    const filter = { 
      userId: req.user.id, 
      dataType 
    };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (source) {
      filter.source = source;
    }

    const healthData = await HealthData.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HealthData.countDocuments(filter);

    // Calculate basic statistics
    const stats = await HealthData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
          latest: { $last: '$value' },
          latestTimestamp: { $last: '$timestamp' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        healthData,
        statistics: stats[0] || null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch health data' 
    });
  }
});

// Add manual health data entry
router.post('/manual', async (req, res) => {
  try {
    const { dataType, value, unit, timestamp, notes } = req.body;

    if (!dataType || value === undefined || !unit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data type, value, and unit are required' 
      });
    }

    const healthData = new HealthData({
      userId: req.user.id,
      source: 'manual_entry',
      dataType,
      value: parseFloat(value),
      unit,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        notes: notes || '',
        entryMethod: 'manual'
      }
    });

    await healthData.save();

    // Emit real-time update
    req.io.to(req.user.id).emit('healthDataAdded', {
      dataType,
      value,
      unit,
      timestamp: healthData.timestamp
    });

    // Notify family if significant value
    if (await isSignificantHealthValue(dataType, value)) {
      await notifyFamilyOfHealthData(req.user.id, healthData);
    }

    res.status(201).json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('Error adding manual health data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add health data' 
    });
  }
});

// Sync health data from connected devices
router.post('/sync', async (req, res) => {
  try {
    const result = await healthDataSync.syncUserHealthData(req.user.id);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error syncing health data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync health data' 
    });
  }
});

// Upload health document/report
router.post('/upload', upload.single('healthDocument'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { category, description, date } = req.body;

    // Save file metadata to health data
    const healthData = new HealthData({
      userId: req.user.id,
      source: 'uploaded_document',
      dataType: 'medical_document',
      value: 1, // Indicates presence of document
      unit: 'document',
      timestamp: date ? new Date(date) : new Date(),
      metadata: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: category || 'general',
        description: description || '',
        filePath: req.file.path
      }
    });

    await healthData.save();

    // Process document for data extraction (if applicable)
    setImmediate(async () => {
      try {
        await processHealthDocument(healthData);
      } catch (error) {
        console.error('Error processing health document:', error);
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: healthData._id,
        filename: req.file.originalname,
        uploadedAt: healthData.timestamp,
        category: category || 'general'
      }
    });

  } catch (error) {
    console.error('Error uploading health document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload document' 
    });
  }
});

// Get health trends and analytics
router.get('/analytics/trends', async (req, res) => {
  try {
    const { dataType, period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (!dataType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data type is required' 
      });
    }

    // Get daily averages
    const trends = await HealthData.aggregate([
      {
        $match: {
          userId: req.user.id,
          dataType,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 },
          date: { $first: '$timestamp' }
        }
      },
      {
        $sort: { 'date': 1 }
      }
    ]);

    // Calculate trend direction
    const trendDirection = calculateTrendDirection(trends);

    res.json({
      success: true,
      data: {
        dataType,
        period: `${days} days`,
        trends,
        trendDirection,
        summary: {
          totalDataPoints: trends.reduce((sum, day) => sum + day.count, 0),
          daysWithData: trends.length,
          averageValue: trends.reduce((sum, day) => sum + day.avgValue, 0) / trends.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching health trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch health trends' 
    });
  }
});

// Set health data alerts/thresholds
router.post('/alerts', async (req, res) => {
  try {
    const { dataType, minThreshold, maxThreshold, enabled = true } = req.body;

    if (!dataType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data type is required' 
      });
    }

    const User = require('../models/User');
    const updateData = {};

    if (minThreshold !== undefined) {
      updateData[`healthAlerts.${dataType}.minThreshold`] = minThreshold;
    }
    if (maxThreshold !== undefined) {
      updateData[`healthAlerts.${dataType}.maxThreshold`] = maxThreshold;
    }
    updateData[`healthAlerts.${dataType}.enabled`] = enabled;
    updateData[`healthAlerts.${dataType}.updatedAt`] = new Date();

    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({
      success: true,
      message: 'Health alert settings updated'
    });

  } catch (error) {
    console.error('Error setting health alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to set health alerts' 
    });
  }
});

// Delete health data entry
router.delete('/:entryId', async (req, res) => {
  try {
    const entry = await HealthData.findOneAndDelete({
      _id: req.params.entryId,
      userId: req.user.id
    });

    if (!entry) {
      return res.status(404).json({ 
        success: false, 
        error: 'Health data entry not found' 
      });
    }

    // Delete associated file if it's an uploaded document
    if (entry.source === 'uploaded_document' && entry.metadata.filePath) {
      try {
        await fs.unlink(entry.metadata.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    res.json({
      success: true,
      message: 'Health data entry deleted'
    });

  } catch (error) {
    console.error('Error deleting health data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete health data' 
    });
  }
});

// Helper functions
async function isSignificantHealthValue(dataType, value) {
  // Define significance thresholds for different data types
  const significantThresholds = {
    'heart_rate': { min: 50, max: 120 },
    'blood_pressure_systolic': { min: 90, max: 140 },
    'blood_pressure_diastolic': { min: 60, max: 90 },
    'blood_glucose': { min: 70, max: 140 },
    'body_temperature': { min: 36, max: 38 },
    'oxygen_saturation': { min: 95, max: 100 }
  };

  const threshold = significantThresholds[dataType];
  if (!threshold) return false;

  return value < threshold.min || value > threshold.max;
}

async function notifyFamilyOfHealthData(userId, healthData) {
  try {
    const User = require('../models/User');
    const Family = require('../models/Family');
    const NotificationService = require('../services/notificationService');

    const user = await User.findById(userId).populate('familyId');
    if (!user.familyId) return;

    const family = await Family.findById(user.familyId).populate('members.user');
    const notificationService = new NotificationService();

    for (const member of family.members) {
      if (member.permissions.receiveHealthAlerts && 
          member.user._id.toString() !== userId.toString()) {
        
        const notificationData = {
          title: 'Health Alert',
          body: `${user.firstName} recorded a significant ${healthData.dataType} reading`,
          data: {
            type: 'health_alert',
            dataType: healthData.dataType,
            value: healthData.value,
            patientId: userId.toString()
          },
          priority: 'high'
        };

        await notificationService.sendToUser(member.user._id, notificationData);
      }
    }

  } catch (error) {
    console.error('Error notifying family of health data:', error);
  }
}

async function processHealthDocument(healthData) {
  // This would integrate with OCR/document processing services
  // to extract structured data from uploaded health documents
  console.log(`Processing health document: ${healthData.metadata.originalName}`);
  
  // Placeholder for document processing logic
  // Could integrate with services like Google Cloud Vision API, 
  // AWS Textract, or Azure Form Recognizer
}

function calculateTrendDirection(trends) {
  if (trends.length < 2) return 'insufficient_data';
  
  const recent = trends.slice(-7); // Last 7 data points
  const older = trends.slice(-14, -7); // Previous 7 data points
  
  if (recent.length === 0 || older.length === 0) return 'insufficient_data';
  
  const recentAvg = recent.reduce((sum, point) => sum + point.avgValue, 0) / recent.length;
  const olderAvg = older.reduce((sum, point) => sum + point.avgValue, 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (Math.abs(change) < 5) return 'stable';
  return change > 0 ? 'increasing' : 'decreasing';
}

module.exports = router;
