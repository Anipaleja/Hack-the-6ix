const WebSocket = require('ws');
const EventEmitter = require('events');

class RealTimeHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
    this.deviceConnections = new Map();
    this.alertThresholds = {
      heart_rate: { min: 50, max: 120, critical_min: 40, critical_max: 150 },
      blood_pressure: { 
        systolic: { min: 90, max: 140, critical_min: 80, critical_max: 180 },
        diastolic: { min: 60, max: 90, critical_min: 50, critical_max: 120 }
      },
      temperature: { min: 97.0, max: 99.5, critical_min: 95.0, critical_max: 103.0 },
      oxygen_saturation: { min: 95, max: 100, critical_min: 90, critical_max: 100 }
    };
  }

  initializeWebSocketServer(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/health-monitor' });

    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    return this.wss;
  }

  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        this.subscribeClient(ws, data.userId, data.subscriptions || ['all']);
        break;

      case 'device_register':
        this.registerDevice(ws, data.deviceId, data.userId);
        break;

      case 'biometric_data':
        this.processBiometricData(data);
        break;

      case 'health_log':
        this.processHealthLog(data);
        break;

      case 'emergency_alert':
        this.processEmergencyAlert(data);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Unknown message type: ${data.type}` 
        }));
    }
  }

  subscribeClient(ws, userId, subscriptions) {
    const clientId = this.generateClientId();
    
    this.clients.set(clientId, {
      ws,
      userId,
      subscriptions,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    ws.clientId = clientId;
    ws.send(JSON.stringify({
      type: 'subscription_confirmed',
      clientId,
      subscriptions
    }));

    console.log(`Client ${clientId} subscribed for user ${userId}`);
  }

  registerDevice(ws, deviceId, userId) {
    this.deviceConnections.set(deviceId, {
      ws,
      userId,
      deviceId,
      registeredAt: new Date(),
      status: 'connected'
    });

    ws.deviceId = deviceId;
    ws.send(JSON.stringify({
      type: 'device_registered',
      deviceId,
      status: 'connected'
    }));

    // Notify subscribed clients about device connection
    this.broadcastToUserClients(userId, {
      type: 'device_status_update',
      deviceId,
      status: 'connected',
      timestamp: new Date()
    });

    console.log(`Device ${deviceId} registered for user ${userId}`);
  }

  processBiometricData(data) {
    const { userId, deviceId, dataType, value, unit, timestamp } = data;

    // Real-time analysis
    const analysis = this.analyzeBiometricReading(dataType, value);
    
    // Broadcast to subscribed clients
    const message = {
      type: 'biometric_update',
      userId,
      deviceId,
      dataType,
      value,
      unit,
      timestamp: timestamp || new Date(),
      analysis,
      realTimeProcessed: true
    };

    this.broadcastToUserClients(userId, message);

    // Check for alerts
    if (analysis.alert) {
      this.triggerAlert(userId, {
        type: 'biometric_alert',
        severity: analysis.severity,
        dataType,
        value,
        message: analysis.alertMessage,
        timestamp: new Date()
      });
    }

    // Store in database (async, don't wait)
    this.storeBiometricData(data, analysis).catch(console.error);
  }

  processHealthLog(data) {
    const { userId, transcription, deviceId, timestamp } = data;

    // Real-time transcription analysis
    const TranscriptionAnalyzer = require('./transcriptionAnalyzer');
    const analyzer = new TranscriptionAnalyzer();
    const analysis = analyzer.analyzeTranscription(transcription);

    const message = {
      type: 'health_log_update',
      userId,
      deviceId,
      transcription,
      analysis,
      timestamp: timestamp || new Date(),
      realTimeProcessed: true
    };

    this.broadcastToUserClients(userId, message);

    // Check for concerning keywords
    if (analysis.urgencyLevel === 'high' || analysis.medicalEntities.emergencyKeywords.length > 0) {
      this.triggerAlert(userId, {
        type: 'keyword_alert',
        severity: 'high',
        keywords: analysis.medicalEntities.emergencyKeywords,
        transcription,
        message: 'Emergency keywords detected in voice log',
        timestamp: new Date()
      });
    }
  }

  processEmergencyAlert(data) {
    const { userId, type, severity = 'critical', message, location } = data;

    const alertData = {
      type: 'emergency_alert',
      userId,
      alertType: type,
      severity,
      message,
      location,
      timestamp: new Date(),
      alertId: this.generateAlertId()
    };

    // Broadcast to all clients for this user
    this.broadcastToUserClients(userId, alertData);

    // Also broadcast to emergency contacts if they're connected
    this.notifyEmergencyContacts(userId, alertData);

    console.log(`Emergency alert triggered for user ${userId}: ${message}`);
  }

  analyzeBiometricReading(dataType, value) {
    const thresholds = this.alertThresholds[dataType];
    if (!thresholds) {
      return { status: 'unknown', alert: false };
    }

    let status = 'normal';
    let severity = 'low';
    let alert = false;
    let alertMessage = '';

    if (dataType === 'blood_pressure') {
      // Special handling for blood pressure (assuming value is { systolic, diastolic })
      const { systolic, diastolic } = value;
      
      if (systolic < thresholds.systolic.critical_min || systolic > thresholds.systolic.critical_max ||
          diastolic < thresholds.diastolic.critical_min || diastolic > thresholds.diastolic.critical_max) {
        status = 'critical';
        severity = 'critical';
        alert = true;
        alertMessage = `Critical blood pressure reading: ${systolic}/${diastolic}`;
      } else if (systolic < thresholds.systolic.min || systolic > thresholds.systolic.max ||
                 diastolic < thresholds.diastolic.min || diastolic > thresholds.diastolic.max) {
        status = 'abnormal';
        severity = 'medium';
        alert = true;
        alertMessage = `Abnormal blood pressure reading: ${systolic}/${diastolic}`;
      }
    } else {
      // Standard numeric thresholds
      if (value < thresholds.critical_min || value > thresholds.critical_max) {
        status = 'critical';
        severity = 'critical';
        alert = true;
        alertMessage = `Critical ${dataType} reading: ${value}`;
      } else if (value < thresholds.min || value > thresholds.max) {
        status = 'abnormal';
        severity = 'medium';
        alert = true;
        alertMessage = `Abnormal ${dataType} reading: ${value}`;
      }
    }

    return {
      status,
      severity,
      alert,
      alertMessage,
      timestamp: new Date()
    };
  }

  triggerAlert(userId, alertData) {
    // Broadcast alert to all user clients
    this.broadcastToUserClients(userId, {
      ...alertData,
      type: 'health_alert'
    });

    // Store alert in database (async)
    this.storeAlert(userId, alertData).catch(console.error);

    // Emit event for external handlers
    this.emit('health_alert', { userId, ...alertData });
  }

  broadcastToUserClients(userId, message) {
    const userClients = Array.from(this.clients.values())
      .filter(client => client.userId === userId && client.ws.readyState === WebSocket.OPEN);

    userClients.forEach(client => {
      // Check if client is subscribed to this type of message
      if (client.subscriptions.includes('all') || 
          client.subscriptions.includes(message.type)) {
        
        try {
          client.ws.send(JSON.stringify(message));
          client.lastActivity = new Date();
        } catch (error) {
          console.error(`Error sending message to client ${client.ws.clientId}:`, error);
          this.handleClientDisconnect(client.ws);
        }
      }
    });
  }

  async notifyEmergencyContacts(userId, alertData) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (user && user.emergencyContacts) {
        // In a real implementation, this would send SMS/email notifications
        console.log(`Notifying ${user.emergencyContacts.length} emergency contacts for user ${userId}`);
        
        // For now, just broadcast to any connected emergency contact clients
        user.emergencyContacts.forEach(contact => {
          // This would be implemented with actual notification service
          console.log(`Emergency notification sent to ${contact.name} (${contact.phone})`);
        });
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }

  handleClientDisconnect(ws) {
    if (ws.clientId) {
      this.clients.delete(ws.clientId);
      console.log(`Client ${ws.clientId} disconnected`);
    }

    if (ws.deviceId) {
      const device = this.deviceConnections.get(ws.deviceId);
      if (device) {
        device.status = 'disconnected';
        
        // Notify subscribed clients about device disconnection
        this.broadcastToUserClients(device.userId, {
          type: 'device_status_update',
          deviceId: ws.deviceId,
          status: 'disconnected',
          timestamp: new Date()
        });
      }
      console.log(`Device ${ws.deviceId} disconnected`);
    }
  }

  async storeBiometricData(data, analysis) {
    try {
      const BiometricData = require('../models/BiometricData');
      const biometricData = new BiometricData({
        userId: data.userId,
        deviceId: data.deviceId,
        dataType: data.dataType,
        value: data.value,
        unit: data.unit,
        aiAnalysis: {
          status: analysis.status,
          anomalyScore: analysis.status === 'critical' ? 1.0 : analysis.status === 'abnormal' ? 0.7 : 0.2
        },
        isProcessed: true
      });
      
      await biometricData.save();
    } catch (error) {
      console.error('Error storing biometric data:', error);
    }
  }

  async storeAlert(userId, alertData) {
    try {
      // Store in a hypothetical alerts collection
      console.log('Alert stored:', { userId, ...alertData });
    } catch (error) {
      console.error('Error storing alert:', error);
    }
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  generateAlertId() {
    return 'alert_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Health monitoring statistics
  getMonitoringStats() {
    return {
      connectedClients: this.clients.size,
      connectedDevices: this.deviceConnections.size,
      activeDevices: Array.from(this.deviceConnections.values())
        .filter(device => device.status === 'connected').length,
      uptime: process.uptime()
    };
  }

  // Clean up inactive connections
  cleanupConnections() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    // Clean up inactive clients
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > timeout) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
        this.clients.delete(clientId);
        console.log(`Cleaned up inactive client ${clientId}`);
      }
    }

    // Clean up disconnected devices
    for (const [deviceId, device] of this.deviceConnections.entries()) {
      if (device.status === 'disconnected' && now - device.registeredAt > timeout) {
        this.deviceConnections.delete(deviceId);
        console.log(`Cleaned up inactive device ${deviceId}`);
      }
    }
  }
}

module.exports = RealTimeHealthMonitor;
