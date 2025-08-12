const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const Medication = require('../models/Medication');
const Family = require('../models/Family');
const MedicationAlarm = require('../models/MedicationAlarm');

const router = express.Router();

console.log('🚀 MEDICATIONS ROUTE FILE LOADED - VERSION 2');

// Simple test route
router.get('/test', (req, res) => {
  console.log('🔍 TEST: Simple test route called');
  res.json({ message: 'Test route working' });
});

// Get all medications for user/family
router.get('/', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: GET /api/medications called');
  console.log('🔍 DEBUG: User ID:', req.user?.userId);
  console.log('🔍 DEBUG: Family ID:', req.user?.familyId);
  
  try {
    // Simple test first - just return empty array
    res.json({
      medications: [],
      totalPages: 0,
      currentPage: 1,
      total: 0
    });
    return;
    const { patientId } = req.query;
    
    let query = {};
    
    if (patientId && req.user.familyId) {
      // Check if user has permission to view this patient's medications
      const family = await Family.findById(req.user.familyId);
      if (family && family.isMember(req.user._id)) {
        const permissions = family.getMemberPermissions(req.user._id);
        if (permissions && permissions.viewMedications) {
          query.patient = patientId;
          query.familyId = req.user.familyId;
        } else {
          return res.status(403).json({ message: 'No permission to view medications' });
        }
      } else {
        return res.status(403).json({ message: 'Not a family member' });
      }
    } else {
      // Get user's own medications or family medications
      if (req.user.familyId) {
        query.familyId = req.user.familyId;
      } else {
        query.patient = req.user._id;
      }
    }

    const medications = await Medication.find({ ...query, isActive: true })
      .populate('patient', 'firstName lastName')
      .populate('prescribedBy.doctorId', 'firstName lastName')
      .populate('addedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    // Calculate next doses and adherence for each medication
    const medicationsWithStatus = medications.map(med => {
      const nextDose = med.getNextDoseTime();
      const isDue = med.isDoseDue(10); // 10 minute tolerance
      const needsRefill = med.needsRefill();
      
      return {
        ...med.toJSON(),
        nextDose,
        isDue,
        needsRefill,
        adherenceRate: med.adherence.adherenceRate
      };
    });

    res.json({
      medications: medicationsWithStatus,
      totalActive: medications.length,
      dueNow: medicationsWithStatus.filter(m => m.isDue).length,
      needRefill: medicationsWithStatus.filter(m => m.needsRefill).length
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ message: 'Failed to fetch medications' });
  }
});

// Simple POST route for testing
router.post('/simple', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: POST /api/medications/simple called');
  console.log('🔍 DEBUG: User ID:', req.user?.userId);
  console.log('🔍 DEBUG: Request body:', req.body);
  
  try {
    // Simple success response for now
    res.status(201).json({
      message: 'Medication added successfully',
      medication: {
        _id: 'test-' + Date.now(),
        name: req.body.name || req.body.commonName || 'Test Medication',
        dosage: req.body.dosage || 'Test dosage',
        frequency: req.body.frequency || req.body.schedule?.frequency || 'daily',
        instructions: req.body.instructions || 'Test instructions',
        isActive: true,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ message: 'Failed to add medication' });
  }
});

// Add new medication
router.post('/', authenticateToken, [
  body('scientificName').trim().isLength({ min: 1 }),
  body('commonName').trim().isLength({ min: 1 }),
  body('dosage.amount').isNumeric(),
  body('dosage.unit').isIn(['mg', 'g', 'ml', 'tablets', 'capsules', 'drops', 'puffs']),
  body('schedule.frequency').isIn(['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed', 'custom']),
  body('schedule.startDate').isISO8601(),
  body('patient').isMongoId()
], async (req, res) => {
  console.log('=== MEDICATIONS POST ROUTE CALLED ===');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicationData = req.body;
    
    // Verify permission to add medication for this patient
    if (medicationData.patient !== req.user._id.toString()) {
      if (!req.user.familyId) {
        return res.status(403).json({ message: 'Cannot add medication for other users' });
      }
      
      const family = await Family.findById(req.user.familyId);
      const permissions = family.getMemberPermissions(req.user._id);
      
      if (!permissions || !permissions.manageMedications) {
        return res.status(403).json({ message: 'No permission to manage medications' });
      }
    }

    // Create medication
    const medication = new Medication({
      ...medicationData,
      familyId: req.user.familyId,
      addedBy: req.user._id
    });

    await medication.save();
    
    // Populate references
    await medication.populate('patient', 'firstName lastName');
    await medication.populate('addedBy', 'firstName lastName role');

    // Notify family members via socket
    const io = req.app.get('io');
    if (req.user.familyId) {
      io.to(`family_${req.user.familyId}`).emit('medicationAdded', {
        medication: medication.toJSON(),
        addedBy: req.user.toJSON()
      });
    }

    res.status(201).json({
      message: 'Medication added successfully',
      medication: medication.toJSON()
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ message: 'Failed to add medication' });
  }
});

