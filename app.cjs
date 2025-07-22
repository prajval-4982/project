const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.cjs');
const serviceRoutes = require('./routes/services.cjs');
const orderRoutes = require('./routes/orders.cjs');
const cartRoutes = require('./routes/cart.cjs');
const userRoutes = require('./routes/users.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors({ origin: `http://localhost:5173`
  //origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  // credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect MongoDB (removed deprecated options)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastram-final')
.then(() => console.log('✅ Connected to Vastram MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Vastram API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Vastram API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      services: '/api/services',
      orders: '/api/orders',
      cart: '/api/cart',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

// 404 handler - Fixed approach
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Vastram API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Vastram API Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${PORT}`);
});