const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token - use actual environment variable
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Get user from the token (and attach to request object)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('JWT verification error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const storeAdmin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.storeAdminRequest === 'approved')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a store admin' });
  }
};

const ownerOrAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  
  // For store admins, check if they own the resource
  if (req.user && req.user.storeAdminRequest === 'approved') {
    // This middleware should be used with additional logic to check ownership
    // The actual ownership check should be done in the route handler
    return next();
  }
  
  res.status(403).json({ message: 'Not authorized to perform this action' });
};

const validateUserAccess = (resourceOwnerId) => {
  return (req, res, next) => {
    if (req.user && req.user.isAdmin) {
      return next();
    }
    
    if (req.user && req.user.storeAdminRequest === 'approved') {
      // Check if the user owns the resource
      if (resourceOwnerId && resourceOwnerId.toString() === req.user._id.toString()) {
        return next();
      }
    }
    
    res.status(403).json({ message: 'Not authorized to access this resource' });
  };
};

module.exports = { 
  protect, 
  admin, 
  storeAdmin, 
  ownerOrAdmin, 
  validateUserAccess 
};
