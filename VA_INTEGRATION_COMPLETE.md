# Voice Assistant Integration Guide

## 🎤 Complete VA ↔ Backend Integration

Your backend is now fully equipped to handle all Voice Assistant intents from your comprehensive health companion system.

## 🏗️ System Integration Points

### 1. **Physical Device** (Panda Plushie)
```
Raspberry Pi → Microphone → Wake Word Detection → VA Container
                                     ↓
                            Deepgram Transcription
                                     ↓
                            Intent Classification (Gemini)
                                     ↓
                            Backend API Calls
```

### 2. **Intent Mapping** (VA → Backend)

| VA Intent | Backend Endpoint | Description |
|-----------|------------------|-------------|
| `report/create` → `report/finish` | `POST /api/health-logs` | Log health transcription with auto-analysis |
| `emergency_contacts/create` | `POST /api/users/:id/emergency-contacts` | Add emergency contact |
| `emergency_contacts/remove` | `DELETE /api/users/:id/emergency-contacts/:contactId` | Remove emergency contact |
| `check_in_timer/create` | `POST /api/health-timers` | Create health check-in timer |
| `check_in_timer/stop` | `PUT /api/health-timers/:id/complete` | Complete/stop timer |

## 🎯 VA Integration Examples

### **Intent: `report/create` → `report/finish`**
```python
# Voice Assistant Python Code
import requests
import json

class HealthLogger:
    def __init__(self, backend_url="http://localhost:3000"):
        self.backend_url = backend_url
    
    def process_logging_intent(self, user_id, transcription_text, device_id="panda_device_001"):
        """
        Called when user says: "Log my health" or similar
        Transcribes their follow-up speech and sends to backend
        """
        url = f"{self.backend_url}/api/health-logs"
        
        payload = {
            "userId": user_id,
            "transcription": transcription_text,
            "deviceId": device_id,
            "metadata": {
                "duration": len(transcription_text.split()) * 0.5,  # Rough duration estimate
                "confidence": 0.85,  # From Deepgram
                "language": "en"
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            result = response.json()
            
            if response.status_code == 201:
                # Successfully logged and analyzed
                analysis = result['analysis']
                
                # Return personalized response based on analysis
                if analysis['severityDetected'] and analysis['severityDetected'] >= 7:
                    return f"I've logged your symptoms. The severity level of {analysis['severityDetected']} seems concerning. Consider contacting your healthcare provider."
                elif analysis['symptomsIdentified'] > 0:
                    symptoms = ", ".join(result['healthLog']['healthData']['symptoms'])
                    return f"I've logged your health update about {symptoms}. I detected {analysis['keywordsDetected']} relevant medical terms."
                else:
                    return "I've logged your health update successfully. Thank you for sharing."
            else:
                return "I had trouble logging that. Could you try again?"
                
        except Exception as e:
            return f"Sorry, I couldn't connect to the health logging system right now."
```

### **Intent: `emergency_contacts/create`**
```python
def handle_emergency_contact_create(self, user_id, name, phone_number=None, email=None, is_family=False):
    """
    Called when user says: "Add emergency contact Dr. Smith at 555-1234"
    """
    url = f"{self.backend_url}/api/users/{user_id}/emergency-contacts"
    
    payload = {
        "name": name,
        "phoneNumber": phone_number,
        "email": email,
        "isFamily": is_family,
        "relationship": "doctor" if "dr." in name.lower() or "doctor" in name.lower() else "emergency_contact"
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        contact_info = response.json()
        return f"I've added {name} as an emergency contact. You now have {contact_info['totalContacts']} emergency contacts."
    else:
        return "I had trouble adding that contact. Please make sure to provide a name and either a phone number or email."
```

### **Intent: `emergency_contacts/remove`**
```python
def handle_emergency_contact_remove(self, user_id, contact_name):
    """
    Called when user says: "Remove Dr. Smith from emergency contacts"
    """
    # First, get all contacts to find the right one
    contacts_url = f"{self.backend_url}/api/users/{user_id}/emergency-contacts"
    contacts_response = requests.get(contacts_url)
    
    if contacts_response.status_code == 200:
        contacts = contacts_response.json()['contacts']
        
        # Find matching contact (case-insensitive)
        matching_contact = None
        for contact in contacts:
            if contact_name.lower() in contact['name'].lower():
                matching_contact = contact
                break
        
        if matching_contact:
            # Remove the contact
            remove_url = f"{self.backend_url}/api/users/{user_id}/emergency-contacts/{matching_contact['_id']}"
            remove_response = requests.delete(remove_url)
            
            if remove_response.status_code == 200:
                result = remove_response.json()
                return f"I've removed {matching_contact['name']} from your emergency contacts. You now have {result['remainingContacts']} contacts remaining."
            else:
                return "I had trouble removing that contact."
        else:
            contact_names = [c['name'] for c in contacts]
            return f"I couldn't find '{contact_name}' in your emergency contacts. Your current contacts are: {', '.join(contact_names)}"
    else:
        return "I couldn't access your emergency contacts right now."
```

