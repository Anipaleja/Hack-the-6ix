const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
require('dotenv').config();

// Import routes - Original
const healthLogRoutes = require('./routes/healthLogs');
const userRoutes = require('./routes/users');
const healthTimerRoutes = require('./routes/healthTimers');

// Import routes - Advanced Features
const biometricDataRoutes = require('./routes/biometricData');
const aiInsightsRoutes = require('./routes/aiInsights');
const mlModelsRoutes = require('./routes/mlModels');
const quantumSecurityRoutes = require('./routes/quantumSecurity');

// Advanced Health Monitoring System
const RealTimeHealthMonitor = require('./utils/realTimeHealthMonitor');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Real-Time Health Monitor
const healthMonitor = new RealTimeHealthMonitor();
healthMonitor.initializeWebSocketServer(server);

// Clean up inactive connections every 5 minutes
setInterval(() => {
  healthMonitor.cleanupConnections();
}, 5 * 60 * 1000);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'ws://localhost:3000'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '50mb' })); // Increased for biometric data and ML models
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging with performance monitoring
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 1000) { // Log slow requests
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

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

// Routes - Original
app.use('/api/health-logs', healthLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health-timers', healthTimerRoutes);

// Routes - Advanced Features
app.use('/api/biometric-data', biometricDataRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/ml-models', mlModelsRoutes);
app.use('/api/quantum-security', quantumSecurityRoutes);

// Real-time monitoring stats endpoint
app.get('/api/monitoring/stats', (req, res) => {
  res.json({
    ...healthMonitor.getMonitoringStats(),
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Root route - API documentation with advanced features
app.get('/', (req, res) => {
  res.json({
    message: 'Advanced Health Companion API - Hackathon Edition',
    status: 'Running',
    version: '2.0.0',
    features: [
      'Real-time biometric monitoring with WebSocket support',
      'AI-powered health insights and anomaly detection',
      'Machine Learning models for health prediction',
      'Advanced analytics and correlation analysis',
      'Predictive health risk assessment',
      'Personalized recommendations engine'
    ],
    endpoints: {
      health: 'GET /api/health',
      monitoring: {
        'Real-time stats': 'GET /api/monitoring/stats',
        'WebSocket connection': 'ws://localhost:3000/ws/health-monitor'
      },
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
        'Analyze transcription': 'POST /api/health-logs/analyze',
        'Update health log': 'PUT /api/health-logs/:id',
        'Delete health log': 'DELETE /api/health-logs/:id',
        'Get analytics': 'GET /api/health-logs/analytics/:userId'
      },
      healthTimers: {
        'Get user timers': 'GET /api/health-timers/user/:userId',
        'Create timer': 'POST /api/health-timers',
        'Complete timer': 'PUT /api/health-timers/:id/complete',
        'Cancel timer': 'PUT /api/health-timers/:id/cancel',
        'Get expired timers': 'GET /api/health-timers/system/expired'
      },
      biometricData: {
        'Store biometric reading': 'POST /api/biometric-data',
        'Get user data': 'GET /api/biometric-data/user/:userId',
        'Advanced analytics': 'GET /api/biometric-data/analytics/:userId',
        'Health alerts': 'GET /api/biometric-data/alerts/:userId',
        'Batch upload': 'POST /api/biometric-data/batch'
      },
      aiInsights: {
        'Get AI insights': 'GET /api/ai-insights/user/:userId',
        'Generate insights': 'POST /api/ai-insights/generate/:userId',
        'Acknowledge insight': 'PUT /api/ai-insights/:id/acknowledge',
        'Dashboard summary': 'GET /api/ai-insights/dashboard/:userId',
        'Delete insight': 'DELETE /api/ai-insights/:id'
      },
      mlModels: {
        'Health risk prediction': 'GET /api/ml-models/predict/health-risk/:userId',
        'Train personalized model': 'POST /api/ml-models/train/personalized',
        'Anomaly detection': 'GET /api/ml-models/anomaly-detection/:userId',
        'Symptom progression': 'POST /api/ml-models/predict/symptom-progression',
        'Health score': 'GET /api/ml-models/health-score/:userId',
        'Available models': 'GET /api/ml-models/models'
      },
      emergencyContacts: {
        'Get contacts': 'GET /api/users/:id/emergency-contacts',
        'Add contact': 'POST /api/users/:id/emergency-contacts',
        'Remove contact': 'DELETE /api/users/:id/emergency-contacts/:contactId',
        'Update contact': 'PUT /api/users/:id/emergency-contacts/:contactId'
      },
      voiceAssistant: {
        'Logging intent': 'POST /api/health-logs (with transcription)',
        'Timer create': 'POST /api/health-timers',
        'Timer stop': 'PUT /api/health-timers/:id/complete',
        'Contact create': 'POST /api/users/:id/emergency-contacts',
        'Contact remove': 'DELETE /api/users/:id/emergency-contacts/:contactId'
      }
    },
    realTimeCapabilities: {
      websockets: 'Real-time health monitoring and alerts',
      biometricStream: 'Live biometric data processing',
      anomalyDetection: 'Instant health anomaly alerts',
      aiInsights: 'Real-time AI-generated health insights',
      emergencyAlerts: 'Automatic emergency contact notifications'
    },
    aiCapabilities: {
      predictiveModeling: 'Health risk prediction and trend analysis',
      anomalyDetection: 'Advanced statistical and ML-based anomaly detection',
      personalizedInsights: 'AI-generated personalized health recommendations',
      correlationAnalysis: 'Multi-factor health correlation discovery',
      healthScoring: 'Comprehensive health score calculation'
    },
    database: {
      status: 'Connected to MongoDB Atlas',
      name: 'hack-the-6ix',
      collections: ['users', 'healthlogs', 'healthtimers', 'biometricdata', 'aiinsights']
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    timestamp: new Date().toISOString()
  });
});

// Basic health check route with system diagnostics
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    message: 'Advanced Health Companion API is running',
    services: {
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      webSocket: healthMonitor ? 'Active' : 'Inactive',
      realTimeMonitoring: 'Operational',
      aiInsights: 'Operational',
      mlModels: 'Operational'
    },
    metrics: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      connectedClients: healthMonitor ? healthMonitor.getMonitoringStats().connectedClients : 0,
      connectedDevices: healthMonitor ? healthMonitor.getMonitoringStats().connectedDevices : 0
    },
    version: '2.0.0',
    timestamp: new Date().toISOString()
  };
  
  const statusCode = healthStatus.services.database === 'Connected' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Error handling middleware with enhanced logging
app.use((err, req, res, next) => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.error(`Error ${errorId}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    errorId,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler with helpful suggestions
app.use('*', (req, res) => {
  const suggestions = [
    'Check the API documentation at GET /',
    'Verify the endpoint exists in our API',
    'Ensure you\'re using the correct HTTP method',
    'Check for typos in the URL'
  ];
  
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    suggestions,
    availableEndpoints: 'GET / for full API documentation',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Advanced Health Companion API Server is running on http://localhost:${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/ws/health-monitor`);
  console.log(`📊 API documentation: http://localhost:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Real-time health monitoring: ACTIVE`);
  console.log(`🤖 AI insights and ML models: READY`);
  console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'CONNECTING...'}`);
});
