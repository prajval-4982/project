const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart.cjs');
const Service = require('../models/Service.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's Vastram cart
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user._id);
    await cart.populate('items.service', 'name price category processingTime description');

    res.json({
      status: 'success',
      message: 'Vastram cart retrieved successfully',
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
          lastUpdated: cart.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram cart'
    });
  }
});

// @route   POST /api/cart/items
// @desc    Add item to Vastram cart
// @access  Private
router.post('/items', [
  authenticateToken,
  body('serviceId').isMongoId().withMessage('Invalid service ID'),
  body('quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50')
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

    const { serviceId, quantity } = req.body;

    // Verify service exists and is active
    const service = await Service.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram service not found or unavailable'
      });
    }

    // Get or create cart
    const cart = await Cart.getOrCreateCart(req.user._id);

    // Add item to cart
    await cart.addItem(serviceId, quantity, service.price);
    await cart.populate('items.service', 'name price category processingTime description');

    res.json({
      status: 'success',
      message: `${service.name} added to your Vastram cart`,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
          lastUpdated: cart.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add item to Vastram cart'
    });
  }
});

// @route   PUT /api/cart/items/:serviceId
// @desc    Update item quantity in Vastram cart
// @access  Private
router.put('/items/:serviceId', [
  authenticateToken,
  body('quantity').isInt({ min: 0, max: 50 }).withMessage('Quantity must be between 0 and 50')
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

    const { serviceId } = req.params;
    const { quantity } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram cart not found'
      });
    }

    // Update item quantity
    await cart.updateItemQuantity(serviceId, quantity);
    await cart.populate('items.service', 'name price category processingTime description');

    const message = quantity === 0 
      ? 'Item removed from your Vastram cart'
      : 'Cart item quantity updated successfully';

    res.json({
      status: 'success',
      message,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
          lastUpdated: cart.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update Vastram cart item'
    });
  }
});

// @route   DELETE /api/cart/items/:serviceId
// @desc    Remove item from Vastram cart
// @access  Private
router.delete('/items/:serviceId', authenticateToken, async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram cart not found'
      });
    }

    // Remove item from cart
    await cart.removeItem(serviceId);
    await cart.populate('items.service', 'name price category processingTime description');

    res.json({
      status: 'success',
      message: 'Item removed from your Vastram cart',
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
          lastUpdated: cart.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove item from Vastram cart'
    });
  }
});

// @route   DELETE /api/cart
// @desc    Clear entire Vastram cart
// @access  Private
router.delete('/', authenticateToken, async (req, res) => {
  try {
    // Get cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram cart not found'
      });
    }

    // Clear cart
    await cart.clearCart();

    res.json({
      status: 'success',
      message: 'Vastram cart cleared successfully',
      data: {
        cart: {
          id: cart._id,
          items: [],
          totalItems: 0,
          totalPrice: 0,
          lastUpdated: cart.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear Vastram cart'
    });
  }
});

module.exports = router;