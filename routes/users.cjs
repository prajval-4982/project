const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User.cjs');
const Order = require('../models/Order.cjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth.cjs');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's detailed profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { customer: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      lastOrderDate: null
    };

    res.json({
      status: 'success',
      message: 'Vastram user profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          membershipTier: user.membershipTier,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        statistics: {
          totalOrders: stats.totalOrders,
          totalSpent: Math.round(stats.totalSpent),
          averageOrderValue: Math.round(stats.avgOrderValue),
          lastOrderDate: stats.lastOrderDate
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram user profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Please provide a valid Indian phone number'),
  body('address').optional().trim().isLength({ min: 10, max: 200 }).withMessage('Address must be between 10 and 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, address } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'Vastram profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          membershipTier: user.membershipTier,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update Vastram profile'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', [
  authenticateToken,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('membershipTier').optional().isIn(['bronze', 'silver', 'gold', 'platinum']),
  query('role').optional().isIn(['customer', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const { search, membershipTier, role } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (membershipTier) {
      query.membershipTier = membershipTier;
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      message: 'Vastram users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram user not found'
      });
    }

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0
    };

    res.json({
      status: 'success',
      message: 'Vastram user details retrieved successfully',
      data: {
        user,
        statistics: {
          totalOrders: stats.totalOrders,
          totalSpent: Math.round(stats.totalSpent),
          averageOrderValue: Math.round(stats.avgOrderValue)
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram user details'
    });
  }
});

// @route   PUT /api/users/:id/membership
// @desc    Update user membership tier (Admin only)
// @access  Private/Admin
router.put('/:id/membership', [
  authenticateToken,
  requireAdmin,
  body('membershipTier').isIn(['bronze', 'silver', 'gold', 'platinum']).withMessage('Invalid membership tier')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { membershipTier } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { membershipTier },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram user not found'
      });
    }

    res.json({
      status: 'success',
      message: `User membership tier updated to ${membershipTier}`,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user membership tier'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Activate/Deactivate user account (Admin only)
// @access  Private/Admin
router.put('/:id/status', [
  authenticateToken,
  requireAdmin,
  body('isActive').isBoolean().withMessage('isActive must be a boolean value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram user not found'
      });
    }

    const statusMessage = isActive ? 'activated' : 'deactivated';

    res.json({
      status: 'success',
      message: `Vastram user account ${statusMessage} successfully`,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user account status'
    });
  }
});

module.exports = router;