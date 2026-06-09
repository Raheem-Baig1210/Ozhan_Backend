const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const InventoryHistory = require('../models/InventoryHistory');
const ReturnRequest = require('../models/ReturnRequest');
const Settings = require('../models/Settings');
const bcrypt = require('bcryptjs');

// Helper to check user permission
const checkRBAC = (req, res, allowedRoles) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    res.status(403);
    throw new Error('Access denied. Insufficient permissions for this role.');
  }
};

// ==========================================
// 1. INVENTORY MANAGEMENT
// ==========================================

// @desc    Get all inventory with tracking details
// @route   GET /api/admin/inventory
// @access  Private/Admin
const getInventory = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'inventory_manager']);

    const products = await Product.find({}).select(
      'name brand category price countInStock reservedStock soldStock lowStockThreshold'
    );
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust inventory levels
// @route   PUT /api/admin/inventory/adjust
// @access  Private/Admin
const adjustInventory = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'inventory_manager']);

    const { productId, action, quantity } = req.body;

    if (!productId || !action || quantity === undefined) {
      res.status(400);
      throw new Error('Please provide productId, action (Add/Reduce/Adjustment), and quantity');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    let qtyChange = Number(quantity);
    if (action === 'Add') {
      product.countInStock += qtyChange;
    } else if (action === 'Reduce') {
      if (product.countInStock < qtyChange) {
        res.status(400);
        throw new Error('Insufficient stock count available to reduce');
      }
      product.countInStock -= qtyChange;
    } else if (action === 'Adjustment') {
      qtyChange = qtyChange - product.countInStock;
      product.countInStock = Number(quantity);
    }

    await product.save();

    // Log in inventory history
    const history = new InventoryHistory({
      product: productId,
      action: action === 'Adjustment' ? 'Adjustment' : action,
      quantity: Math.abs(qtyChange),
      user: req.user._id,
    });
    await history.save();

    res.json({ message: 'Stock updated successfully', product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory logs
// @route   GET /api/admin/inventory/history
// @access  Private/Admin
const getInventoryHistory = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'inventory_manager']);

    const history = await InventoryHistory.find({})
      .populate('product', 'name brand')
      .populate('user', 'name role')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CUSTOMER MANAGEMENT
// ==========================================

// @desc    Get all registered customers & calculate live analytics
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'customer_support']);

    const customers = await User.find({ role: 'customer' }).select('-password');
    const orders = await Order.find({}).populate('user', 'email');

    // Dynamically calculate and update customer lifetime metrics from real order records
    const customersWithAnalytics = customers.map(cust => {
      const customerOrders = orders.filter(o => o.user && o.user._id.toString() === cust._id.toString());
      const paidOrders = customerOrders.filter(o => o.isPaid);
      
      const totalSpend = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);
      const totalOrdersCount = customerOrders.length;
      
      // Calculate purchase frequency (orders per month since registration)
      const monthsSinceRegistration = Math.max(1, (new Date() - new Date(cust.createdAt)) / (1000 * 60 * 60 * 24 * 30));
      const purchaseFrequency = totalOrdersCount / monthsSinceRegistration;

      const lastPurchase = paidOrders.length > 0 
        ? paidOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt 
        : null;

      return {
        ...cust.toObject(),
        totalSpend,
        totalOrders: totalOrdersCount,
        lifetimeValue: totalSpend,
        purchaseFrequency: Number(purchaseFrequency.toFixed(2)),
        lastPurchaseDate: lastPurchase
      };
    });

    res.json(customersWithAnalytics);
  } catch (error) {
    next(error);
  }
};

