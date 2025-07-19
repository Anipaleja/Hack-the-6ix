const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const healthLogRoutes = require('./routes/healthLogs');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB (Atlas or local)
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}`);
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  console.error('Make sure your MongoDB Atlas password is correct in the .env file');
  process.exit(1);
});

// Routes
app.use('/api/health-logs', healthLogRoutes);
app.use('/api/users', userRoutes);

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Health Logging API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      users: {
        'Get all users': 'GET /api/users',
        'Get user by ID': 'GET /api/users/:id',
        'Create user': 'POST /api/users',
        'Update user': 'PUT /api/users/:id',
        'Delete user': 'DELETE /api/users/:id'
      },
      healthLogs: {
        'Get logs for user': 'GET /api/health-logs/user/:userId',
        'Get log by ID': 'GET /api/health-logs/:id',
        'Create health log': 'POST /api/health-logs',
        'Update health log': 'PUT /api/health-logs/:id',
        'Delete health log': 'DELETE /api/health-logs/:id',
        'Get analytics': 'GET /api/health-logs/analytics/:userId'
      }
    },
    database: {
      status: 'Connected to MongoDB Atlas',
      name: 'hack-the-6ix'
    },
    timestamp: new Date().toISOString()
  });
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Health logging API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
