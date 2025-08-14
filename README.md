# Vivirion Health - Full-Stack Healthcare Management Application

A comprehensive healthcare management platform with multi-role authentication, medication tracking, AI health assistant, and family sharing features.

## Features

### User Roles & Authentication
- **Multi-role system**: Patient, Doctor, Next of Kin
- **JWT-based authentication** with secure session management
- **Family-based sharing** with permission controls
- **Invite code system** for joining family groups

### Medication Management
- **Comprehensive medication tracking** with scheduling
- **Smart alarm system** with customizable reminders
- **Adherence monitoring** and reporting
- **Real-time family notifications** for missed doses
- **Medication interaction warnings**
- **Inventory tracking** and refill reminders

### AI Health Assistant
- **OpenAI GPT-4 powered** health query processing
- **Contextual responses** based on user's health data and medications
- **Emergency situation detection** with automatic family alerts
- **Personalized health insights** and recommendations
- **Medical information analysis** with safety disclaimers

### Health Data Integration
- **Apple HealthKit & Google Fit** API integration
- **Manual health data entry** for various metrics
- **Medical document upload** and management
- **Health trends and analytics** with visualization
- **Export capabilities** for healthcare providers

### Family & Notifications
- **Real-time synchronization** via Socket.IO
- **Multi-platform push notifications** (Firebase, Web Push)
- **Emergency alert system** with family notifications
- **Permission-based data sharing** between family members
- **Family dashboard** with overview of all members' health

### Database & Real-Time Features
- **MongoDB** with Mongoose ODM
- **Real-time updates** via WebSocket connections
- **Automated health data sync** from connected devices
- **Background job processing** for alarms and notifications
- **Data analytics** and reporting capabilities

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **OpenAI API** for AI health assistant
- **Firebase Admin SDK** for push notifications
- **Node-cron** for scheduled tasks
- **Multer** for file uploads

### Frontend
- **React 18** with modern hooks
- **Material-UI (MUI)** for design system
- **React Router v6** for navigation
- **Zustand** for state management
- **React Query** for server state
- **Socket.IO Client** for real-time features
- **React Hook Form** for form management

### Development Tools
- **ESLint** for code linting
- **Prettier** for code formatting
- **Nodemon** for development server
- **CORS** configuration for cross-origin requests

## 📁 Project Structure

```
Vivirion/
├── backend/
│   ├── models/
│   │   ├── User.js              # User model with multi-role support
│   │   ├── Family.js            # Family sharing system
│   │   ├── Medication.js        # Medication tracking
│   │   ├── MedicationAlarm.js   # Alarm management
│   │   ├── Query.js             # AI query history
│   │   └── HealthData.js        # Health metrics storage
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── medications.js       # Medication CRUD operations
│   │   ├── queries.js           # AI assistant endpoints
│   │   ├── healthData.js        # Health data management
│   │   ├── notifications.js     # Notification system
│   │   └── medicalInfo.js       # Medical document management
│   ├── services/
│   │   ├── aiHealthAssistant.js # OpenAI integration
│   │   ├── medicationAlarmService.js # Alarm processing
│   │   ├── notificationService.js # Multi-platform notifications
│   │   └── healthDataSyncService.js # Device data sync
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── rateLimiter.js       # Rate limiting
│   ├── package.json
│   └── server.js                # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/          # App layout components
│   │   │   └── Auth/            # Authentication components
│   │   ├── pages/
│   │   │   ├── Dashboard/       # Main dashboard
│   │   │   ├── Auth/            # Login/Register pages
│   │   │   ├── Medications/     # Medication management
│   │   │   ├── HealthData/      # Health data visualization
│   │   │   ├── AIAssistant/     # AI chat interface
│   │   │   ├── Family/          # Family dashboard
│   │   │   ├── Profile/         # User profile
│   │   │   └── Settings/        # App settings
│   │   ├── store/
│   │   │   └── authStore.js     # Zustand auth store
│   │   ├── contexts/
│   │   │   └── SocketContext.js # Socket.IO context
│   │   ├── App.js               # Main app component
│   │   └── index.js             # React entry point
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- OpenAI API key
- Firebase project (for push notifications)

### Backend Setup

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment variables** (create `.env` file):
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/vivirion
   
   # Authentication
   JWT_SECRET=your_jwt_secret_key_here
   
   # OpenAI Integration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Firebase (for push notifications)
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   
   # Web Push (optional)
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   
   # App Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the backend server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend and install:**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment variables** (create `.env` file):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_BACKEND_URL=http://localhost:5000
   ```

3. **Start the frontend development server:**
   ```bash
   npm start
   ```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Medications
