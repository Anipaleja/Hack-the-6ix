const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const users = await User.find({ isActive: true })
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments({ isActive: true });
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, deviceIds, profile, preferences } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['name', 'email'] 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    const user = new User({
      name,
      email: email.toLowerCase(),
      deviceIds: deviceIds || [],
      profile: profile || {},
      preferences: preferences || {}
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating email directly (could cause conflicts)
    if (updates.email) {
      delete updates.email;
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

// DELETE user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user', message: error.message });
  }
});

// POST add device to user
router.post('/:id/devices', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.deviceIds.includes(deviceId)) {
      user.deviceIds.push(deviceId);
      await user.save();
    }
    
    res.json({
      message: 'Device added successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add device', message: error.message });
  }
});

// DELETE remove device from user
router.delete('/:id/devices/:deviceId', async (req, res) => {
  try {
    const { id, deviceId } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.deviceIds = user.deviceIds.filter(device => device !== deviceId);
    await user.save();
    
    res.json({
      message: 'Device removed successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove device', message: error.message });
  }
});

module.exports = router;
