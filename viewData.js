const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User.cjs');
const Service = require('./models/Service.cjs');
const Order = require('./models/Order.cjs');
const Cart = require('./models/Cart.cjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastram-final')
.then(() => console.log('✅ Connected to Vastram MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function viewAllData() {
  try {
    console.log('\n📊 Vastram Database Contents\n');
    console.log('=' .repeat(50));

    // View Users
    console.log('\n👥 USERS:');
    console.log('-'.repeat(20));
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}, Tier: ${user.membershipTier}`);
        console.log(`   Orders: ${user.totalOrders}, Spent: ₹${user.totalSpent}`);
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    }

    // View Services
    console.log('\n🧺 SERVICES:');
    console.log('-'.repeat(20));
    const services = await Service.find({});
    if (services.length === 0) {
      console.log('No services found');
    } else {
      services.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name}`);
        console.log(`   Price: ₹${service.price}, Category: ${service.category}`);
        console.log(`   Processing: ${service.processingTime}`);
        console.log(`   Popular: ${service.isPopular ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // View Orders
    console.log('\n📦 ORDERS:');
    console.log('-'.repeat(20));
    const orders = await Order.find({}).populate('customer', 'name email');
    if (orders.length === 0) {
      console.log('No orders found');
    } else {
      orders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Customer: ${order.customer?.name || 'Unknown'} (${order.customer?.email || 'Unknown'})`);
        console.log(`   Status: ${order.status}, Total: ₹${order.total}`);
        console.log(`   Items: ${order.items.length} items`);
        console.log(`   Created: ${order.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    }

    // View Carts
    console.log('\n🛒 CARTS:');
    console.log('-'.repeat(20));
    const carts = await Cart.find({}).populate('user', 'name email').populate('items.service', 'name');
    if (carts.length === 0) {
      console.log('No carts found');
    } else {
      carts.forEach((cart, index) => {
        console.log(`${index + 1}. Cart for: ${cart.user?.name || 'Unknown'} (${cart.user?.email || 'Unknown'})`);
        console.log(`   Items: ${cart.totalItems}, Total: ₹${cart.totalPrice}`);
        console.log(`   Last Updated: ${cart.lastUpdated.toLocaleDateString()}`);
        console.log('');
      });
    }

    console.log('\n✅ Data viewing completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error viewing data:', error);
    process.exit(1);
  }
}

// Run the function
viewAllData(); 