# Hack-the-6ix - Health Companion Backend

**Backend API for a comprehensive health companion system featuring voice assistant, physical device integration, and medical logging capabilities.**

## Project Overview

This backend is part of a larger **AI-powered health companion ecosystem**:

- **Physical Device**: Panda plushie with Raspberry Pi, microphone, speakers, and LED indicators
- **Voice Assistant**: Python/Docker-based VA with wake word detection and Deepgram transcription
- **AI Processing**: Vellum + Gemini integration for intent classification and response generation
- **Web Frontend**: React dashboard for viewing logs and managing emergency contacts
- **iPhone App**: Apple Watch integration for detailed health analytics
- **Backend API**: This Node.js service - handles data storage, analysis, and API endpoints

## Enhanced Features

### **Intelligent Transcription Analysis**
- **Automatic Keyword Detection**: Extracts symptoms, medications, body parts, emotions
- **Medical Entity Recognition**: Identifies dosages, frequencies, medical conditions
- **Severity & Mood Analysis**: Auto-detects pain levels (1-10) and emotional states
- **Time Context Extraction**: Understanding of "morning", "after meals", duration patterns

### **Voice Assistant Integration**
- **Logging Intent Support**: Handles VA's 'logging' intent to store transcribed health data
- **Emergency Contact Management**: API endpoints for emergency contacts (create/remove)
- **Timer Integration**: Support for health check-in timers and notifications
- **Real-time Processing**: Instant keyword analysis when VA sends transcription data

### **Comprehensive Health Analytics**
- **Historical Trends**: Symptom progression, mood patterns, medication effectiveness
- **Timeline Views**: Chronological health logs for caregivers and users
- **Smart Insights**: Pattern recognition for symptom triggers and improvement periods

## Project Structure

```
├── models/
│   ├── User.js              # User schema with medical profiles & emergency contacts
│   ├── HealthLog.js         # Health logs with keyword detection & medical analysis  
│   └── HealthTimer.js       # Check-in timers for emergency monitoring
├── routes/
│   ├── users.js             # User & emergency contact management
│   ├── healthLogs.js        # Health logging with transcription analysis
│   └── healthTimers.js      # Health timer management for VA
├── utils/
│   ├── database.js          # Database connection utility
│   └── transcriptionAnalyzer.js  # AI-powered keyword & medical entity detection
├── scripts/
│   └── generateSampleData.js     # Sample data with realistic health scenarios
├── docs/
│   ├── AUDIO_INTEGRATION_GUIDE.md     # Recording device integration
│   ├── MONGODB_ATLAS_SETUP.md         # Database setup guide
│   ├── VA_INTEGRATION_COMPLETE.md     # Complete Voice Assistant integration
│   └── SETUP.md                       # Quick setup guide for team
├── server.js                # Main application server with all routes
├── package.json             # Dependencies and scripts  
├── .env                     # Environment variables (MongoDB Atlas)
└── .gitignore              # Git ignore patterns
```

## API Endpoints

### Health Check
- `GET /` - API documentation and system overview
- `GET /api/health` - Server status

### User Management
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Device Management
- `POST /api/users/:id/devices` - Link device to user
- `DELETE /api/users/:id/devices/:deviceId` - Remove device

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
- `POST /api/health-logs` - Create health log (`report/create` → `report/finish`)
- `PUT /api/health-logs/:id` - Update health log
- `DELETE /api/health-logs/:id` - Delete health log
- `POST /api/health-logs/:id/process` - Mark log as processed with AI analysis
- `GET /api/health-logs/analytics/:userId` - Get health analytics for user

## Sample API Usage

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "profile": {
      "age": 30,
      "gender": "male"
    }
  }'
```

### Create a Health Log
```bash
curl -X POST http://localhost:3000/api/health-logs \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "transcription": "I have a headache today, feeling tired",
    "deviceId": "device_001",
    "healthData": {
      "symptoms": ["headache", "fatigue"],
      "severity": 6,
      "mood": "fair"
    }
  }'
```

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
