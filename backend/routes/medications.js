const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const Medication = require('../models/Medication');
const Family = require('../models/Family');
const MedicationAlarm = require('../models/MedicationAlarm');

const router = express.Router();

console.log('🚀 MEDICATIONS ROUTE FILE LOADED - CLEAN VERSION');

// Temporary in-memory storage for medications until database issue is resolved
let medicationsStore = new Map();

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
    // Get medications from memory for this user
    const userMedications = Array.from(medicationsStore.values()).filter(med => 
      med.patient === req.user.userId || med.familyId === req.user.familyId
    );

    res.json({
      medications: userMedications,
      totalPages: 1,
      currentPage: 1,
      total: userMedications.length
    });
  } catch (error) {
    console.error('Get medications error:', error);
    
    res.json({
      medications: [],
      totalPages: 0,
      currentPage: 1,
      total: 0
    });
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

// Add new medication - working version with in-memory storage
router.post('/', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: POST /api/medications called');
  console.log('🔍 DEBUG: User ID:', req.user?.userId);
  console.log('🔍 DEBUG: Request body:', req.body);
  
  try {
    // Create medication data
    const medicationId = Date.now().toString();
    const medicationData = {
      _id: medicationId,
      scientificName: req.body.scientificName || 'Unknown',
      commonName: req.body.commonName || 'Unknown',
      dosage: req.body.dosage || { amount: 0, unit: 'mg' },
      schedule: req.body.schedule || { frequency: 'once_daily', times: [{ hour: 8, minute: 0 }], startDate: new Date() },
      instructions: req.body.instructions || '',
      purpose: req.body.purpose || '',
      category: req.body.category || 'prescription',
      patient: req.user.userId,
      familyId: req.user.familyId,
      isActive: true,
      sideEffects: req.body.sideEffects || [],
      color: req.body.color || '#1976d2',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in memory
    medicationsStore.set(medicationId, medicationData);

    console.log('✅ Medication saved to memory store:', medicationId);

    res.status(201).json({
      message: 'Medication added successfully',
      medication: medicationData
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ message: 'Failed to add medication' });
  }
});

// Delete medication
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: DELETE /api/medications/:id called');
  console.log('🔍 DEBUG: User ID:', req.user?.userId);
  console.log('🔍 DEBUG: Medication ID:', req.params.id);
  
  try {
    const medicationId = req.params.id;
    const medication = medicationsStore.get(medicationId);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    // Check if user owns this medication
    if (medication.patient !== req.user.userId && medication.familyId !== req.user.familyId) {
      return res.status(403).json({ message: 'Not authorized to delete this medication' });
    }
    
    // Remove from memory store
    medicationsStore.delete(medicationId);
    
    console.log('✅ Medication deleted from memory store:', medicationId);
    
    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ message: 'Failed to delete medication' });
  }
});

// Update medication (edit)
router.put('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: PUT /api/medications/:id called');
  console.log('🔍 DEBUG: User ID:', req.user?.userId);
  console.log('🔍 DEBUG: Medication ID:', req.params.id);
  
  try {
    const medicationId = req.params.id;
    const existingMedication = medicationsStore.get(medicationId);
    
    if (!existingMedication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    // Check if user owns this medication
    if (existingMedication.patient !== req.user.userId && existingMedication.familyId !== req.user.familyId) {
      return res.status(403).json({ message: 'Not authorized to update this medication' });
    }
    
    // Update medication data
    const updatedMedication = {
      ...existingMedication,
      scientificName: req.body.scientificName || existingMedication.scientificName,
      commonName: req.body.commonName || existingMedication.commonName,
      dosage: req.body.dosage || existingMedication.dosage,
      schedule: req.body.schedule || existingMedication.schedule,
      instructions: req.body.instructions || existingMedication.instructions,
      purpose: req.body.purpose || existingMedication.purpose,
      category: req.body.category || existingMedication.category,
      sideEffects: req.body.sideEffects || existingMedication.sideEffects,
      color: req.body.color || existingMedication.color,
      isActive: req.body.isActive !== undefined ? req.body.isActive : existingMedication.isActive,
      updatedAt: new Date()
    };
    
    // Update in memory store
    medicationsStore.set(medicationId, updatedMedication);
    
    console.log('✅ Medication updated in memory store:', medicationId);
    
    res.json({
      message: 'Medication updated successfully',
      medication: updatedMedication
    });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ message: 'Failed to update medication' });
  }
});

// Pause/Resume medication
router.patch('/:id/toggle-pause', authenticateToken, async (req, res) => {
  console.log('🔍 DEBUG: PATCH /api/medications/:id/toggle-pause called');
  
  try {
    const medicationId = req.params.id;
    const medication = medicationsStore.get(medicationId);
    
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    // Check if user owns this medication
    if (medication.patient !== req.user.userId && medication.familyId !== req.user.familyId) {
      return res.status(403).json({ message: 'Not authorized to modify this medication' });
    }
    
    // Toggle pause status
    const updatedMedication = {
      ...medication,
      isPaused: !medication.isPaused,
      updatedAt: new Date()
    };
    
    medicationsStore.set(medicationId, updatedMedication);
    
    console.log('✅ Medication pause status toggled:', medicationId, 'isPaused:', updatedMedication.isPaused);
    
    res.json({
      message: `Medication ${updatedMedication.isPaused ? 'paused' : 'resumed'} successfully`,
      medication: updatedMedication
    });
  } catch (error) {
    console.error('Toggle pause medication error:', error);
    res.status(500).json({ message: 'Failed to toggle medication pause status' });
  }
});

module.exports = router;
