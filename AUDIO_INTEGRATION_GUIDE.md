# Audio Recording Integration Guide

### Current Backend Capabilities

**What's Already Built:**
- **Transcription Storage**: Save spoken text with timestamps
- **Audio File References**: Store paths/URLs to original audio files
- **Keyword Detection**: Automatic extraction of medical terms, symptoms, emotions
- **Medical Entity Recognition**: Detect dosages, medications, body parts
- **Time Context Analysis**: Morning/evening, duration, frequency patterns
- **Severity & Mood Detection**: Automatic scoring from speech patterns
- **User Timeline**: Complete chronological health logs per user

### Integration Options

#### Option 1: Direct Device Integration
```javascript
// From your recording device, POST to your API:
const transcriptionData = {
  userId: "user_id_here",
  transcription: "I have a headache this morning, about a 7 out of 10",
  audioFile: "/audio/recordings/user123_20250719_0930.wav", // File path
  deviceId: "device_001",
  metadata: {
    duration: 45,      // seconds
    confidence: 0.85,  // transcription confidence
    language: "en"
  }
};

fetch('http://localhost:3000/api/health-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(transcriptionData)
});
```

#### Option 2: Two-Step Process (Audio + Transcription)
```javascript
// Step 1: Upload audio file first
const audioFormData = new FormData();
audioFormData.append('audioFile', audioBlob);
audioFormData.append('userId', userId);
audioFormData.append('deviceId', deviceId);

// Step 2: Send transcription with reference to audio
const transcriptionData = {
  userId: userId,
  transcription: transcribedText,
  audioFile: audioFileUrl, // From step 1
  metadata: { duration, confidence, language }
};
```

### What Happens Automatically

When you send a transcription, the backend automatically:

1. **Extracts Keywords**: 
   - Symptoms: "headache", "pain", "nausea"
   - Body parts: "head", "stomach", "back"
   - Emotions: "anxious", "stressed", "happy"
   - Time context: "morning", "after eating", "for 2 hours"

2. **Detects Medical Information**:
   - Severity levels (1-10 scale)
   - Medication mentions and dosages
   - Frequency patterns ("daily", "twice a week")

3. **Generates Timeline Data**:
   - Exact timestamps for each recording
   - User activity patterns
   - Symptom progression over time

### Frontend Integration 

The analyzed data enables rich frontend displays:

```javascript
// Example of what your frontend will receive:
{
  "transcription": "I have a terrible headache this morning, about a 9 out of 10",
  "timestamp": "2025-07-19T09:30:00Z",
  "healthData": {
    "symptoms": ["headache"],
    "severity": 9,
    "mood": "poor",
    "detectedKeywords": [
      {
        "word": "terrible",
        "category": "severity", 
        "confidence": 0.9,
        "position": 10
      },
      {
        "word": "headache",
        "category": "symptom",
        "confidence": 0.95,
        "position": 18
      }
    ],
    "timeContext": {
      "when": "morning",
      "duration": null,
      "frequency": null
    }
  }
}
```

### Recording Device Setup

#### For Hardware Devices (Arduino/Raspberry Pi)
```python
# Python example for device integration
import requests
import json
from datetime import datetime

def send_health_log(user_id, transcription_text, audio_file_path, device_id):
    url = "http://your-server.com/api/health-logs"
    
    data = {
        "userId": user_id,
        "transcription": transcription_text,
        "audioFile": audio_file_path,
        "deviceId": device_id,
        "metadata": {
            "duration": get_audio_duration(audio_file_path),
            "confidence": 0.85,  # From your speech-to-text service
            "language": "en"
        }
    }
    
    response = requests.post(url, json=data)
    return response.json()
```

#### For Mobile Apps
```javascript
// React Native / Mobile app integration
const recordAndAnalyze = async () => {
  // 1. Record audio
  const audioUri = await startRecording();
  
  // 2. Transcribe (using device speech-to-text or cloud service)
  const transcription = await transcribeAudio(audioUri);
  
  // 3. Send to your backend
  const result = await fetch('http://localhost:3000/api/health-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      transcription: transcription.text,
      audioFile: audioUri,
      deviceId: deviceInfo.id,
      metadata: {
        duration: transcription.duration,
        confidence: transcription.confidence,
        language: 'en'
      }
    })
  });
  
  const analyzed = await result.json();
  // Now you have analyzed health data with keywords!
};
```

### Testing 

1. **Test Transcription Analysis** (without saving):
```bash
curl -X POST http://localhost:3000/api/health-logs/analyze \
  -H "Content-Type: application/json" \
  -d '{"transcription":"I have a severe headache this morning, about an 8 out of 10. Took 400mg of ibuprofen 2 hours ago but still feeling terrible."}'
```

2. **Create Full Health Log**:
```bash
curl -X POST http://localhost:3000/api/health-logs \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"USER_ID_HERE", 
    "transcription":"My back pain is getting worse, especially when I sit at work. Its been bothering me for 3 days now.",
    "deviceId":"device_001"
  }'
```

### Frontend Dashboard Features

Your frontend can now display:

- **Timeline View**: All recordings with timestamps
- **Keyword Highlights**: Visual highlighting of detected medical terms
- **Trend Analysis**: Symptom severity over time
- **Quick Insights**: "Most mentioned symptom this week: headache"
- **Pattern Detection**: "Symptoms typically occur in the morning"
- **Caregiver Summary**: Clean, organized health reports

### Security & Privacy

**Already implemented:**
- Secure MongoDB storage
- API validation
- Error handling

**Recommended additions:**
- Audio file encryption
- User authentication (JWT tokens)
- HIPAA-compliant data handling
- Automatic data retention policies