- `GET /api/medications` - Get user medications
- `POST /api/medications` - Add new medication
- `PUT /api/medications/:id` - Update medication
- `DELETE /api/medications/:id` - Delete medication
- `POST /api/medications/:id/take` - Mark dose as taken

### AI Assistant
- `POST /api/queries` - Submit health query
- `GET /api/queries` - Get query history
- `POST /api/queries/:id/rate` - Rate AI response

### Health Data
- `GET /api/health-data/summary` - Get health data summary
- `POST /api/health-data/manual` - Add manual health entry
- `POST /api/health-data/sync` - Sync device data
- `POST /api/health-data/upload` - Upload health documents

### Notifications
- `POST /api/notifications/register-token` - Register device token
- `POST /api/notifications/test` - Send test notification
- `PUT /api/notifications/preferences` - Update notification settings

## Real-Time Features

### Socket.IO Events

**Client → Server:**
- `join` - Join user-specific room
- `joinFamily` - Join family room for shared updates

**Server → Client:**
- `medicationAlarm` - Medication reminder notification
- `medicationReminder` - Follow-up medication reminder
- `familyMedicationAlert` - Family notification for missed dose
- `emergencyAlert` - Emergency situation alert
- `queryResponse` - AI assistant response
- `healthDataAdded` - New health data recorded

## Security Features

- **JWT Authentication** with secure token management
- **Rate limiting** to prevent API abuse
- **Input validation** and sanitization
- **CORS configuration** for cross-origin security
- **Password hashing** with bcrypt
- **Permission-based access** control for family features
- **Data encryption** for sensitive health information

## Healthcare Compliance

- **HIPAA considerations** with data privacy controls
- **Medical disclaimers** for AI-generated health advice
- **Emergency detection** with appropriate escalation
- **Data retention policies** for health information
- **Audit logging** for healthcare data access

## Device Integration

### Supported Health Platforms
- **Apple HealthKit** (iOS devices, Apple Watch)
- **Google Fit** (Android devices, Wear OS)
- **Fitbit** (fitness trackers and smartwatches)
- **Manual entry** for any health metric

### Notification Platforms
- **Firebase Cloud Messaging** (iOS/Android push notifications)
- **Web Push Notifications** (browser notifications)
- **SMS notifications** (via Twilio integration)
- **Email notifications** for important alerts

## Deployment

### Production Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vivirion
JWT_SECRET=strong_production_secret
OPENAI_API_KEY=your_production_openai_key
FRONTEND_URL=https://your-domain.com
```

### Recommended Deployment Platforms
- **Backend**: Railway, Heroku, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3, Google Cloud Storage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Support

For support, email support@vivirion.com or create an issue in this repository.

## Roadmap

- [ ] **Mobile Apps** (React Native)
- [ ] **Telemedicine Integration** (video consultations)
- [ ] **Pharmacy Integration** (prescription management)
- [ ] **Insurance Claims** processing
- [ ] **Machine Learning** for health predictions
- [ ] **Multi-language Support**
- [ ] **Advanced Analytics** dashboard
- [ ] **Clinical Trial** participation features

### **Quantum Security Revolution** - Quantum-Secured Health Companion Backend

**Next-generation health companion with quantum encryption, blockchain integrity, and zero-knowledge privacy protection.**

### ** Quantum Security Revolution**
- **Quantum-Enhanced Encryption**: Post-quantum cryptography protecting against future quantum computers
- **Blockchain Data Integrity**: Immutable audit trail preventing any health data tampering
- **Zero-Knowledge Proofs**: Access health insights without ever exposing raw data
- **Homomorphic Analytics**: Perform AI analysis on encrypted data without decryption

### **Advanced AI Integration** 
- **Real-Time Anomaly Detection**: Instant identification of concerning health patterns
- **Predictive Health Modeling**: ML algorithms forecasting health risks days in advance
- **Personalized AI Insights**: Contextual health recommendations based on individual patterns
- **Voice Analysis Engine**: Extract medical insights from natural speech patterns

### **Smart Wearable Integration**
- **Google Fit Integration**: Quantum-encrypted sync with comprehensive fitness data (steps, sleep, heart rate)
- **Apple Watch/Fitbit Sync**: Secure encryption of all fitness device data
- **Real-Time Health Monitoring**: WebSocket-based live health metric streaming
- **Emergency Alert System**: Automatic notifications for critical health events
- **Cross-Platform Compatibility**: Works with multiple fitness tracking devices

## Project Overview

### **Advanced AI & Machine Learning**
- **Predictive Health Models**: ML-powered risk assessment and trend prediction
- **Anomaly Detection**: Statistical and ML-based detection of unusual health patterns
- **Personalized Insights**: AI-generated recommendations based on individual health profiles
- **Correlation Analysis**: Multi-factor health pattern recognition and analysis
- **Health Scoring**: Comprehensive health assessment with actionable insights

### **Intelligent Voice Analysis**
- **Medical Keyword Detection**: Automatic extraction of symptoms, medications, and conditions
- **Emotional State Recognition**: Voice pattern analysis for mental health insights
- **Urgency Assessment**: AI-powered severity and priority detection
- **Context Understanding**: Natural language processing for medical context

## System Architecture

```bash
Frontend Pages → API Endpoints → Database → Dashboard Display
     ↓              ↓              ↓           ↓