// @desc    Block or Unblock customer
// @route   PUT /api/admin/customers/:id/block
// @access  Private/Admin
const blockCustomer = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'customer_support']);

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Customer not found');
    }

    user.isBlocked = req.body.isBlocked !== undefined ? req.body.isBlocked : !user.isBlocked;
    await user.save();

    res.json({ message: `Customer ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reset customer password
// @route   PUT /api/admin/customers/:id/reset-password
// @access  Private/Admin
const resetCustomerPassword = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager']);

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Customer not found');
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Customer password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue a promo coupon to customer
// @route   PUT /api/admin/customers/:id/coupon
// @access  Private/Admin
const issueCoupon = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager']);

    const { couponCode } = req.body;
    if (!couponCode) {
      res.status(400);
      throw new Error('Coupon code is required');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Customer not found');
    }

    if (user.coupons.includes(couponCode.toUpperCase())) {
      res.status(400);
      throw new Error('User already has this coupon issued');
    }

    user.coupons.push(couponCode.toUpperCase());
    await user.save();

    res.json({ message: 'Coupon issued successfully', user });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. REVIEW MANAGEMENT
// ==========================================

// @desc    Get all reviews across all perfumes
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getReviews = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager', 'customer_support']);

    const products = await Product.find({}).select('name brand reviews');
    
    let allReviews = [];
    products.forEach(p => {
      p.reviews.forEach(r => {
        allReviews.push({
          productId: p._id,
          productName: p.name,
          productBrand: p.brand,
          _id: r._id,
          name: r.name,
          rating: r.rating,
          comment: r.comment,
          status: r.status || 'approved',
          reply: r.reply || '',
          user: r.user,
          createdAt: r.createdAt
        });
      });
    });

    res.json(allReviews);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject / Hide review
// @route   PUT /api/admin/reviews/:id/status
// @access  Private/Admin
const updateReviewStatus = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager', 'customer_support']);

    const { productId, status } = req.body;
    if (!productId || !status) {
      res.status(400);
      throw new Error('Product ID and status are required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const review = product.reviews.id(req.params.id);
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    review.status = status;
    await product.save();

    res.json({ message: `Review status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to customer review
// @route   POST /api/admin/reviews/:id/reply
// @access  Private/Admin
const replyToReview = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager', 'customer_support']);

    const { productId, reply } = req.body;
    if (!productId || reply === undefined) {
      res.status(400);
      throw new Error('Product ID and reply are required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const review = product.reviews.id(req.params.id);
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    review.reply = reply;
    await product.save();

    res.json({ message: 'Reply saved successfully', review });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. RETURNS & REFUNDS
// ==========================================

// @desc    Submit a return request (Customer role)
// @route   POST /api/admin/returns/request
// @access  Private
const submitReturnRequest = async (req, res, next) => {
  try {
    const { orderId, items, reason, refundAmount } = req.body;

    if (!orderId || !items || !reason) {
      res.status(400);
      throw new Error('Please fill in all details for the return request.');
    }

    const returnReq = new ReturnRequest({
      order: orderId,
      user: req.user._id,
      items,
      reason,
      refundAmount: refundAmount || 0,
      status: 'Pending',
    });

    const created = await returnReq.save();
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all return requests
// @route   GET /api/admin/returns
// @access  Private/Admin
const getReturns = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'customer_support']);

    const returns = await ReturnRequest.find({})
      .populate('user', 'name email')
      .populate('order', 'totalPrice')
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate return request status
// @route   PUT /api/admin/returns/:id
// @access  Private/Admin
const updateReturnRequest = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'customer_support']);

    const { status, refundAmount } = req.body;
    if (!status) {
      res.status(400);
      throw new Error('Status field is required');
    }

    const returnReq = await ReturnRequest.findById(req.params.id);
    if (!returnReq) {
      res.status(404);
      throw new Error('Return request not found');
    }

    returnReq.status = status;
    if (refundAmount !== undefined) {
      returnReq.refundAmount = Number(refundAmount);
    }

    // Adjust countInStock / soldStock / reservedStock if refund is approved
    if (status === 'Refunded') {
      for (const item of returnReq.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock += item.qty;
          product.soldStock = Math.max(0, product.soldStock - item.qty);
          await product.save();
        }
      }
    }

    await returnReq.save();
    res.json({ message: 'Return status updated successfully', returnReq });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PAYMENT MANAGEMENT
// ==========================================

// @desc    Fetch payment success/fail and method analytics
// @route   GET /api/admin/payments/analytics
// @access  Private/Admin
const getPaymentAnalytics = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager']);

    const orders = await Order.find({});
    
    // Aggregation maps
    const metrics = {
      Razorpay: { successful: 0, failed: 0, refunds: 0 },
      Stripe: { successful: 0, failed: 0, refunds: 0 },
      PayPal: { successful: 0, failed: 0, refunds: 0 },
      COD: { successful: 0, failed: 0, refunds: 0 }
    };

    orders.forEach(o => {
      const method = o.paymentMethod || 'COD';
      const key = metrics[method] ? method : 'COD';
      
      if (o.isPaid) {
        metrics[key].successful += 1;
      } else if (o.paymentResult && o.paymentResult.status === 'FAILED') {
        metrics[key].failed += 1;
      } else {
        // COD/Pending
        metrics[key].successful += 0;
      }
    });

    // Compute returns as refunds
    const refunds = await ReturnRequest.find({ status: 'Refunded' }).populate('order', 'paymentMethod');
    refunds.forEach(r => {
      const method = r.order?.paymentMethod || 'COD';
      const key = metrics[method] ? method : 'COD';
      metrics[key].refunds += 1;
    });

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. STAFF & ROLE MANAGEMENT (RBAC)
// ==========================================

// @desc    Get all staff/admin accounts
// @route   GET /api/admin/staff
// @access  Private/Admin
const getStaff = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin']);

    const staffRoles = ['super_admin', 'admin', 'manager', 'inventory_manager', 'marketing_manager', 'customer_support'];
    const staff = await User.find({ role: { $in: staffRoles } }).select('-password');
    
    res.json(staff);
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee access role
// @route   PUT /api/admin/staff/:id/role
// @access  Private/Admin
const updateStaffRole = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin']);

    const { role } = req.body;
    if (!role) {
      res.status(400);
      throw new Error('Role parameter is required');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Staff member not found');
    }

    // Safety: only Super Admin can edit Super Admin or Admin roles
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      res.status(403);
      throw new Error('Only a Super Admin can modify another Super Admin.');
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. SYSTEM CONFIGURATION SETTINGS
// ==========================================

// @desc    Get store general, tax, and invoice settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager']);

    let settings = await Settings.findOne({});
    if (!settings) {
      // Initialize defaults
      settings = new Settings({});
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update store settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res, next) => {
  try {
    checkRBAC(req, res, ['super_admin', 'admin', 'manager', 'marketing_manager']);

    const { businessName, gstNumber, address, gstPercent, stateTax, logo, footerText, terms } = req.body;

    let settings = await Settings.findOne({});
    if (!settings) {
      settings = new Settings({});
    }

    settings.businessName = businessName !== undefined ? businessName : settings.businessName;
    settings.gstNumber = gstNumber !== undefined ? gstNumber : settings.gstNumber;
    settings.address = address !== undefined ? address : settings.address;
    settings.gstPercent = gstPercent !== undefined ? Number(gstPercent) : settings.gstPercent;
    settings.stateTax = stateTax !== undefined ? Number(stateTax) : settings.stateTax;
    settings.logo = logo !== undefined ? logo : settings.logo;
    settings.footerText = footerText !== undefined ? footerText : settings.footerText;
    settings.terms = terms !== undefined ? terms : settings.terms;

    await settings.save();
    res.json({ message: 'Configuration updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
