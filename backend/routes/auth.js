const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Family = require('../models/Family');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['client', 'doctor', 'next_of_kin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, phone, familyCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      phone
    });

    await user.save();

    // Handle family connection
    let family = null;
    if (familyCode) {
      // Join existing family
      family = await Family.findOne({ 
        inviteCode: familyCode,
        inviteCodeExpires: { $gt: new Date() }
      });
      
      if (family) {
        user.familyId = family._id;
        await user.save();
        await family.addMember(user._id, role);
      }
    } else if (role === 'client') {
      // Create new family for client
      family = new Family({
        name: `${firstName} ${lastName}'s Family`,
        client: user._id,
        members: []
      });
      
      family.generateInviteCode();
      await family.save();
      
      user.familyId = family._id;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
      family: family ? {
        id: family._id,
        name: family.name,
        inviteCode: family.inviteCode
      } : null
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, deviceToken, platform } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();

    // Update device token if provided
    if (deviceToken && platform) {
      // Remove existing tokens for this device
      user.deviceTokens = user.deviceTokens.filter(dt => dt.token !== deviceToken);
      
      // Add new token
      user.deviceTokens.push({
        token: deviceToken,
        platform: platform,
        lastUsed: new Date()
      });
    }

    await user.save();

    // Get family information
    let family = null;
    if (user.familyId) {
      family = await Family.findById(user.familyId).populate('members.user', 'firstName lastName role email');
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      family: family ? {
        id: family._id,
        name: family.name,
        members: family.members,
        settings: family.settings,
        inviteCode: family.inviteCode
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).populate('familyId');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('familyId');
    
    let family = null;
    if (user.familyId) {
      family = await Family.findById(user.familyId).populate('members.user', 'firstName lastName role email');
    }

    res.json({
      user: user.toJSON(),
      family: family ? {
        id: family._id,
        name: family.name,
        members: family.members,
        settings: family.settings,
        inviteCode: family.inviteCode,
        permissions: family.getMemberPermissions(user._id)
      } : null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().trim(),
  body('dateOfBirth').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'notificationSettings', 'medicalInfo'];
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    
    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Join family with invite code
router.post('/join-family', authenticateToken, [
  body('inviteCode').trim().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { inviteCode } = req.body;

    // Find family with valid invite code
    const family = await Family.findOne({
      inviteCode: inviteCode,
      inviteCodeExpires: { $gt: new Date() }
    });

    if (!family) {
      return res.status(404).json({ message: 'Invalid or expired invite code' });
    }

    // Check if user is already a member
    if (family.isMember(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this family' });
    }

    // Add user to family
    await family.addMember(req.user._id, req.user.role);
    
    // Update user's family reference
    req.user.familyId = family._id;
    await req.user.save();

    // Populate family members for response
    const populatedFamily = await Family.findById(family._id).populate('members.user', 'firstName lastName role email');

    // Notify other family members via socket
    const io = req.app.get('io');
    io.to(`family_${family._id}`).emit('familyMemberJoined', {
      user: req.user.toJSON(),
      family: populatedFamily
    });

    res.json({
      message: 'Successfully joined family',
      family: {
        id: populatedFamily._id,
        name: populatedFamily.name,
        members: populatedFamily.members,
        settings: populatedFamily.settings,
        permissions: populatedFamily.getMemberPermissions(req.user._id)
      }
    });
  } catch (error) {
    console.error('Join family error:', error);
    res.status(500).json({ message: 'Failed to join family' });
  }
});

// Create new family (for existing users who want to start fresh)
router.post('/create-family', authenticateToken, [
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    // Create new family
    const family = new Family({
      name,
      client: req.user.role === 'client' ? req.user._id : null,
      members: []
    });

    family.generateInviteCode();
    await family.save();

    // Add user as member
    await family.addMember(req.user._id, req.user.role);

    // Update user's family reference
    req.user.familyId = family._id;
    await req.user.save();

    res.status(201).json({
      message: 'Family created successfully',
      family: {
        id: family._id,
        name: family.name,
        inviteCode: family.inviteCode,
        settings: family.settings,
        permissions: family.getMemberPermissions(req.user._id)
      }
    });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ message: 'Failed to create family' });
  }
});

// Refresh token
router.post('/refresh-token', authenticateToken, (req, res) => {
  const token = generateToken(req.user._id);
  res.json({ token });
});

// Logout (remove device token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    if (deviceToken) {
      req.user.deviceTokens = req.user.deviceTokens.filter(dt => dt.token !== deviceToken);
      await req.user.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = { router, authenticateToken };
