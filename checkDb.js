const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://prajval4982:o2IKlJVbreAq9jPt@vastram.pxtyzrn.mongodb.net/vastram?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 Collections:');
    console.log(collections.map(c => `- ${c.name}`).join('\n'));

    // Try to find services
    try {
      const services = await mongoose.connection.db.collection('vastramservices').find({}).toArray();
      console.log(`\n🔍 Found ${services.length} services in vastramservices collection:`);
      console.log(services);
    } catch (err) {
      console.error('\n❌ Error querying vastramservices collection:', err.message);
    }

    // Try to find any service using the Service model
    try {
      const Service = require('./models/Service.cjs');
      const services = await Service.find({});
      console.log(`\n🔍 Found ${services.length} services using Service model:`);
      console.log(services);
    } catch (err) {
      console.error('\n❌ Error querying with Service model:', err.message);
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDatabase();