const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VastramService',
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    default: function() {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `VAST-${timestamp}-${randomNum}`;
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VastramUser',
    required: true
  },
  items: [orderItemSchema],

  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    required: true,
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },

  // Pickup Details
  pickupAddress: {
    type: String,
    required: true,
    maxlength: [300, 'Pickup address cannot exceed 300 characters']
  },
  pickupDate: {
    type: Date,
    required: true
  },
  pickupTime: {
    type: String,
    required: true
  },

  // Delivery Details
  deliveryAddress: {
    type: String,
    required: true,
    maxlength: [300, 'Delivery address cannot exceed 300 characters']
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },

  // Order Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked-up', 'in-progress', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // Special Instructions
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },

  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],
    default: 'cash'
  },

  // Tracking
  trackingUpdates: [{
    status: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Rating & Review
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },

  // Admin Notes
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  }

}, {
  timestamps: true
});

// Ensure orderNumber is generated if not provided
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `VAST-${timestamp}-${randomNum}`;
  }
  next();
});

// Estimate delivery based on max processing time (placeholder logic)
orderSchema.pre('save', function (next) {
  if (!this.estimatedDelivery && this.pickupDate) {
    const maxProcessingDays = 2; // Static assumption
    this.estimatedDelivery = new Date(this.pickupDate);
    this.estimatedDelivery.setDate(this.estimatedDelivery.getDate() + maxProcessingDays);
  }
  next();
});

// Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ pickupDate: 1 });

// Static method: Get orders by status
orderSchema.statics.getByStatus = function (status) {
  return this.find({ status })
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 });
};

// Instance method: Add tracking update
orderSchema.methods.addTrackingUpdate = function (status, message) {
  this.trackingUpdates.push({
    status,
    message,
    timestamp: new Date()
  });
  this.status = status;
  return this.save();
};

module.exports = mongoose.model('VastramOrder', orderSchema);
