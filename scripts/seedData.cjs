const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
require('dotenv').config({ path: '../.env' });

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined. Check your .env file.");
  process.exit(1);
}
// Import models
const User = require('../models/User.cjs');
const Service = require('../models/Service.cjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI )
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Connection error:", err));
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })

// Sample users data
const users = [
  {
    name: 'Admin User',
    email: 'admin@vastram.com',
    password: 'admin123',
    phone: '+91 9999999999',
    address: 'Vastram Headquarters, Mumbai, Maharashtra',
    role: 'admin',
    membershipTier: 'platinum'
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    password: 'customer123',
    phone: '+91 9876543210',
    address: '123 MG Road, Bangalore, Karnataka, 560001',
    role: 'customer',
    membershipTier: 'gold',
    totalOrders: 15,
    totalSpent: 12500
  },
  {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'customer123',
    phone: '+91 9876543211',
    address: '456 Koramangala, Bangalore, Karnataka, 560034',
    role: 'customer',
    membershipTier: 'silver',
    totalOrders: 8,
    totalSpent: 6800
  },
  {
    name: 'Amit Patel',
    email: 'amit@example.com',
    password: 'customer123',
    phone: '+91 9876543212',
    address: '789 Whitefield, Bangalore, Karnataka, 560066',
    role: 'customer',
    membershipTier: 'bronze',
    totalOrders: 3,
    totalSpent: 2100
  }
];

