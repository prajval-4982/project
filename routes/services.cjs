const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, query } = require('express-validator');
const Service = require('../models/Service.cjs');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth.cjs');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all Vastram services with optional filtering
// @access  Public
router.get('/', [
  query('category').optional().isIn(['shirts', 'suits', 'traditional', 'casual', 'home-essentials']),
  query('minPrice').optional().isNumeric(),
  query('maxPrice').optional().isNumeric(),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('popular').optional().isBoolean()
], optionalAuth, async (req, res) => {
  try {
    console.log('Fetching services with query:', req.query);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const { category, minPrice, maxPrice, search, popular } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isActive: true };
    console.log('Initial query:', query);

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (popular === 'true') {
      query.isPopular = true;
    }

    console.log('Final query:', query);
    let total;
    let services;

    if (search) {
      // Text search
      services = await Service.find({
        ...query,
        $text: { $search: search }
      })
      .sort({ score: { $meta: 'textScore' }, price: 1 })
      .skip(skip)
      .limit(limit);

      total = await Service.countDocuments({
        ...query,
        $text: { $search: search }
      });
    } else {
      // Regular query
      services = await Service.find(query)
        .sort({ category: 1, price: 1 })
        .skip(skip)
        .limit(limit);

      total = await Service.countDocuments(query);
    }

    res.json({
      status: 'success',
      message: 'Vastram services retrieved successfully',
      data: {
        services,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalServices: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram services'
    });
  }
});

// @route   GET /api/services/categories
// @desc    Get all service categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const categoryMap = {
      'shirts': 'Shirts & Tops',
      'suits': 'Suits & Formal',
      'traditional': 'Traditional Wear',
      'casual': 'Casual Wear',
      'home-essentials': 'Home Essentials'
    };

    const formattedCategories = categories.map(cat => ({
      id: cat._id,
      name: categoryMap[cat._id] || cat._id,
      count: cat.count,
      priceRange: {
        min: cat.minPrice,
        max: cat.maxPrice,
        average: Math.round(cat.avgPrice)
      }
    }));

    res.json({
      status: 'success',
      message: 'Vastram service categories retrieved successfully',
      data: {
        categories: formattedCategories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service categories'
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get single Vastram service by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, isActive: true });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram service not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vastram service retrieved successfully',
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Vastram service'
    });
  }
});

// @route   POST /api/services
// @desc    Create new Vastram service (Admin only)
// @access  Private/Admin
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Service name must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('price').isNumeric().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['shirts', 'suits', 'traditional', 'casual', 'home-essentials']).withMessage('Invalid category'),
  body('processingTime').isIn(['24 hours', '48 hours', '72 hours', '1 week']).withMessage('Invalid processing time')
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

    const service = new Service(req.body);
    await service.save();

    res.status(201).json({
      status: 'success',
      message: 'Vastram service created successfully',
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create Vastram service'
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update Vastram service (Admin only)
// @access  Private/Admin
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ min: 10, max: 500 }),
  body('price').optional().isNumeric().isFloat({ min: 0 }),
  body('category').optional().isIn(['shirts', 'suits', 'traditional', 'casual', 'home-essentials']),
  body('processingTime').optional().isIn(['24 hours', '48 hours', '72 hours', '1 week'])
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

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram service not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vastram service updated successfully',
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update Vastram service'
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Soft delete Vastram service (Admin only)
// @access  Private/Admin
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Vastram service not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Vastram service deactivated successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate Vastram service'
    });
  }
});

module.exports = router;