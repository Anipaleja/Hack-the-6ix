const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Check if user account is active
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          error: 'Account suspended' 
        });
      }

      // Add user to request object
      req.user = user;
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      } else {
        throw jwtError; // Re-throw other errors
      }
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during authentication' 
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without user
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.status !== 'suspended') {
        req.user = user;
      }
    } catch (jwtError) {
      // Ignore JWT errors in optional auth
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Family member verification middleware
const verifyFamilyMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const { familyId } = req.params;
    
    if (!familyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Family ID required' 
      });
    }

    const Family = require('../models/Family');
    const family = await Family.findById(familyId);
    
    if (!family) {
      return res.status(404).json({ 
        success: false, 
        error: 'Family not found' 
      });
    }

    // Check if user is a member of this family
    const isMember = family.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not a member of this family' 
      });
    }

    req.family = family;
    next();

  } catch (error) {
    console.error('Family verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during family verification' 
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  authorize,
  verifyFamilyMember
};
