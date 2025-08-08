const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const medicationRoutes = require('./routes/medications');
const queryRoutes = require('./routes/queries');
const medicalInfoRoutes = require('./routes/medicalInfo');
const healthDataRoutes = require('./routes/healthData');
const notificationRoutes = require('./routes/notifications');

// Import services
const MedicationAlarmService = require('./services/medicationAlarmService');
const HealthDataSyncService = require('./services/healthDataSyncService');
const NotificationService = require('./services/notificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vivirion', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Join user-specific room based on userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join family room for shared data
  socket.on('joinFamily', (familyId) => {
    socket.join(`family_${familyId}`);
    console.log(`👨‍👩‍👧‍👦 User joined family room: ${familyId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Make io available to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/medical-info', medicalInfoRoutes);
app.use('/api/health-data', healthDataRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize services
const medicationAlarmService = new MedicationAlarmService(io);
const healthDataSyncService = new HealthDataSyncService();
const notificationService = new NotificationService(io);

// Schedule medication checks every minute
cron.schedule('* * * * *', async () => {
  try {
    await medicationAlarmService.checkMedicationAlarms();
  } catch (error) {
    console.error('Error in medication alarm check:', error);
  }
});

// Schedule health data sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try {
    // Sync health data for active users
    console.log('🔄 Running scheduled health data sync...');
  } catch (error) {
    console.error('Error in health data sync:', error);
  }
});

// Schedule daily cleanup at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    await medicationAlarmService.cleanupOldAlarms();
    console.log('🧹 Daily cleanup completed');
  } catch (error) {
    console.error('Error in daily cleanup:', error);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📱 Socket.IO ready for real-time connections`);
});

module.exports = { app, io };
