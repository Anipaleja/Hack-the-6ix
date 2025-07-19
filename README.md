# Hack-the-6ix - Health Logging Backend

A Node.js backend API for a health logging device that transcribes user voice input and stores health-related data.

## Features

- **MongoDB Integration**: Full database layer for users and health logs
- **RESTful API**: Complete CRUD operations for users and health logs  
- **Health Analytics**: Basic analytics and mood tracking
- **Voice Transcription Support**: Store and manage transcribed health logs
- **User Management**: User profiles with medical history and device management
- **Sample Data Generation**: Script to populate database with demo data

## Project Structure

```
├── models/
│   ├── User.js          # User schema with profile and medical data
│   └── HealthLog.js     # Health log schema for transcriptions
├── routes/
│   ├── users.js         # User management endpoints
│   └── healthLogs.js    # Health log endpoints and analytics
├── scripts/
│   └── generateSampleData.js  # Generate sample users and logs
├── utils/
│   └── database.js      # Database connection utility
├── server.js            # Main application server
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables
└── .gitignore          # Git ignore patterns
```

## Installation

1. **Clone the repository**
   ```bash
   git clone 
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env` file and update MongoDB connection string
   - For local MongoDB: `MONGODB_URI=mongodb://localhost:27017/hack-the-6ix`
   - For MongoDB Atlas: Update with your cloud connection string

4. **Install and start MongoDB locally (if using local setup)**
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb/brew/mongodb-community
   ```

## Usage

### Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

### Generate Sample Data

```bash
node scripts/generateSampleData.js
```

This creates sample users and health logs for testing.

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Users
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `POST /api/users/:id/devices` - Add device to user
- `DELETE /api/users/:id/devices/:deviceId` - Remove device

### Health Logs
- `GET /api/health-logs/user/:userId` - Get logs for user (paginated, filterable by date)
- `GET /api/health-logs/:id` - Get single health log
- `POST /api/health-logs` - Create new health log
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

## Next Steps (TODOs)

Based on your team's requirements:

1. **Discuss with Isabel**: Determine exact log structure and required fields
2. **Discuss with Swastik**: Define historical health data storage format
3. **Add Authentication**: JWT tokens for API security
4. **File Upload**: Support for audio file storage
5. **AI Integration**: Connect transcription and health analysis services
6. **Real-time Features**: WebSocket support for live device communication

## Team Integration

- **Backend Setup**: ✅ Complete (MongoDB + API routes)
- **Sample Logs**: ✅ Generated via script
- **Isabel Discussion**: 📋 Pending (log structure requirements)
- **Swastik Discussion**: 📋 Pending (historical data format)