Care Provider → /api/care-provider → MongoDB → RPN Stats
Medications   → /api/medications   → MongoDB → Med Stats  
Health Data   → /api/health-data   → MongoDB → Health Stats
Family        → /api/family        → MongoDB → Family Stats
```
This backend is the secure core of an **quantum-protected health ecosystem**:

- **Panda Companion Device**: Raspberry Pi with voice interaction and LED indicators
- **Voice Assistant**: Python/Docker VA with wake word detection and Deepgram transcription
- **AI Processing**: Vellum + Gemini integration for intent classification and response generation
- **Google Fit Integration**: Quantum-secured fitness data with automatic sync and privacy protection
- **Apple Watch/Fitbit**: Secure wearable data synchronization with quantum encryption
- **Web Dashboard**: React frontend for health analytics and emergency contact management
- **Quantum Backend**: This Node.js service with blockchain and zero-knowledge privacy

## Project Structure

```
├── models/
│   ├── User.js                    # User profiles with emergency contacts
│   ├── HealthLog.js              # AI-analyzed health logs
│   ├── HealthTimer.js            # Emergency check-in timers
│   ├── SecureHealthData.js       # Quantum-encrypted health data
│   ├── GoogleFitData.js          # Google Fit integration with quantum security
│   ├── AIInsights.js             # AI-generated health insights
│   └── BiometricData.js          # Wearable device data
├── routes/
│   ├── users.js                  # User and emergency contact management
│   ├── healthLogs.js             # Voice log processing with AI analysis
│   ├── healthTimers.js           # Health check-in timer management
│   ├── quantumSecurity.js        # Quantum encryption and blockchain APIs
│   ├── googleFit.js              # Google Fit integration endpoints
│   ├── aiInsights.js             # AI health insights and recommendations
│   └── mlModels.js               # Machine learning health predictions
├── services/
│   ├── googleFitService.js       # Google Fit API client and data processing
│   └── googleFitSyncService.js   # Automatic fitness data synchronization
├── utils/
│   ├── quantumHealthSecurity.js  # Quantum encryption and blockchain
│   ├── advancedHealthAI.js       # AI health analysis and insights
│   ├── transcriptionAnalyzer.js  # Voice analysis and keyword extraction
│   └── realTimeHealthMonitor.js  # WebSocket health monitoring
├── server.js                     # Main server with quantum security
└── package.json                  # Dependencies with crypto libraries
```

## API Endpoints

### Quantum Security & Encryption
- `POST /api/quantum-security/encrypt` - Quantum encrypt health data with blockchain proof
- `POST /api/quantum-security/decrypt` - Decrypt with zero-knowledge proof verification
- `GET /api/quantum-security/blockchain/audit/:userId` - Get immutable audit trail
- `GET /api/quantum-security/status` - System security status and compliance
- `POST /api/quantum-security/analytics/private` - Privacy-preserving analytics
- `POST /api/quantum-security/key-rotation` - Rotate quantum encryption keys

### Health Check & System Status
- `GET /` - API documentation and system overview
- `GET /api/health` - Server status with security metrics
- `GET /api/monitoring/stats` - Real-time monitoring statistics

### User Management
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Wearable Device Data
- `POST /api/biometric-data` - Store encrypted Apple Watch/Fitbit data
- `GET /api/biometric-data/user/:userId` - Get user's wearable data (encrypted)

### Google Fit Integration
- `GET /api/google-fit/status?userId=USER_ID` - Check Google Fit connection status
- `GET /api/google-fit/authorize?userId=USER_ID` - Get OAuth authorization URL
- `GET /api/google-fit/oauth2callback` - OAuth callback handler (automatic)
- `POST /api/google-fit/sync` - Manual fitness data synchronization
- `GET /api/google-fit/data?userId=USER_ID&type=summary` - Get fitness summary
- `GET /api/google-fit/data?userId=USER_ID&type=activity&days=7` - Get activity data
- `GET /api/google-fit/data?userId=USER_ID&type=sleep&days=7` - Get sleep data
- `GET /api/google-fit/analytics?userId=USER_ID&period=30d` - Quantum-secured analytics
- `DELETE /api/google-fit/disconnect` - Disconnect Google Fit integration
- `GET /api/biometric-data/analytics/:userId` - Advanced health analytics
- `GET /api/biometric-data/alerts/:userId` - Real-time health alerts
- `POST /api/biometric-data/batch` - Batch sync from wearable devices

### AI Health Insights
- `GET /api/ai-insights/user/:userId` - Get AI-generated health insights
- `POST /api/ai-insights/generate/:userId` - Generate new personalized insights
- `PUT /api/ai-insights/:id/acknowledge` - Acknowledge insight
- `GET /api/ai-insights/dashboard/:userId` - Health dashboard summary

### Machine Learning Models
- `GET /api/ml-models/predict/health-risk/:userId` - Predict health risks
- `GET /api/ml-models/anomaly-detection/:userId` - Detect health anomalies
- `POST /api/ml-models/predict/symptom-progression` - Predict symptom trends
- `GET /api/ml-models/health-score/:userId` - Comprehensive health score

### Emergency Contacts (VA Integration)
- `GET /api/users/:id/emergency-contacts` - Get user's emergency contacts
- `POST /api/users/:id/emergency-contacts` - Add emergency contact (`emergency_contacts/create`)
- `PUT /api/users/:id/emergency-contacts/:contactId` - Update contact
- `DELETE /api/users/:id/emergency-contacts/:contactId` - Remove contact (`emergency_contacts/remove`)

### Health Timers (VA Integration)
- `GET /api/health-timers/user/:userId` - Get user's timers
- `POST /api/health-timers` - Create check-in timer (`check_in_timer/create`)
- `PUT /api/health-timers/:id/complete` - Complete timer (`check_in_timer/stop`)
- `PUT /api/health-timers/:id/cancel` - Cancel timer
- `GET /api/health-timers/system/expired` - Get expired timers (for alerts)

### Health Logs (VA Integration)
- `GET /api/health-logs/user/:userId` - Get logs for user (timeline view)
- `POST /api/health-logs/analyze` - Analyze transcription (testing)
- `POST /api/health-logs` - Create health log (`report/create` - `report/finish`)
- `PUT /api/health-logs/:id` - Update health log
- `DELETE /api/health-logs/:id` - Delete health log
- `POST /api/health-logs/:id/process` - Mark log as processed with AI analysis
- `GET /api/health-logs/analytics/:userId` - Get health analytics for user

## Hackathon Demo Highlights

### **Live Quantum Encryption Demo**
```bash
# 1. Encrypt health data with quantum security
curl -X POST localhost:3000/api/quantum-security/encrypt \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","healthData":{"heartRate":72,"steps":8500},"dataType":"wearable_data"}'

