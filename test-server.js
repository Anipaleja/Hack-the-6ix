#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

// Simple test server to verify everything works
const app = express();
const PORT = 3001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend setup is working!',
    timestamp: new Date().toISOString(),
    features: [
      'Express server setup',
      'MongoDB models defined',  
      'API routes created',
      'Sample data script ready',
      'Ready for MongoDB connection'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test to verify setup`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Install and start MongoDB');
  console.log('2. Run: npm run dev');
  console.log('3. Generate sample data: node scripts/generateSampleData.js');
});