// Sample services data
const services = [
  // Shirts & Tops
  {
    name: 'Regular Shirt',
    description: 'Cotton and regular fabric shirts with standard cleaning',
    price: 49,
    category: 'shirts',
    processingTime: '24 hours',
    isPopular: true,
    tags: ['cotton', 'regular', 'office'],
    careInstructions: 'Machine wash with mild detergent, iron on medium heat'
  },
  {
    name: 'Premium Shirt',
    description: 'Designer and branded shirts with special care',
    price: 89,
    category: 'shirts',
    processingTime: '24 hours',
    isPopular: true,
    tags: ['premium', 'designer', 'branded'],
    careInstructions: 'Gentle wash with premium detergent, professional pressing'
  },
  {
    name: 'Formal Shirt',
    description: 'Office and formal wear shirts with crisp finishing',
    price: 69,
    category: 'shirts',
    processingTime: '24 hours',
    tags: ['formal', 'office', 'business'],
    careInstructions: 'Professional cleaning with starch, precise ironing'
  },
  {
    name: 'T-Shirt',
    description: 'Casual t-shirts and tops with gentle care',
    price: 39,
    category: 'shirts',
    processingTime: '24 hours',
    tags: ['casual', 'cotton', 'everyday'],
    careInstructions: 'Gentle wash, air dry, light ironing'
  },

  // Suits & Formal
  {
    name: 'Suit 2 Piece',
    description: 'Complete 2-piece suit dry cleaning with professional finishing',
    price: 199,
    category: 'suits',
    processingTime: '48 hours',
    isPopular: true,
    tags: ['suit', 'formal', 'business', 'dry-clean'],
    careInstructions: 'Professional dry cleaning only, steam pressing'
  },
  {
    name: 'Suit 3 Piece',
    description: 'Complete 3-piece suit with vest, premium dry cleaning',
    price: 299,
    category: 'suits',
    processingTime: '48 hours',
    isPopular: true,
    tags: ['suit', 'formal', 'premium', 'vest'],
    careInstructions: 'Premium dry cleaning, professional pressing, vest included'
  },
  {
    name: 'Blazer',
    description: 'Single blazer dry cleaning with shape retention',
    price: 149,
    category: 'suits',
    processingTime: '48 hours',
    tags: ['blazer', 'formal', 'jacket'],
    careInstructions: 'Dry clean only, maintain shoulder shape, steam finish'
  },
  {
    name: 'Formal Pants',
    description: 'Formal trousers and pants with crease setting',
    price: 79,
    category: 'suits',
    processingTime: '24 hours',
    tags: ['pants', 'formal', 'trousers'],
    careInstructions: 'Dry clean or wash, professional pressing with crease'
  },

  // Traditional Wear
  {
    name: 'Saree Cotton',
    description: 'Cotton sarees with gentle cleaning and proper folding',
    price: 99,
    category: 'traditional',
    processingTime: '24 hours',
    isPopular: true,
    tags: ['saree', 'cotton', 'traditional', 'indian'],
    careInstructions: 'Gentle wash, natural drying, careful folding'
  },
  {
    name: 'Saree Silk',
    description: 'Silk sarees with special care and preservation',
    price: 199,
    category: 'traditional',
    processingTime: '48 hours',
    isPopular: true,
    tags: ['saree', 'silk', 'premium', 'traditional'],
    careInstructions: 'Dry clean only, silk-specific treatment, careful handling'
  },
  {
    name: 'Lehenga',
    description: 'Heavy lehengas and chaniya cholis with embellishment care',
    price: 399,
    category: 'traditional',
    processingTime: '72 hours',
    tags: ['lehenga', 'heavy', 'embellished', 'wedding'],
    careInstructions: 'Specialized cleaning for heavy fabrics and embellishments'
  },
  {
    name: 'Kurta',
    description: 'Cotton and silk kurtas with traditional finishing',
    price: 69,
    category: 'traditional',
    processingTime: '24 hours',
    tags: ['kurta', 'traditional', 'cotton', 'silk'],
    careInstructions: 'Gentle wash or dry clean based on fabric, traditional pressing'
  },

  // Casual Wear
  {
    name: 'Jeans',
    description: 'Denim jeans and casual pants with color protection',
    price: 59,
    category: 'casual',
    processingTime: '24 hours',
    tags: ['jeans', 'denim', 'casual'],
    careInstructions: 'Wash inside out, color protection, minimal ironing'
  },
  {
    name: 'Casual Dress',
    description: 'Everyday dresses and casual wear with gentle care',
    price: 89,
    category: 'casual',
    processingTime: '24 hours',
    tags: ['dress', 'casual', 'everyday'],
    careInstructions: 'Gentle wash based on fabric, shape maintenance'
  },
  {
    name: 'Sweater',
    description: 'Woolen sweaters and cardigans with shrinkage prevention',
    price: 119,
    category: 'casual',
    processingTime: '48 hours',
    tags: ['sweater', 'wool', 'winter'],
    careInstructions: 'Specialized wool cleaning, shrinkage prevention, flat drying'
  },
  {
    name: 'Jacket',
    description: 'Casual jackets and outerwear with weather protection',
    price: 159,
    category: 'casual',
    processingTime: '48 hours',
    tags: ['jacket', 'outerwear', 'casual'],
    careInstructions: 'Appropriate cleaning based on material, weather protection maintained'
  },
  {
    name: 'Blanket Single',
    description: 'Wash & Clean service for single blanket',
    price: 300,
    category: 'home-essentials',
    processingTime: '48 hours',
    tags: ['blanket', 'single', 'home', 'wash', 'clean'],
    careInstructions: 'Gentle wash, air dry, do not bleach'
  },
  {
    name: 'Blanket Double',
    description: 'Wash & Clean service for double blanket',
    price: 400,
    category: 'home-essentials',
    processingTime: '48 hours',
    tags: ['blanket', 'double', 'home', 'wash', 'clean'],
    careInstructions: 'Gentle wash, air dry, do not bleach'
  },
  {
    name: 'Quilt Single',
    description: 'Wash & Clean service for single quilt',
    price: 380,
    category: 'home-essentials',
    processingTime: '48 hours',
    tags: ['quilt', 'single', 'home', 'wash', 'clean'],
    careInstructions: 'Gentle wash, air dry, do not bleach'
  },
  {
    name: 'Bedsheet',
    description: 'Wash & Clean service for bedsheet',
    price: 150,
    category: 'home-essentials',
    processingTime: '24 hours',
    tags: ['bedsheet', 'home', 'wash', 'clean'],
    careInstructions: 'Machine wash, tumble dry low, iron if needed'
  },
  {
    name: 'Pillow Cover',
    description: 'Wash & Clean service for pillow cover',
    price: 50,
    category: 'home-essentials',
    processingTime: '24 hours',
    tags: ['pillow', 'cover', 'home', 'wash', 'clean'],
    careInstructions: 'Machine wash, tumble dry low, iron if needed'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting Vastram database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Service.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    // Create services
    console.log('🧺 Creating services...');
    for (const serviceData of services) {
      const service = new Service(serviceData);
      await service.save();
      console.log(`✅ Created service: ${service.name} - ₹${service.price}`);
    }

    console.log('\n🎉 Vastram database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👥 Users created: ${users.length}`);
    console.log(`🧺 Services created: ${services.length}`);
    
    console.log('\n🔐 Test Accounts:');
    console.log('Admin: admin@vastram.com / admin123');
    console.log('Customer: rajesh@example.com / customer123');
    
    console.log('\n🚀 You can now start the Vastram API server!');
    console.log("MONGODB_URI:", process.env.MONGODB_URI);

    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding function
seedDatabase();