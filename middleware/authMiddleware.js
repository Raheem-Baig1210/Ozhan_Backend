const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      res.json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401);
    res.json({ message: 'Not authorized, no token provided' });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  const staffRoles = ['super_admin', 'admin', 'manager', 'inventory_manager', 'marketing_manager', 'customer_support'];
  if (req.user && staffRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403);
    res.json({ message: 'Not authorized as an admin or staff member' });
  }
};

module.exports = { protect, admin };
