# Hack-the-6ix - Health Companion Backend

**Backend API for a comprehensive health companion system featuring voice assistant, physical device integration, and medical logging capabilities.**

## 🎯 Project Overview

This backend is part of a larger **AI-powered health companion ecosystem**:

- **🧸 Physical Device**: Panda plushie with Raspberry Pi, microphone, speakers, and LED indicators
- **🎤 Voice Assistant**: Python/Docker-based VA with wake word detection and Deepgram transcription
- **🤖 AI Processing**: Vellum + Gemini integration for intent classification and response generation
- **🌐 Web Frontend**: React dashboard for viewing logs and managing emergency contacts
- **📱 iPhone App**: Apple Watch integration for detailed health analytics
- **🗄️ Backend API**: This Node.js service - handles data storage, analysis, and API endpoints

## ✨ Enhanced Features

### 🧠 **Intelligent Transcription Analysis**
- **Automatic Keyword Detection**: Extracts symptoms, medications, body parts, emotions
- **Medical Entity Recognition**: Identifies dosages, frequencies, medical conditions
- **Severity & Mood Analysis**: Auto-detects pain levels (1-10) and emotional states
- **Time Context Extraction**: Understanding of "morning", "after meals", duration patterns

### 🎤 **Voice Assistant Integration**
- **Logging Intent Support**: Handles VA's 'logging' intent to store transcribed health data
- **Emergency Contact Management**: API endpoints for emergency contacts (create/remove)
- **Timer Integration**: Support for health check-in timers and notifications
- **Real-time Processing**: Instant keyword analysis when VA sends transcription data

### 📊 **Comprehensive Health Analytics**
- **Historical Trends**: Symptom progression, mood patterns, medication effectiveness
- **Timeline Views**: Chronological health logs for caregivers and users
- **Smart Insights**: Pattern recognition for symptom triggers and improvement periods

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Panda Plushie │    │  Voice Assistant │    │   Backend API       │
│                 │    │                  │    │                     │
│ • Raspberry Pi  │◄──►│ • Wake Word      │◄──►│ • MongoDB Storage   │
│ • Microphone    │    │ • Deepgram STT   │    │ • Keyword Analysis  │
│ • Speakers      │    │ • Gemini LLM     │    │ • Health Analytics  │
│ • LED Display   │    │ • Intent Router  │    │ • Emergency Contacts│
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         ▲                        ▲                         ▲
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  iPhone App     │    │   React Frontend │    │    Apple Watch      │
│                 │    │                  │    │                     │
│ • Privacy Toggle│    │ • Log Viewer     │    │ • Health Metrics    │
│ • Watch Bridge  │    │ • Timeline View  │    │ • Sensor Data       │
│ • API Config    │    │ • Contact Mgmt   │    │ • Auto Sync         │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 🎯 Voice Assistant Integration

## 📁 Project Structure

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

## 📡 API Endpoints

### 🏥 Health Check
- `GET /` - API documentation and system overview
- `GET /api/health` - Server status

### 👥 User Management
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### 🔗 Device Management
- `POST /api/users/:id/devices` - Link device to user
- `DELETE /api/users/:id/devices/:deviceId` - Remove device

### 🚨 Emergency Contacts (VA Integration)
- `GET /api/users/:id/emergency-contacts` - Get user's emergency contacts
- `POST /api/users/:id/emergency-contacts` - Add emergency contact (`emergency_contacts/create`)
- `PUT /api/users/:id/emergency-contacts/:contactId` - Update contact
- `DELETE /api/users/:id/emergency-contacts/:contactId` - Remove contact (`emergency_contacts/remove`)

### ⏰ Health Timers (VA Integration)
- `GET /api/health-timers/user/:userId` - Get user's timers
- `POST /api/health-timers` - Create check-in timer (`check_in_timer/create`)
- `PUT /api/health-timers/:id/complete` - Complete timer (`check_in_timer/stop`)
- `PUT /api/health-timers/:id/cancel` - Cancel timer
- `GET /api/health-timers/system/expired` - Get expired timers (for alerts)

### 📝 Health Logs (VA Integration)
- `GET /api/health-logs/user/:userId` - Get logs for user (timeline view)
- `POST /api/health-logs/analyze` - Analyze transcription (testing)
- `POST /api/health-logs` - Create health log (`report/create` → `report/finish`)
- `PUT /api/health-logs/:id` - Update health log
- `DELETE /api/health-logs/:id` - Delete health log
- `GET /api/health-logs/analytics/:userId` - Get health analytics

## 🎤 Voice Assistant Integration Examples

### Logging Intent Flow
```python
# Voice Assistant Python code
def handle_logging_intent(user_id, transcription_text, device_id):
    url = "http://your-backend.com/api/health-logs"
    payload = {
        "userId": user_id,
        "transcription": transcription_text,
        "deviceId": device_id  # "panda_device_001"
    }
    response = requests.post(url, json=payload)
    return response.json()  # Returns analyzed keywords, symptoms, severity
```

### Emergency Contact Management
```python
# Add contact via VA
def add_emergency_contact(user_id, name, phone_number, email=None, is_family=False):
    url = f"http://your-backend.com/api/users/{user_id}/emergency-contacts"
    payload = {
        "name": name,
        "phoneNumber": phone_number,
        "email": email,
        "isFamily": is_family
    }
    return requests.post(url, json=payload)

# Remove contact via VA
def remove_emergency_contact(user_id, contact_name):
    # First, get contacts to find the ID
    contacts = requests.get(f"http://your-backend.com/api/users/{user_id}/emergency-contacts")
    contact = next((c for c in contacts.json()['contacts'] if c['name'].lower() == contact_name.lower()), None)
    
    if contact:
        return requests.delete(f"http://your-backend.com/api/users/{user_id}/emergency-contacts/{contact['_id']}")
    return {"error": "Contact not found"}
```

### Health Timer Management
```python
# Create check-in timer
def create_health_timer(user_id, timer_name, duration_minutes):
    url = "http://your-backend.com/api/health-timers"
    payload = {
        "userId": user_id,
        "name": timer_name,
        "duration": duration_minutes,
        "timerType": "check_in",
        "deviceId": "panda_device_001"
    }
    return requests.post(url, json=payload)

# Complete timer (user checked in)
def complete_timer(timer_id, notes=None):
    url = f"http://your-backend.com/api/health-timers/{timer_id}/complete"
    payload = {"notes": notes} if notes else {}
    return requests.put(url, json=payload)
```
