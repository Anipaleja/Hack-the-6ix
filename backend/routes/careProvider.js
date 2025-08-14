const express = require('express');
const { authenticateToken } = require('./auth');
const CareProvider = require('../models/CareProvider');
const CareChecklist = require('../models/CareChecklist');
const router = express.Router();

// Get all care providers for authenticated user
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    // Temporary: return sample data while database has connection issues
    const sampleProviders = [
      {
        _id: '1',
        name: 'Dr. Sarah Johnson',
        specialty: 'Primary Care Physician',
        phone: '(555) 123-4567',
        email: 'sjohnson@healthcenter.com',
        address: '123 Medical Blvd, Suite 100',
        notes: 'Regular checkups and general health management',
        patient: req.user.userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        name: 'Dr. Michael Chen',
        specialty: 'Cardiologist',
        phone: '(555) 987-6543',
        email: 'mchen@heartcenter.com',
        address: '456 Heart Ave, Floor 3',
        notes: 'Heart condition monitoring',
        patient: req.user.userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: sampleProviders
    });

    /* Database version - uncomment when DB connection is stable
    const providers = await CareProvider.find({ 
      patient: req.user.userId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: providers
    });
    */
  } catch (error) {
    console.error('Error fetching care providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch care providers'
    });
  }
});

// Add new care provider
router.post('/providers', authenticateToken, async (req, res) => {
  try {
    const { name, specialty, phone, email, address, notes } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'Provider name and specialty are required'
      });
    }

    const provider = new CareProvider({
      patient: req.user.userId,
      name,
      specialty,
      phone,
      email,
      address,
      notes
    });

    await provider.save();

    res.status(201).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error creating care provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create care provider'
    });
  }
});

// Update care provider
router.put('/providers/:id', authenticateToken, async (req, res) => {
  try {
    const { name, specialty, phone, email, address, notes } = req.body;

    const provider = await CareProvider.findOneAndUpdate(
      { _id: req.params.id, patient: req.user.userId },
      { name, specialty, phone, email, address, notes },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Care provider not found'
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error updating care provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update care provider'
    });
  }
});

// Delete care provider (soft delete)
router.delete('/providers/:id', authenticateToken, async (req, res) => {
  try {
    const provider = await CareProvider.findOneAndUpdate(
      { _id: req.params.id, patient: req.user.userId },
      { isActive: false },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Care provider not found'
      });
    }

    res.json({
      success: true,
      message: 'Care provider deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting care provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete care provider'
    });
  }
});

// Get all checklist items for authenticated user
router.get('/checklist', authenticateToken, async (req, res) => {
  try {
    // Temporary: return sample data while database has connection issues
    const sampleChecklist = [
      {
        _id: '1',
        task: 'Blood pressure medication review',
        providerName: 'Dr. Sarah Johnson',
        priority: 'high',
        completed: false,
        dueDate: '2025-08-20',
        notes: 'Check for side effects and adjust dosage if needed',
        patient: req.user.userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        task: 'Schedule annual physical exam',
        providerName: 'Dr. Sarah Johnson',
        priority: 'medium',
        completed: true,
        dueDate: '2025-08-15',
        notes: 'Completed - next appointment scheduled',
        patient: req.user.userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        task: 'Cardiology follow-up appointment',
        providerName: 'Dr. Michael Chen',
        priority: 'high',
        completed: false,
        dueDate: '2025-08-25',
        notes: 'Discuss EKG results',
        patient: req.user.userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: sampleChecklist
    });

    /* Database version - uncomment when DB connection is stable
    const checklist = await CareChecklist.find({ 
      patient: req.user.userId, 
      isActive: true 
    })
    .populate('providerId', 'name specialty')
    .sort({ dueDate: 1, priority: -1 });

    res.json({
      success: true,
      data: checklist
    });
    */
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist'
    });
  }
});

// Add new checklist item
router.post('/checklist', authenticateToken, async (req, res) => {
  try {
    const { task, providerName, providerId, priority, dueDate, notes } = req.body;

    if (!task || !providerName) {
      return res.status(400).json({
        success: false,
        message: 'Task and provider name are required'
      });
    }

    const checklistItem = new CareChecklist({
      patient: req.user.userId,
      task,
      providerName,
      providerId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes
    });

    await checklistItem.save();

    // Populate provider info if providerId exists
    await checklistItem.populate('providerId', 'name specialty');

    res.status(201).json({
      success: true,
      data: checklistItem
    });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checklist item'
    });
  }
});

// Update checklist item (mark as completed/uncompleted or edit details)
router.put('/checklist/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // If marking as completed, set completedAt timestamp
    if (updateData.completed === true) {
      updateData.completedAt = new Date();
    } else if (updateData.completed === false) {
      updateData.completedAt = undefined;
    }

    const checklistItem = await CareChecklist.findOneAndUpdate(
      { _id: req.params.id, patient: req.user.userId },
      updateData,
      { new: true, runValidators: true }
    ).populate('providerId', 'name specialty');

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    res.json({
      success: true,
      data: checklistItem
    });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist item'
    });
  }
});

// Delete checklist item (soft delete)
router.delete('/checklist/:id', authenticateToken, async (req, res) => {
  try {
    const checklistItem = await CareChecklist.findOneAndUpdate(
      { _id: req.params.id, patient: req.user.userId },
      { isActive: false },
      { new: true }
    );

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    res.json({
      success: true,
      message: 'Checklist item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete checklist item'
    });
  }
});

// Get care statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [providers, checklist] = await Promise.all([
      CareProvider.countDocuments({ patient: req.user.userId, isActive: true }),
      CareChecklist.find({ patient: req.user.userId, isActive: true })
    ]);

    const completedTasks = checklist.filter(item => item.completed).length;
    const totalTasks = checklist.length;
    const overdueTasks = checklist.filter(item => 
      !item.completed && item.dueDate && new Date(item.dueDate) < new Date()
    ).length;

    res.json({
      success: true,
      data: {
        totalProviders: providers,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching care stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch care statistics'
    });
  }
});

module.exports = router;
