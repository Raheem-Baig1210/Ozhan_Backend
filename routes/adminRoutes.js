const express = require('express');
const {
  getInventory,
  adjustInventory,
  getInventoryHistory,
  getCustomers,
  blockCustomer,
  resetCustomerPassword,
  issueCoupon,
  getReviews,
  updateReviewStatus,
  replyToReview,
  submitReturnRequest,
  getReturns,
  updateReturnRequest,
  getPaymentAnalytics,
  getStaff,
  updateStaffRole,
  getSettings,
  updateSettings
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Inventory routes
router.get('/inventory', protect, getInventory);
router.put('/inventory/adjust', protect, adjustInventory);
router.get('/inventory/history', protect, getInventoryHistory);

// Customer routes
router.get('/customers', protect, getCustomers);
router.put('/customers/:id/block', protect, blockCustomer);
router.put('/customers/:id/reset-password', protect, resetCustomerPassword);
router.put('/customers/:id/coupon', protect, issueCoupon);

// Review routes
router.get('/reviews', protect, getReviews);
router.put('/reviews/:id/status', protect, updateReviewStatus);
router.post('/reviews/:id/reply', protect, replyToReview);

// Return & Refund routes
router.post('/returns/request', protect, submitReturnRequest); // User submission
router.get('/returns', protect, getReturns);
router.put('/returns/:id', protect, updateReturnRequest);

// Payment analytics routes
router.get('/payments/analytics', protect, getPaymentAnalytics);

// Staff management (RBAC) routes
router.get('/staff', protect, getStaff);
router.put('/staff/:id/role', protect, updateStaffRole);

// System Configuration Settings
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);

module.exports = router;
