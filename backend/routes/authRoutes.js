const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  updateUser,
  getStaffMembers,
  createAdmin,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.get('/staff', protect, authorize('admin'), getStaffMembers);

// The ONLY route that creates admin accounts — requires an existing admin JWT
router.post('/create-admin', protect, authorize('admin'), createAdmin);

module.exports = router;
