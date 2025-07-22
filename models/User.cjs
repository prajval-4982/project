const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
 phone: {
  type: String,
  required: true,
  validate: {
    validator: function (v) {
      // This regex allows optional +country code and 10+ digit numbers (e.g. +919876543210)
      return /^\+?\d{10,13}$/.test(v.replace(/\s+/g, ''));
    },
    message: 'Please enter a valid phone number'
  }
}
,
  address: {
    type: String,
    required: [true, 'Address is required'],
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  membershipTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update membership tier based on total spent
userSchema.methods.updateMembershipTier = function() {
  if (this.totalSpent >= 50000) {
    this.membershipTier = 'platinum';
  } else if (this.totalSpent >= 25000) {
    this.membershipTier = 'gold';
  } else if (this.totalSpent >= 10000) {
    this.membershipTier = 'silver';
  } else {
    this.membershipTier = 'bronze';
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('VastramUser', userSchema);