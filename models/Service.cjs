const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Schema definition remains the same
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: ['shirts', 'suits', 'traditional', 'casual', 'home-essentials'],
    lowercase: true
  },
  processingTime: {
    type: String,
    required: [true, 'Processing time is required'],
    enum: ['24 hours', '48 hours', '72 hours', '1 week']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  careInstructions: {
    type: String,
    maxlength: [300, 'Care instructions cannot exceed 300 characters']
  },
  minQuantity: {
    type: Number,
    default: 1,
    min: [1, 'Minimum quantity must be at least 1']
  },
  maxQuantity: {
    type: Number,
    default: 50,
    min: [1, 'Maximum quantity must be at least 1']
  }
}, {
  timestamps: true
});

// Index for better search performance
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ price: 1 });

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

// Static method to get services by category
serviceSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ price: 1 });
};

// Static method to get popular services
serviceSchema.statics.getPopular = function() {
  return this.find({ isPopular: true, isActive: true }).sort({ price: 1 });
};

// Explicitly set the collection name to 'vastramservices'
module.exports = mongoose.model('VastramService', serviceSchema, 'vastramservices');