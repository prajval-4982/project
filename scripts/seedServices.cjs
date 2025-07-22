const mongoose = require('mongoose');
const Service = require('../models/Service.cjs');
require('dotenv').config();

const sampleServices = [
  {
    name: 'Premium Shirt Laundry',
    description: 'Professional cleaning and pressing of dress shirts',
    price: 5.99,
    category: 'shirts',
    processingTime: '24 hours',
    isPopular: true,
    tags: ['shirt', 'laundry', 'pressing'],
    careInstructions: 'Wash with similar colors, tumble dry low',
    minQuantity: 3
  },
  {
    name: 'Suit Dry Cleaning',
    description: 'Expert dry cleaning for suits and blazers',
    price: 19.99,
    category: 'suits',
    processingTime: '48 hours',
    isPopular: true,
    tags: ['suit', 'dryclean', 'formal'],
    careInstructions: 'Dry clean only'
  },
  {
    name: 'Saree Cleaning',
    description: 'Specialized cleaning for traditional sarees',
    price: 12.99,
    category: 'traditional',
    processingTime: '72 hours',
    tags: ['saree', 'traditional', 'ethnic'],
    careInstructions: 'Hand wash recommended'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastram-final', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Service.deleteMany({});
    console.log('✅ Successfully cleared services collection');
    
    // Insert sample data
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`✅ Successfully added ${createdServices.length} sample services`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('✅ Database seeding completed');
    
    return createdServices;
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Database seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed database:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