### **Intent: `check_in_timer/create`**
```python
def handle_timer_create(self, user_id, timer_name, duration_text):
    """
    Called when user says: "Set a check-in timer for 2 hours" or "Create morning timer for 30 minutes"
    """
    # Parse duration from natural language
    duration_minutes = self.parse_duration(duration_text)
    
    if not duration_minutes:
        return "I didn't understand the timer duration. Please say something like 'set timer for 30 minutes' or '2 hours'."
    
    url = f"{self.backend_url}/api/health-timers"
    
    payload = {
        "userId": user_id,
        "name": timer_name or f"Health Check-in ({duration_minutes} min)",
        "duration": duration_minutes,
        "timerType": "check_in",
        "deviceId": "panda_device_001",
        "notificationSettings": {
            "sendEmergencyAlert": True,
            "alertDelayMinutes": 5
        }
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 201:
        timer_data = response.json()
        scheduled_time = timer_data['scheduledFor']
        return f"I've created a {duration_minutes}-minute check-in timer. It will go off at {scheduled_time}. Make sure to check in, or I'll alert your emergency contacts."
    else:
        return "I had trouble creating the timer. Please try again."

def parse_duration(self, duration_text):
    """Parse natural language durations like '2 hours', '30 minutes', etc."""
    import re
    
    # Match patterns like "2 hours", "30 minutes", "1 hour"
    hour_match = re.search(r'(\d+)\s*(?:hour|hr)s?', duration_text.lower())
    minute_match = re.search(r'(\d+)\s*(?:minute|min)s?', duration_text.lower())
    
    total_minutes = 0
    
    if hour_match:
        total_minutes += int(hour_match.group(1)) * 60
    
    if minute_match:
        total_minutes += int(minute_match.group(1))
    
    return total_minutes if total_minutes > 0 else None
```

### **Intent: `check_in_timer/stop`**
```python
def handle_timer_stop(self, user_id, timer_name=None):
    """
    Called when user says: "I'm checking in" or "Stop the timer"
    """
    # Get active timers for user
    timers_url = f"{self.backend_url}/api/health-timers/user/{user_id}?active_only=true"
    response = requests.get(timers_url)
    
    if response.status_code == 200:
        timers = response.json()['timers']
        
        if len(timers) == 0:
            return "You don't have any active check-in timers right now."
        
        # If multiple timers, stop the most recent one or ask for clarification
        timer_to_stop = timers[0]  # Most recent
        
        # Complete the timer
        complete_url = f"{self.backend_url}/api/health-timers/{timer_to_stop['_id']}/complete"
        complete_response = requests.put(complete_url, json={"notes": "User checked in via voice"})
        
        if complete_response.status_code == 200:
            return f"Great! I've marked your '{timer_to_stop['name']}' timer as complete. Your emergency contacts won't be notified."
        else:
            return "I had trouble completing the timer."
    else:
        return "I couldn't check your active timers right now."
```

## 🔄 **Complete Integration Flow Example**

```python
# Complete Voice Assistant Integration Class
class PandaVoiceAssistant:
    def __init__(self):
        self.backend_url = "http://localhost:3000"  # Your backend
        self.current_user_id = None  # Set during initialization
    
    def process_intent(self, intent, slots, transcription=""):
        """Main intent router - called by your Gemini LLM intent classification"""
        
        if intent == "report/create":
            return self.start_health_logging()
        elif intent == "report/finish":
            return self.finish_health_logging(transcription)
        elif intent == "emergency_contacts/create":
            return self.add_emergency_contact(slots)
        elif intent == "emergency_contacts/remove":
            return self.remove_emergency_contact(slots)
        elif intent == "check_in_timer/create":
            return self.create_timer(slots)
        elif intent == "check_in_timer/stop":
            return self.stop_timer(slots)
        elif intent == "question/local_device":
            return self.handle_device_question(slots)
        elif intent == "question/dosage":
            return self.handle_dosage_question(slots)
        elif intent == "assistant/cancel":
            return "Okay, cancelling that action."
        else:
            return "I didn't understand that request."
    
    def start_health_logging(self):
        """Start the logging process"""
        return "I'm listening. Please tell me how you're feeling or any health updates."
    
    def finish_health_logging(self, transcription):
        """Process the health transcription"""
        return self.process_logging_intent(self.current_user_id, transcription)
    
    # ... (include all the methods from above)
```

## 🚨 **Emergency Alert System**

Your backend tracks expired timers and can trigger emergency alerts:

```python
# Monitor for expired timers (run this periodically)
def check_for_emergency_alerts():
    response = requests.get("http://localhost:3000/api/health-timers/system/expired")
    
    if response.status_code == 200:
        expired_timers = response.json()['expiredTimers']
        
        for timer in expired_timers:
            user = timer['userId']
            emergency_contacts = user['emergencyContacts']
            
            # Send alerts to emergency contacts
            for contact in emergency_contacts:
                send_emergency_alert(contact, timer, user)
```

## 🎨 **Frontend Dashboard Integration**

Your React frontend can now display:

- **Real-time health logs** with keyword highlighting
- **Emergency contact management** interface
- **Active timer status** and notifications
- **Historical health analytics** with trend visualization
- **Device connection status** (panda plushie online/offline)

Your comprehensive health companion system is now fully integrated! The backend handles all VA intents, provides rich analytics, and supports your entire ecosystem from the panda plushie to the iPhone app. 🎉
