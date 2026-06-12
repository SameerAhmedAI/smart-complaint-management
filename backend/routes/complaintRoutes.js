const express = require('express');
const router = express.Router();
const {
  submitComplaint,
  getUserComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  deleteComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

// User routes
router.post('/', protect, submitComplaint);
router.get('/my', protect, getUserComplaints);

// Admin + Staff routes
router.get('/', protect, authorize('admin', 'staff'), getAllComplaints);

// Shared route (access controlled inside controller)
router.get('/:id', protect, getComplaintById);

// Admin + Staff action routes
router.put('/:id/status', protect, authorize('admin', 'staff'), updateComplaintStatus);
router.put('/:id/assign', protect, authorize('admin'), assignComplaint);
router.delete('/:id', protect, authorize('admin'), deleteComplaint);

module.exports = router;