# 2. Get blockchain audit trail (immutable record)
curl localhost:3000/api/quantum-security/blockchain/audit/demo

# 3. Check quantum security status
curl localhost:3000/api/quantum-security/status
```

### **AI Health Insights Demo**
```bash
# Generate AI insights from health patterns
curl -X POST localhost:3000/api/ai-insights/generate/demo

# Get ML-powered health risk prediction
curl localhost:3000/api/ml-models/predict/health-risk/demo

# Anomaly detection in health data
curl localhost:3000/api/ml-models/anomaly-detection/demo
```

### **Real-Time Features**
- **WebSocket Connection**: `ws://localhost:3000/ws/health-monitor`
- **Live Health Monitoring**: Real-time biometric data streaming
- **Instant Alerts**: Immediate notifications for health anomalies
- **Privacy-Preserving Analytics**: AI analysis without data exposure

## Data Models

### User Schema
- Basic info (name, email)
- Device IDs for linked devices
- Medical profile (conditions, allergies, medications)
- Preferences (language, timezone, reminders)

### HealthLog Schema
- User reference and transcription text
- Metadata (duration, confidence, language)
- Health data (symptoms, severity, mood, tags)
- Processing status for AI analysis
- Timestamps for tracking

## Development

### Environment Setup
- Node.js 16+ required
- MongoDB 4.4+ (local or Atlas)
- Environment variables in `.env` file

### Adding New Features
1. Update models in `models/` directory
2. Add routes in `routes/` directory  
3. Update server.js if needed
4. Test with sample data

## Next Steps

- **Add Authentication**: JWT tokens for API security
- **File Upload**: Support for audio file storage
- **AI Integration**: Connect transcription and health analysis services
- **Real-time Features**: WebSocket support for live device communication
