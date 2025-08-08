const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const auth = require('../middleware/auth');

// Initialize notification service
let notificationService;

router.use(auth);
router.use((req, res, next) => {
  if (!notificationService) {
    notificationService = new NotificationService(req.io);
  }
  next();
});

// Register device token for push notifications
router.post('/register-token', async (req, res) => {
  try {
    const { token, type, platform } = req.body;

    if (!token || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token and type are required' 
      });
    }

    // Validate token type
    const validTypes = ['firebase', 'apns', 'webPush'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid token type. Must be: firebase, apns, or webPush' 
      });
    }

    await notificationService.registerDeviceToken(req.user.id, type, token);

    res.json({
      success: true,
      message: 'Device token registered successfully'
    });

  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register device token' 
    });
  }
});

// Send test notification
router.post('/test', async (req, res) => {
  try {
    const { testType = 'basic' } = req.body;

    const result = await notificationService.testNotification(req.user.id, testType);

    res.json({
      success: true,
      message: 'Test notification sent',
      data: result
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test notification' 
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const { 
      medicationReminders = true,
      healthAlerts = true,
      familyNotifications = true,
      emergencyAlerts = true,
      quietHours = { enabled: false, start: '22:00', end: '08:00' },
      soundEnabled = true,
      vibrationEnabled = true
    } = req.body;

    const User = require('../models/User');
    
    const updateData = {
      'notificationSettings.medicationReminders': medicationReminders,
      'notificationSettings.healthAlerts': healthAlerts,
      'notificationSettings.familyNotifications': familyNotifications,
      'notificationSettings.emergencyAlerts': emergencyAlerts,
      'notificationSettings.quietHours': quietHours,
      'notificationSettings.soundEnabled': soundEnabled,
      'notificationSettings.vibrationEnabled': vibrationEnabled,
      'notificationSettings.updatedAt': new Date()
    };

    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notification preferences' 
    });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('notificationSettings');

    res.json({
      success: true,
      data: user.notificationSettings || {
        medicationReminders: true,
        healthAlerts: true,
        familyNotifications: true,
        emergencyAlerts: true,
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        soundEnabled: true,
        vibrationEnabled: true
      }
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification preferences' 
    });
  }
});

// Get notification history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    // This would require implementing a notification history collection
    // For now, we'll return a mock response
    const notifications = [
      {
        id: '1',
        type: 'medication_reminder',
        title: 'Medication Reminder',
        body: 'Time to take your Lisinopril',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'delivered'
      },
      {
        id: '2',
        type: 'health_alert',
        title: 'Health Alert',
        body: 'Blood pressure reading is above normal range',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'delivered'
      }
    ];

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: notifications.length,
          pages: Math.ceil(notifications.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification history' 
    });
  }
});

// Schedule a notification
router.post('/schedule', async (req, res) => {
  try {
    const { title, body, scheduledFor, type = 'general', data = {} } = req.body;

    if (!title || !body || !scheduledFor) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, body, and scheduledFor are required' 
      });
    }

    const scheduleTime = new Date(scheduledFor);
    if (scheduleTime <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Scheduled time must be in the future' 
      });
    }

    const notificationData = {
      title,
      body,
      data: { type, ...data }
    };

    const result = await notificationService.scheduleNotification(
      req.user.id, 
      notificationData, 
      scheduleTime
    );

    res.json({
      success: true,
      message: 'Notification scheduled successfully',
      data: result
    });

  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to schedule notification' 
    });
  }
});

// Send emergency alert to family
router.post('/emergency', async (req, res) => {
  try {
    const { message, location, severity = 'high' } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Emergency message is required' 
      });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user.familyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'No family group found' 
      });
    }

    const alertData = {
      message,
      patientId: req.user.id,
      patientName: `${user.firstName} ${user.lastName}`,
      location,
      severity,
      timestamp: new Date(),
      data: {
        emergencyType: 'manual',
        reportedBy: req.user.id
      }
    };

    const result = await notificationService.sendEmergencyAlert(user.familyId, alertData);

    res.json({
      success: true,
      message: 'Emergency alert sent to family members',
      data: result
    });

  } catch (error) {
    console.error('Error sending emergency alert:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send emergency alert' 
    });
  }
});

// Mark notification as read
router.post('/:notificationId/read', async (req, res) => {
  try {
    // This would update the notification status in the database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notification as read' 
    });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    
    // Mock statistics - in a real app, this would query the notification history
    const stats = {
      totalSent: 45,
      delivered: 43,
      failed: 2,
      byType: {
        medication_reminder: 30,
        health_alert: 8,
        family_notification: 5,
        emergency: 2
      },
      deliveryRate: 95.6,
      timeframe: `${timeframe} days`
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification statistics' 
    });
  }
});

// Unregister device token
router.delete('/unregister-token', async (req, res) => {
  try {
    const { token, type } = req.body;

    if (!token || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token and type are required' 
      });
    }

    await notificationService.removeInvalidTokens(req.user.id, type, [token]);

    res.json({
      success: true,
      message: 'Device token unregistered successfully'
    });

  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unregister device token' 
    });
  }
});

module.exports = router;
