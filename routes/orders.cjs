const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order.cjs');
const Service = require('../models/Service.cjs');
const User = require('../models/User.cjs');
const Cart = require('../models/Cart.cjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth.cjs');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new Vastram order
// @access  Private
router.post('/', [
  authenticateToken,
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.service').isMongoId().withMessage('Invalid service ID'),
  body('items.*.quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50'),
  body('pickupAddress').trim().isLength({ min: 10, max: 300 }).withMessage('Pickup address must be between 10 and 300 characters'),
  body('pickupDate').isISO8601().withMessage('Invalid pickup date'),
  body('pickupTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time format'),
  body('deliveryAddress').trim().isLength({ min: 10, max: 300 }).withMessage('Delivery address must be between 10 and 300 characters'),
  body('specialInstructions').optional().isLength({ max: 500 }).withMessage('Special instructions cannot exceed 500 characters')
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

    const { items, pickupAddress, pickupDate, pickupTime, deliveryAddress, specialInstructions } = req.body;

    // Validate pickup date is in the future
    const pickupDateTime = new Date(pickupDate);
    if (pickupDateTime <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup date must be in the future'
      });
    }

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const service = await Service.findOne({ _id: item.service, isActive: true });
      if (!service) {
        return res.status(400).json({
          status: 'error',
          message: `Service not found: ${item.service}`
        });
      }

      const itemSubtotal = service.price * item.quantity;
      orderItems.push({
        service: service._id,
        serviceName: service.name,
        quantity: item.quantity,
        price: service.price,
        subtotal: itemSubtotal
      });

      subtotal += itemSubtotal;
    }

    // Calculate tax (18% GST)
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    // Create order
    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      subtotal,
      tax,
      total,
      pickupAddress,
      pickupDate: pickupDateTime,
      pickupTime,
      deliveryAddress,
      specialInstructions
    });

    await order.save();

    // Add initial tracking update
    await order.addTrackingUpdate('pending', 'Order placed successfully. Waiting for confirmation.');

    // Update user statistics
    const user = await User.findById(req.user._id);
    user.totalOrders += 1;
    user.totalSpent += total;
    user.updateMembershipTier();
    await user.save();

    // Clear user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      await cart.clearCart();
    }

    // Populate order for response
    await order.populate('customer', 'name email phone');

    res.status(201).json({
      status: 'success',
      message: 'Vastram order placed successfully! We will contact you soon for pickup confirmation.',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to place Vastram order. Please try again.'
    });
  }
});

// @route   GET /api/orders
// @desc    Get user's orders or all orders (admin)
// @access  Private
router.get('/', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'confirmed', 'picked-up', 'in-progress', 'ready', 'out-for-delivery', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // If not admin, only show user's orders
    if (req.user.role !== 'admin') {
      query.customer = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('items.service', 'name category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      status: 'success',
      message: 'Vastram orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only allow access to own orders
    if (req.user.role !== 'admin') {
      query.customer = req.user._id;
    }

    const order = await Order.findOne(query)
      .populate('customer', 'name email phone address')
      .populate('items.service', 'name category description');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram order not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vastram order details retrieved successfully',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram order details'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put('/:id/status', [
  authenticateToken,
  requireAdmin,
  body('status').isIn(['pending', 'confirmed', 'picked-up', 'in-progress', 'ready', 'out-for-delivery', 'delivered', 'cancelled']),
  body('message').optional().isLength({ max: 200 }).withMessage('Message cannot exceed 200 characters')
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

    const { status, message } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram order not found'
      });
    }

    // Add tracking update
    const statusMessages = {
      'confirmed': 'Order confirmed. Preparing for pickup.',
      'picked-up': 'Items picked up successfully.',
      'in-progress': 'Your items are being processed at Vastram facility.',
      'ready': 'Your order is ready for delivery.',
      'out-for-delivery': 'Your order is out for delivery.',
      'delivered': 'Order delivered successfully. Thank you for choosing Vastram!',
      'cancelled': 'Order has been cancelled.'
    };

    const trackingMessage = message || statusMessages[status] || `Order status updated to ${status}`;
    await order.addTrackingUpdate(status, trackingMessage);

    // Set actual delivery date if delivered
    if (status === 'delivered') {
      order.actualDelivery = new Date();
      await order.save();
    }

    await order.populate('customer', 'name email phone');

    res.json({
      status: 'success',
      message: 'Vastram order status updated successfully',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update Vastram order status'
    });
  }
});

// @route   POST /api/orders/:id/review
// @desc    Add review and rating to delivered order
// @access  Private
router.post('/:id/review', [
  authenticateToken,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
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

    const { rating, review } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user._id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or not eligible for review'
      });
    }

    if (order.rating) {
      return res.status(400).json({
        status: 'error',
        message: 'Order has already been reviewed'
      });
    }

    order.rating = rating;
    order.review = review;
    await order.save();

    res.json({
      status: 'success',
      message: 'Thank you for your review! Your feedback helps us improve Vastram services.',
      data: {
        rating: order.rating,
        review: order.review
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add review'
    });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order (if not yet picked up)
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only allow cancellation of own orders
    if (req.user.role !== 'admin') {
      query.customer = req.user._id;
    }

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram order not found'
      });
    }

    // Only allow cancellation if order is pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Order cannot be cancelled at this stage. Please contact Vastram support.'
      });
    }

    await order.addTrackingUpdate('cancelled', 'Order cancelled by customer request.');

    res.json({
      status: 'success',
      message: 'Vastram order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel Vastram order'
    });
  }
});

module.exports = router;