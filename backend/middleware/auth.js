const jwt = require('jsonwebtoken');
const db = require('../config/db').db;

/**
 * protect — verifies JWT and attaches req.user (without password)
 * Exposes both req.user.id and req.user._id for backward compatibility.
 */
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = db.prepare(
      `SELECT id, name, email, role, department, isActive, lastLogin, createdAt, updatedAt
       FROM users WHERE id = ?`
    ).get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    // Expose _id alias so existing controller code using req.user._id still works
    user._id = user.id;

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

/**
 * authorize — restricts access to specific roles
 * Usage: authorize('admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
