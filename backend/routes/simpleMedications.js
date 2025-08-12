const express = require('express');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all medications for user/family - simplified version
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Return empty medications array for now
    res.json({
      medications: [],
      totalPages: 0,
      currentPage: 1,
      total: 0
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ message: 'Failed to fetch medications' });
  }
});

// Get upcoming medication alarms - simplified version
router.get('/upcoming-alarms', authenticateToken, async (req, res) => {
  try {
    res.json({
      alarms: [],
      count: 0
    });
  } catch (error) {
    console.error('Get upcoming alarms error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming alarms' });
  }
});

// Get adherence summary - simplified version
router.get('/adherence-summary', authenticateToken, async (req, res) => {
  try {
    res.json({
      totalMedications: 0,
      adherenceRate: 0,
      missedDoses: 0,
      completedDoses: 0,
      overdueDoses: 0
    });
  } catch (error) {
    console.error('Get adherence summary error:', error);
    res.status(500).json({ message: 'Failed to fetch adherence summary' });
  }
});

// Add new medication - simplified version
router.post('/', authenticateToken, async (req, res) => {
  try {
    // For now, just return success without actually creating
    res.status(201).json({
      message: 'Medication added successfully (demo mode)',
      medication: {
        _id: 'demo-' + Date.now(),
        name: req.body.name || 'Demo Medication',
        dosage: req.body.dosage || '10mg',
        frequency: req.body.frequency || 'daily',
        instructions: req.body.instructions || 'Take as prescribed',
        isActive: true,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ message: 'Failed to add medication' });
  }
});

// Take medication dose - simplified version
router.put('/:id/take', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Medication dose recorded successfully (demo mode)',
      nextDose: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
  } catch (error) {
    console.error('Take medication error:', error);
    res.status(500).json({ message: 'Failed to record medication dose' });
  }
});

module.exports = router;
