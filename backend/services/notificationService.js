const admin = require('firebase-admin');
const webpush = require('web-push');

class NotificationService {
  constructor(io) {
    this.io = io;
    
    // Initialize Firebase Admin SDK for push notifications
    if (!admin.apps.length) {
      try {
        // In production, use service account key file
        // For now, we'll use environment variables
        admin.initializeApp({
          credential: admin.credential.cert({
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
          })
        });
      } catch (error) {
        console.warn('Firebase Admin SDK not initialized:', error.message);
      }
    }

    // Initialize Web Push
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.CONTACT_EMAIL || 'admin@healthapp.com'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  async sendToUser(userId, notificationData) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const results = await Promise.allSettled([
        this.sendFirebaseNotification(user, notificationData),
        this.sendWebPushNotification(user, notificationData),
        this.sendSocketNotification(user, notificationData)
      ]);

      console.log(`📱 Sent notifications to ${user.firstName}: ${results.filter(r => r.status === 'fulfilled').length}/3 successful`);
      
      return results;
    } catch (error) {
      console.error('Error sending notifications to user:', error);
      throw error;
    }
  }

  async sendFirebaseNotification(user, notificationData) {
    try {
      if (!admin.apps.length) {
        throw new Error('Firebase not initialized');
      }

      const tokens = user.deviceTokens?.firebase?.filter(token => token && token.trim() !== '') || [];
      
      if (tokens.length === 0) {
        return { success: false, reason: 'No Firebase tokens' };
      }

      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.body
        },
        data: notificationData.data || {},
        android: {
          priority: notificationData.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: notificationData.sound || 'default',
            channelId: 'medication_reminders',
            priority: notificationData.priority === 'high' ? 'high' : 'default',
            vibrate: notificationData.vibration ? '1000' : '0'
          }
        },
        apns: {
          headers: {
            'apns-priority': notificationData.priority === 'high' ? '10' : '5'
          },
          payload: {
            aps: {
              alert: {
                title: notificationData.title,
                body: notificationData.body
              },
              sound: notificationData.sound || 'default',
              badge: 1
            }
          }
        },
        tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && 
              (resp.error.code === 'messaging/invalid-registration-token' ||
               resp.error.code === 'messaging/registration-token-not-registered')) {
            invalidTokens.push(tokens[idx]);
          }
        });
        
        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(user._id, 'firebase', invalidTokens);
        }
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Firebase notification error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWebPushNotification(user, notificationData) {
    try {
      const subscriptions = user.deviceTokens?.webPush || [];
      
      if (subscriptions.length === 0) {
        return { success: false, reason: 'No web push subscriptions' };
      }

      const payload = JSON.stringify({
        title: notificationData.title,
        body: notificationData.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: notificationData.vibration ? [200, 100, 200] : [],
        data: notificationData.data || {},
        actions: [
          {
            action: 'acknowledge',
            title: 'Take Medication'
          },
          {
            action: 'snooze',
            title: 'Snooze 15 min'
          }
        ]
      });

      const options = {
        urgency: notificationData.priority === 'high' ? 'high' : 'normal',
        TTL: 3600 // 1 hour
      };

      const results = await Promise.allSettled(
        subscriptions.map(subscription => 
          webpush.sendNotification(subscription, payload, options)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedSubscriptions = [];

      results.forEach((result, idx) => {
        if (result.status === 'rejected' && 
            (result.reason.statusCode === 410 || result.reason.statusCode === 404)) {
          failedSubscriptions.push(subscriptions[idx]);
        }
      });

      // Clean up expired subscriptions
      if (failedSubscriptions.length > 0) {
        await this.removeExpiredWebPushSubscriptions(user._id, failedSubscriptions);
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount: results.length - successCount
      };

    } catch (error) {
      console.error('Web push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSocketNotification(user, notificationData) {
    try {
      if (!this.io) {
        return { success: false, reason: 'Socket.IO not available' };
      }

      const socketData = {
        type: 'notification',
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        timestamp: new Date(),
        priority: notificationData.priority || 'normal'
      };

      this.io.to(user._id.toString()).emit('notification', socketData);

      return { success: true };

    } catch (error) {
      console.error('Socket notification error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkNotifications(userIds, notificationData) {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.sendToUser(userId, notificationData))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`📢 Bulk notifications sent: ${successCount}/${userIds.length} users reached`);
      
      return {
        total: userIds.length,
        successful: successCount,
        failed: userIds.length - successCount,
        results
      };

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  async sendEmergencyAlert(familyId, alertData) {
    try {
      const Family = require('../models/Family');
      const family = await Family.findById(familyId).populate('members.user');

      if (!family) {
        throw new Error('Family not found');
      }

      const emergencyNotification = {
        title: '🚨 EMERGENCY ALERT',
        body: alertData.message,
        data: {
          type: 'emergency',
          severity: 'critical',
          patientId: alertData.patientId,
          ...alertData.data
        },
        priority: 'high',
        sound: 'emergency',
        vibration: true
      };

      // Send to all family members
      const memberIds = family.members.map(member => member.user._id);
      const results = await this.sendBulkNotifications(memberIds, emergencyNotification);

      // Send to family room via socket
      this.io.to(`family_${familyId}`).emit('emergencyAlert', {
        ...alertData,
        timestamp: new Date(),
        familyId
      });

      console.log(`🚨 Emergency alert sent to family ${familyId}`);
      
      return results;

    } catch (error) {
      console.error('Error sending emergency alert:', error);
      throw error;
    }
  }

  async scheduleNotification(userId, notificationData, scheduleTime) {
    try {
      const delay = scheduleTime.getTime() - Date.now();
      
      if (delay <= 0) {
        // Send immediately if time has passed
        return await this.sendToUser(userId, notificationData);
      }

      // Schedule for future
      setTimeout(async () => {
        try {
          await this.sendToUser(userId, notificationData);
        } catch (error) {
          console.error('Error sending scheduled notification:', error);
        }
      }, delay);

      console.log(`⏰ Scheduled notification for ${scheduleTime.toLocaleString()}`);
      
      return { scheduled: true, scheduledFor: scheduleTime };

    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async removeInvalidTokens(userId, tokenType, invalidTokens) {
    try {
      const User = require('../models/User');
      
      await User.findByIdAndUpdate(userId, {
        $pull: {
          [`deviceTokens.${tokenType}`]: { $in: invalidTokens }
        }
      });

      console.log(`🧹 Removed ${invalidTokens.length} invalid ${tokenType} tokens for user ${userId}`);

    } catch (error) {
      console.error('Error removing invalid tokens:', error);
    }
  }

  async removeExpiredWebPushSubscriptions(userId, expiredSubscriptions) {
    try {
      const User = require('../models/User');
      
      for (const subscription of expiredSubscriptions) {
        await User.findByIdAndUpdate(userId, {
          $pull: {
            'deviceTokens.webPush': {
              endpoint: subscription.endpoint
            }
          }
        });
      }

      console.log(`🧹 Removed ${expiredSubscriptions.length} expired web push subscriptions for user ${userId}`);

    } catch (error) {
      console.error('Error removing expired web push subscriptions:', error);
    }
  }

  async registerDeviceToken(userId, tokenType, token) {
    try {
      const User = require('../models/User');
      
      // Remove token if it already exists (to avoid duplicates)
      await User.findByIdAndUpdate(userId, {
        $pull: { [`deviceTokens.${tokenType}`]: token }
      });

      // Add the new token
      await User.findByIdAndUpdate(userId, {
        $push: { [`deviceTokens.${tokenType}`]: token }
      });

      console.log(`📱 Registered ${tokenType} token for user ${userId}`);

    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  async testNotification(userId, testType = 'basic') {
    try {
      const testNotifications = {
        basic: {
          title: '🔔 Test Notification',
          body: 'This is a test notification to verify your device is receiving alerts.',
          data: { type: 'test' }
        },
        medication: {
          title: '💊 Test Medication Reminder',
          body: 'This is a test medication reminder - Time to take your vitamins!',
          data: { type: 'test_medication' },
          priority: 'high',
          sound: 'default',
          vibration: true
        },
        emergency: {
          title: '🚨 Test Emergency Alert',
          body: 'This is a test emergency alert - All systems working correctly!',
          data: { type: 'test_emergency' },
          priority: 'high',
          sound: 'emergency',
          vibration: true
        }
      };

      const notification = testNotifications[testType] || testNotifications.basic;
      const result = await this.sendToUser(userId, notification);

      console.log(`🧪 Test notification (${testType}) sent to user ${userId}`);
      
      return result;

    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
