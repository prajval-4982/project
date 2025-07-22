// testCart.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const VastramCart = require('./models/Cart.cjs');
const VastramUser = require('./models/User.cjs');
const VastramService = require('./models/Service.cjs');

async function testCart() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastram');

  const user = await VastramUser.findOne(); // pick any user
  const service = await VastramService.findOne(); // pick any service

  if (!user || !service) {
    console.log("Need at least one user and service in the DB");
    return;
  }

  const cart = await VastramCart.getOrCreateCart(user._id);
  await cart.addItem(service._id, 2, service.price);

  console.log("🛒 Cart updated!");
  mongoose.disconnect();
}

testCart();
