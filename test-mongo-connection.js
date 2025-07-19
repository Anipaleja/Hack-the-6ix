const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('Connection string:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Successfully connected to MongoDB Atlas!');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
  } catch (error) {
    console.error('MongoDB connection failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\nTip: Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\nTip: Check your internet connection and MongoDB Atlas network access settings');
    }
    
    process.exit(1);
  }
}

testMongoConnection();
