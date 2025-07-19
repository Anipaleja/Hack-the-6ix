const express = require('express');
const router = express.Router();
const HealthTimer = require('../models/HealthTimer');
const User = require('../models/User');

// GET all timers for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, active_only } = req.query;
    
    const query = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (active_only === 'true') {
      query.status = 'active';
      query.scheduledTime = { $gte: new Date() };
    }
    
    const timers = await HealthTimer.find(query)
      .populate('userId', 'name email')
      .sort({ scheduledTime: 1 });
    
    res.json({
      timers,
      total: timers.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health timers', message: error.message });
  }
});

// GET single timer by ID
router.get('/:id', async (req, res) => {
  try {
    const timer = await HealthTimer.findById(req.params.id)
      .populate('userId', 'name email');
    
    if (!timer) {
      return res.status(404).json({ error: 'Health timer not found' });
    }
    
    res.json({
      timer,
      isExpired: timer.isExpired(),
      timeRemaining: timer.getTimeRemaining()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health timer', message: error.message });
  }
});

// POST create new health timer (for VA intent: check_in_timer/create)
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      name,
      duration, // in minutes
      scheduledTime, // ISO string or relative like "+2 hours"
      timerType,
      deviceId,
      notificationSettings
    } = req.body;
    
    if (!userId || !name || !duration) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'name', 'duration']
      });
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse scheduled time
    let parsedScheduledTime;
    if (scheduledTime) {
      if (scheduledTime.startsWith('+')) {
        // Relative time like "+2 hours", "+30 minutes"
        const now = new Date();
        const match = scheduledTime.match(/\+(\d+)\s*(minute|minutes|hour|hours|min|hr)/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const multiplier = unit.includes('hour') || unit.includes('hr') ? 60 : 1;
          parsedScheduledTime = new Date(now.getTime() + (amount * multiplier * 60000));
        } else {
          return res.status(400).json({ error: 'Invalid relative time format. Use "+X minutes" or "+X hours"' });
        }
      } else {
        parsedScheduledTime = new Date(scheduledTime);
      }
    } else {
      // Default: schedule for now + duration
      parsedScheduledTime = new Date(Date.now() + (duration * 60000));
    }
    
    if (isNaN(parsedScheduledTime.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled time' });
    }
    
    const timer = new HealthTimer({
      userId,
      name,
      duration,
      scheduledTime: parsedScheduledTime,
      timerType: timerType || 'check_in',
      deviceId,
      notificationSettings: notificationSettings || {
        sendEmergencyAlert: true,
        alertDelayMinutes: 5,
        emergencyContactIds: []
      }
    });
    
    await timer.save();
    await timer.populate('userId', 'name email');
    
    res.status(201).json({
      message: 'Health timer created successfully',
      timer,
      scheduledFor: parsedScheduledTime.toISOString(),
      timeUntilTrigger: timer.getTimeRemaining()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health timer', message: error.message });
  }
});

// PUT complete/stop timer (for VA intent: check_in_timer/stop)
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const timer = await HealthTimer.findById(id);
    if (!timer) {
      return res.status(404).json({ error: 'Health timer not found' });
    }
    
    if (timer.status !== 'active') {
      return res.status(400).json({ 
        error: 'Timer is not active', 
        currentStatus: timer.status 
      });
    }
    
    timer.status = 'completed';
    timer.completedAt = new Date();
    if (notes) timer.notes = notes;
    
    await timer.save();
    await timer.populate('userId', 'name email');
    
    res.json({
      message: 'Health timer completed successfully',
      timer,
      completedAt: timer.completedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete health timer', message: error.message });
  }
});

// PUT cancel timer
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const timer = await HealthTimer.findById(id);
    if (!timer) {
      return res.status(404).json({ error: 'Health timer not found' });
    }
    
    if (timer.status !== 'active') {
      return res.status(400).json({ 
        error: 'Timer is not active', 
        currentStatus: timer.status 
      });
    }
    
    timer.status = 'cancelled';
    timer.cancelledAt = new Date();
    if (reason) timer.notes = reason;
    
    await timer.save();
    
    res.json({
      message: 'Health timer cancelled successfully',
      timer,
      cancelledAt: timer.cancelledAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel health timer', message: error.message });
  }
});

// GET expired timers (for monitoring/alert system)
router.get('/system/expired', async (req, res) => {
  try {
    const now = new Date();
    
    const expiredTimers = await HealthTimer.find({
      status: 'active',
      scheduledTime: { $lt: now }
    })
    .populate('userId', 'name email emergencyContacts')
    .sort({ scheduledTime: 1 });
    
    // Update expired timers
    for (let timer of expiredTimers) {
      timer.status = 'expired';
      await timer.save();
    }
    
    res.json({
      expiredTimers,
      total: expiredTimers.length,
      message: `Found ${expiredTimers.length} expired timers`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expired timers', message: error.message });
  }
});

// DELETE health timer
router.delete('/:id', async (req, res) => {
  try {
    const timer = await HealthTimer.findByIdAndDelete(req.params.id);
    
    if (!timer) {
      return res.status(404).json({ error: 'Health timer not found' });
    }
    
    res.json({ 
      message: 'Health timer deleted successfully',
      deletedTimer: {
        name: timer.name,
        scheduledTime: timer.scheduledTime,
        status: timer.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete health timer', message: error.message });
  }
});

module.exports = router;
