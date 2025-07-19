# Google Fit Integration Setup Guide

## Overview
This guide will help you integrate Google Fit data into your quantum-secured health companion system. The integration provides secure access to fitness data including steps, distance, calories, heart rate, and sleep information.

## Prerequisites
- Google Cloud Console account
- Node.js application with quantum security system already set up
- MongoDB database connection

## Setup Steps

### 1. Google Cloud Console Setup

#### Enable Google Fitness API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Fitness API"
4. Click **Enable**

#### Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (for testing)
3. Fill in required information:
   - App name: "Health Companion"
   - User support email: Your email
   - Developer contact information: Your email
4. Add your Google account as a **Test user** in the test users section

#### Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure authorized URLs:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/google-fit/oauth2callback`
     - `http://127.0.0.1:3000/api/google-fit/oauth2callback`

5. Click **CREATE**
6. **Download the JSON file** and save it as `client_secret.json` in your project root directory

### 2. Environment Configuration

Add to your `.env` file:
```env
# Google Fit Integration
GOOGLE_FIT_REDIRECT_URI=http://localhost:3000/api/google-fit/oauth2callback
```

### 3. Project Structure
Your project should now have these files:
```
your-project/
├── client_secret.json          # Google OAuth credentials (do not commit!)
├── services/
│   ├── googleFitService.js     # Google Fit API service
│   └── googleFitSyncService.js # Automatic sync service
├── models/
│   ├── GoogleFitData.js        # Google Fit data model
│   └── SecureHealthData.js     # Quantum-encrypted health data
├── routes/
│   └── googleFit.js           # Google Fit API endpoints
└── server.js                   # Main server with Google Fit integration
```

### 4. API Endpoints

#### Authentication Flow
1. **Get Authorization URL**: `GET /api/google-fit/authorize?userId=USER_ID`
2. **OAuth Callback**: `GET /api/google-fit/oauth2callback` (automatic)
3. **Check Status**: `GET /api/google-fit/status?userId=USER_ID`

#### Data Access
- **Manual Sync**: `POST /api/google-fit/sync` with `{"userId": "USER_ID"}`
- **Get Summary**: `GET /api/google-fit/data?userId=USER_ID&type=summary`
- **Get Activity Data**: `GET /api/google-fit/data?userId=USER_ID&type=activity&days=7`
- **Get Sleep Data**: `GET /api/google-fit/data?userId=USER_ID&type=sleep&days=7`
- **Get Analytics**: `GET /api/google-fit/analytics?userId=USER_ID&period=30d`

#### Management
- **Disconnect**: `DELETE /api/google-fit/disconnect` with `{"userId": "USER_ID"}`

## Security Features

### Quantum-Level Security
- **OAuth tokens** are encrypted using quantum-grade AES-256-GCM encryption
- **Fitness data** is stored in quantum-secured format with blockchain verification
- **Zero-knowledge proofs** for data access control
- **Homomorphic encryption** for privacy-preserving analytics

### Data Protection
- All Google Fit data is encrypted before storage
- Blockchain integrity proofs for all fitness data
- Automatic key rotation and quantum entropy generation
- Privacy settings per user (personal, medical_team, emergency_only, research_anonymized)

## Testing the Integration

### 1. Start the Server
```bash
npm start
```

### 2. Connect Google Fit Account
```bash
# Get authorization URL
curl "http://localhost:3000/api/google-fit/authorize?userId=YOUR_USER_ID"

# Visit the returned authUrl in your browser
# Complete Google OAuth flow
# You'll be redirected back to your callback URL
```

### 3. Test Data Sync
```bash
# Check connection status
curl "http://localhost:3000/api/google-fit/status?userId=YOUR_USER_ID"

# Manual sync
curl -X POST "http://localhost:3000/api/google-fit/sync" \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'

# Get fitness summary
curl "http://localhost:3000/api/google-fit/data?userId=YOUR_USER_ID&type=summary"
```

## Automatic Sync

The system includes automatic background syncing:
- **Hourly sync**: Updates activity data every hour
- **Daily sync**: Comprehensive sync at 2 AM daily
- **Cleanup task**: Removes old data every 6 hours
- **Rate limiting**: Respects Google API rate limits

## Troubleshooting

### Common Issues

#### 1. "client_secret.json not found"
- Ensure you downloaded the OAuth credentials from Google Cloud Console
- Place the file in your project root directory
- File should be named exactly `client_secret.json`

#### 2. "invalid_grant" or "unauthorized" errors
- Check that your redirect URIs match exactly in Google Cloud Console
- Ensure your OAuth consent screen is configured correctly
- Add your Google account as a test user

#### 3. "Token expired" errors
- Tokens automatically refresh, but you may need to re-authorize
- Check the sync status: `GET /api/google-fit/status`
- Re-run the authorization flow if needed

#### 4. "API not enabled" errors
- Ensure Google Fitness API is enabled in Google Cloud Console
- Check that you're using the correct project in Google Cloud Console

### Data Privacy Notes
- Google Fit data is fetched with user consent only
- All data is quantum-encrypted before storage
- Users can disconnect and delete their data anytime
- Blockchain proofs ensure data integrity
- Zero-knowledge analytics protect user privacy

## Production Deployment

For production deployment:
1. Use HTTPS URLs for redirect URIs
2. Set `OAUTHLIB_INSECURE_TRANSPORT=0` (remove HTTP support)
3. Use production OAuth consent screen (not test mode)
4. Implement proper token refresh handling
5. Set up monitoring for sync failures
6. Configure proper rate limiting
7. Use secure session management

## Integration with Existing Features

The Google Fit integration works seamlessly with your existing quantum security system:
- **Health logs**: Fitness data can be correlated with voice health reports
- **AI insights**: ML models can use fitness data for better health predictions
- **Real-time monitoring**: WebSocket updates include fitness metrics
- **Analytics**: Quantum-secured analytics include fitness trends
- **Biometric data**: Combines with existing health monitoring sensors

Your hackathon project now has advanced fitness tracking with quantum-level security!