// Update medication
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Check permissions
    if (medication.patient.toString() !== req.user._id.toString()) {
      if (!req.user.familyId || medication.familyId.toString() !== req.user.familyId.toString()) {
        return res.status(403).json({ message: 'No permission to update this medication' });
      }
      
      const family = await Family.findById(req.user.familyId);
      const permissions = family.getMemberPermissions(req.user._id);
      
      if (!permissions || !permissions.manageMedications) {
        return res.status(403).json({ message: 'No permission to manage medications' });
      }
    }

    // Update medication
    const allowedUpdates = [
      'scientificName', 'commonName', 'color', 'dosage', 'instructions', 
      'schedule', 'purpose', 'category', 'alarmSettings', 'inventory'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedMedication = await Medication.findByIdAndUpdate(
      req.params.id, 
      updates, 
      { new: true }
    ).populate('patient', 'firstName lastName')
     .populate('addedBy', 'firstName lastName role');

    // Notify family members
    const io = req.app.get('io');
    if (req.user.familyId) {
      io.to(`family_${req.user.familyId}`).emit('medicationUpdated', {
        medication: updatedMedication.toJSON(),
        updatedBy: req.user.toJSON()
      });
    }

    res.json({
      message: 'Medication updated successfully',
      medication: updatedMedication.toJSON()
    });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ message: 'Failed to update medication' });
  }
});

// Mark dose as taken
router.post('/:id/take-dose', authenticateToken, async (req, res) => {
  try {
    const { timestamp, notes } = req.body;
    
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Only patient can mark their own dose as taken
    if (medication.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patient can mark doses as taken' });
    }

    // Mark dose as taken
    await medication.markDoseTaken(timestamp ? new Date(timestamp) : new Date());

    // Add note if provided
    if (notes) {
      medication.notes.push({
        text: notes,
        addedBy: req.user._id,
        type: 'note'
      });
      await medication.save();
    }

    // Stop any active alarms for this medication
    await MedicationAlarm.updateMany(
      { 
        medication: medication._id,
        status: 'active'
      },
      { 
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user._id
      }
    );

    // Notify family members
    const io = req.app.get('io');
    if (req.user.familyId) {
      io.to(`family_${req.user.familyId}`).emit('doseTaken', {
        medication: medication.toJSON(),
        patient: req.user.toJSON(),
        timestamp: timestamp || new Date(),
        notes
      });
    }

    res.json({
      message: 'Dose marked as taken',
      medication: medication.toJSON(),
      adherenceRate: medication.adherence.adherenceRate
    });
  } catch (error) {
    console.error('Mark dose taken error:', error);
    res.status(500).json({ message: 'Failed to mark dose as taken' });
  }
});

// Skip/snooze dose
router.post('/:id/snooze-dose', authenticateToken, async (req, res) => {
  try {
    const { minutes = 15, reason } = req.body;
    
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Only patient can snooze their own medication
    if (medication.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patient can snooze doses' });
    }

    // Update active alarms to snooze
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    
    await MedicationAlarm.updateMany(
      { 
        medication: medication._id,
        status: 'active'
      },
      { 
        status: 'snoozed',
        snoozeUntil,
        snoozeReason: reason
      }
    );

    // Add note
    if (reason) {
      medication.notes.push({
        text: `Dose snoozed for ${minutes} minutes: ${reason}`,
        addedBy: req.user._id,
        type: 'note'
      });
      await medication.save();
    }

    // Notify family members
    const io = req.app.get('io');
    if (req.user.familyId) {
      io.to(`family_${req.user.familyId}`).emit('doseSnoozed', {
        medication: medication.toJSON(),
        patient: req.user.toJSON(),
        snoozeMinutes: minutes,
        reason,
        snoozeUntil
      });
    }

    res.json({
      message: `Dose snoozed for ${minutes} minutes`,
      snoozeUntil
    });
  } catch (error) {
    console.error('Snooze dose error:', error);
    res.status(500).json({ message: 'Failed to snooze dose' });
  }
});

// Get medication history/adherence
router.get('/:id/adherence', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Check permissions
    if (medication.patient.toString() !== req.user._id.toString()) {
      if (!req.user.familyId || medication.familyId.toString() !== req.user.familyId.toString()) {
        return res.status(403).json({ message: 'No permission to view this medication' });
      }
      
      const family = await Family.findById(req.user.familyId);
      const permissions = family.getMemberPermissions(req.user._id);
      
      if (!permissions || !permissions.viewMedications) {
        return res.status(403).json({ message: 'No permission to view medications' });
      }
    }

    // Get alarm history for adherence calculation
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const alarms = await MedicationAlarm.find({
      medication: medication._id,
      scheduledTime: { $gte: startDate }
    }).sort({ scheduledTime: -1 });

    const adherenceData = {
      medication: medication.toJSON(),
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      },
      summary: {
        totalDoses: alarms.length,
        takenDoses: alarms.filter(a => a.status === 'acknowledged').length,
        missedDoses: alarms.filter(a => a.status === 'missed').length,
        snoozedDoses: alarms.filter(a => a.status === 'snoozed').length,
        adherenceRate: medication.adherence.adherenceRate
      },
      dailyAdherence: {},
      alarmHistory: alarms.map(alarm => ({
        date: alarm.scheduledTime,
        status: alarm.status,
        acknowledgedAt: alarm.acknowledgedAt,
        missedReason: alarm.missedReason
      }))
    };

    // Calculate daily adherence
    alarms.forEach(alarm => {
      const date = alarm.scheduledTime.toISOString().split('T')[0];
      if (!adherenceData.dailyAdherence[date]) {
        adherenceData.dailyAdherence[date] = {
          total: 0,
          taken: 0,
          missed: 0
        };
      }
      
      adherenceData.dailyAdherence[date].total++;
      if (alarm.status === 'acknowledged') {
        adherenceData.dailyAdherence[date].taken++;
      } else if (alarm.status === 'missed') {
        adherenceData.dailyAdherence[date].missed++;
      }
    });

    res.json(adherenceData);
  } catch (error) {
    console.error('Get adherence error:', error);
    res.status(500).json({ message: 'Failed to fetch adherence data' });
  }
});

// Delete/deactivate medication
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Check permissions
    if (medication.patient.toString() !== req.user._id.toString()) {
      if (!req.user.familyId || medication.familyId.toString() !== req.user.familyId.toString()) {
        return res.status(403).json({ message: 'No permission to delete this medication' });
      }
      
      const family = await Family.findById(req.user.familyId);
      const permissions = family.getMemberPermissions(req.user._id);
      
      if (!permissions || !permissions.manageMedications) {
        return res.status(403).json({ message: 'No permission to manage medications' });
      }
    }

    // Deactivate instead of deleting
    medication.isActive = false;
    medication.notes.push({
      text: `Medication deactivated by ${req.user.firstName} ${req.user.lastName}`,
      addedBy: req.user._id,
      type: 'note'
    });
    
    await medication.save();

    // Cancel any active alarms
    await MedicationAlarm.updateMany(
      { 
        medication: medication._id,
        status: { $in: ['pending', 'active', 'snoozed'] }
      },
      { 
        status: 'cancelled',
        cancelledBy: req.user._id,
        cancelledAt: new Date()
      }
    );

    // Notify family members
    const io = req.app.get('io');
    if (req.user.familyId) {
      io.to(`family_${req.user.familyId}`).emit('medicationDeactivated', {
        medication: medication.toJSON(),
        deactivatedBy: req.user.toJSON()
      });
    }

    res.json({
      message: 'Medication deactivated successfully'
    });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ message: 'Failed to delete medication' });
  }
});

module.exports = router;
