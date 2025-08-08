const cron = require('node-cron');
const Medication = require('../models/Medication');
const MedicationAlarm = require('../models/MedicationAlarm');
const User = require('../models/User');
const Family = require('../models/Family');
const NotificationService = require('./notificationService');

class MedicationAlarmService {
  constructor(io) {
    this.io = io;
    this.notificationService = new NotificationService(io);
    this.activeAlarms = new Map(); // Track active alarms
  }

  async checkMedicationAlarms() {
    try {
      const now = new Date();
      const tolerance = 5; // minutes

      // Find all active medications that might be due
      const medications = await Medication.find({
        isActive: true,
        isPaused: false,
        $or: [
          { 'schedule.endDate': { $exists: false } },
          { 'schedule.endDate': { $gte: now } }
        ]
      }).populate('patient', 'firstName lastName deviceTokens notificationSettings')
        .populate('familyId');

      for (const medication of medications) {
        await this.checkMedicationDue(medication, now, tolerance);
      }

      // Check for overdue medications (missed doses)
      await this.checkOverdueMedications();

    } catch (error) {
      console.error('Error checking medication alarms:', error);
    }
  }

  async checkMedicationDue(medication, now, tolerance) {
    try {
      const nextDose = medication.getNextDoseTime();
      
      if (!nextDose) return;

      const timeDiff = Math.abs(now - nextDose) / (1000 * 60); // difference in minutes
      
      if (timeDiff <= tolerance) {
        // Check if alarm already exists for this time
        const existingAlarm = await MedicationAlarm.findOne({
          medication: medication._id,
          scheduledTime: {
            $gte: new Date(nextDose.getTime() - tolerance * 60 * 1000),
            $lte: new Date(nextDose.getTime() + tolerance * 60 * 1000)
          },
          status: { $in: ['pending', 'active', 'snoozed'] }
        });

        if (!existingAlarm) {
          await this.createMedicationAlarm(medication, nextDose);
        } else if (existingAlarm.status === 'snoozed' && 
                   existingAlarm.snoozeUntil && 
                   now >= existingAlarm.snoozeUntil) {
          // Reactivate snoozed alarm
          await this.reactivateSnoozedalarm(existingAlarm);
        }
      }
    } catch (error) {
      console.error('Error checking medication due:', error);
    }
  }

  async createMedicationAlarm(medication, scheduledTime) {
    try {
      const alarm = new MedicationAlarm({
        medication: medication._id,
        patient: medication.patient._id,
        familyId: medication.familyId,
        scheduledTime,
        status: 'active',
        reminderCount: 0,
        maxReminders: medication.alarmSettings.maxReminders || 3,
        reminderInterval: medication.alarmSettings.reminderInterval || 5
      });

      await alarm.save();

      // Start alarm notifications
      await this.triggerAlarm(alarm, medication);

      console.log(`📢 Medication alarm created for ${medication.commonName} at ${scheduledTime}`);
    } catch (error) {
      console.error('Error creating medication alarm:', error);
    }
  }

  async triggerAlarm(alarm, medication) {
    try {
      const patient = await User.findById(alarm.patient);
      const family = await Family.findById(alarm.familyId).populate('members.user');

      // Send immediate notification to patient
      await this.sendPatientNotification(alarm, medication, patient);

      // Send real-time notification via socket
      this.io.to(patient._id.toString()).emit('medicationAlarm', {
        alarm: alarm.toJSON(),
        medication: medication.toJSON(),
        message: `Time to take your ${medication.commonName}`,
        sound: medication.alarmSettings.customSound || 'default',
        vibration: medication.alarmSettings.vibrationEnabled
      });

      // Schedule reminder notifications
      this.scheduleReminders(alarm, medication, patient);

      // Schedule family notification if not acknowledged
      this.scheduleFamilyNotification(alarm, medication, family);

    } catch (error) {
      console.error('Error triggering alarm:', error);
    }
  }

  async sendPatientNotification(alarm, medication, patient) {
    const notificationData = {
      title: 'Medication Reminder',
      body: `Time to take your ${medication.commonName} (${medication.dosage.amount}${medication.dosage.unit})`,
      data: {
        type: 'medication_alarm',
        medicationId: medication._id.toString(),
        alarmId: alarm._id.toString()
      },
      priority: 'high',
      sound: medication.alarmSettings.soundEnabled ? 'default' : null,
      vibration: medication.alarmSettings.vibrationEnabled
    };

    await this.notificationService.sendToUser(patient._id, notificationData);
  }

  scheduleReminders(alarm, medication, patient) {
    const reminderInterval = medication.alarmSettings.reminderInterval || 5; // minutes
    const maxReminders = medication.alarmSettings.maxReminders || 3;

    const reminderTimer = setInterval(async () => {
      try {
        // Check if alarm is still active
        const currentAlarm = await MedicationAlarm.findById(alarm._id);
        
        if (!currentAlarm || currentAlarm.status !== 'active') {
          clearInterval(reminderTimer);
          return;
        }

        // Check if we've reached max reminders
        if (currentAlarm.reminderCount >= maxReminders) {
          clearInterval(reminderTimer);
          await this.markAlarmMissed(currentAlarm, 'Max reminders reached');
          return;
        }

        // Send reminder
        currentAlarm.reminderCount += 1;
        await currentAlarm.save();

        await this.sendPatientNotification(currentAlarm, medication, patient);

        // Emit socket event for reminder
        this.io.to(patient._id.toString()).emit('medicationReminder', {
          alarm: currentAlarm.toJSON(),
          medication: medication.toJSON(),
          reminderNumber: currentAlarm.reminderCount,
          maxReminders
        });

        console.log(`🔔 Sent reminder ${currentAlarm.reminderCount}/${maxReminders} for ${medication.commonName}`);
      } catch (error) {
        console.error('Error sending reminder:', error);
        clearInterval(reminderTimer);
      }
    }, reminderInterval * 60 * 1000);

    // Store timer reference
    this.activeAlarms.set(alarm._id.toString(), reminderTimer);
  }

  scheduleFamilyNotification(alarm, medication, family) {
    const notifyAfter = medication.alarmSettings.notifyFamilyAfter || 15; // minutes

    setTimeout(async () => {
      try {
        // Check if alarm is still active (not acknowledged)
        const currentAlarm = await MedicationAlarm.findById(alarm._id);
        
        if (!currentAlarm || currentAlarm.status === 'acknowledged') {
          return; // Alarm was acknowledged, no need to notify family
        }

        // Mark as missed and notify family
        await this.markAlarmMissed(currentAlarm, 'Not acknowledged within time limit');
        
        if (family && family.members) {
          await this.notifyFamilyMembers(family, medication, currentAlarm);
        }

      } catch (error) {
        console.error('Error scheduling family notification:', error);
      }
    }, notifyAfter * 60 * 1000);
  }

  async notifyFamilyMembers(family, medication, alarm) {
    try {
      const patient = await User.findById(alarm.patient);
      
      for (const member of family.members) {
        if (member.permissions.receiveAlerts && 
            member.user._id.toString() !== alarm.patient.toString()) {
          
          const notificationData = {
            title: 'Missed Medication Alert',
            body: `${patient.firstName} missed their ${medication.commonName} dose`,
            data: {
              type: 'missed_medication',
              patientId: patient._id.toString(),
              medicationId: medication._id.toString(),
              alarmId: alarm._id.toString()
            },
            priority: 'high'
          };

          await this.notificationService.sendToUser(member.user._id, notificationData);

          // Send socket notification
          this.io.to(member.user._id.toString()).emit('familyMedicationAlert', {
            patient: {
              id: patient._id,
              name: `${patient.firstName} ${patient.lastName}`
            },
            medication: medication.toJSON(),
            alarm: alarm.toJSON(),
            type: 'missed_dose'
          });
        }
      }

      // Send to family room
      this.io.to(`family_${family._id}`).emit('medicationMissed', {
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`
        },
        medication: medication.toJSON(),
        alarm: alarm.toJSON(),
        timestamp: new Date()
      });

      console.log(`👨‍👩‍👧‍👦 Notified family members about missed medication: ${medication.commonName}`);
    } catch (error) {
      console.error('Error notifying family members:', error);
    }
  }

  async acknowledgeAlarm(alarmId, userId, timestamp = new Date()) {
    try {
      const alarm = await MedicationAlarm.findById(alarmId)
        .populate('medication')
        .populate('patient', 'firstName lastName');

      if (!alarm) {
        throw new Error('Alarm not found');
      }

      if (alarm.patient._id.toString() !== userId.toString()) {
        throw new Error('Only the patient can acknowledge their own alarms');
      }

      // Update alarm status
      alarm.status = 'acknowledged';
      alarm.acknowledgedAt = timestamp;
      alarm.acknowledgedBy = userId;
      await alarm.save();

      // Clear any active timers
      const timer = this.activeAlarms.get(alarmId);
      if (timer) {
        clearInterval(timer);
        this.activeAlarms.delete(alarmId);
      }

      // Mark medication dose as taken
      await alarm.medication.markDoseTaken(timestamp);

      // Notify family via socket
      if (alarm.familyId) {
        this.io.to(`family_${alarm.familyId}`).emit('medicationTaken', {
          patient: alarm.patient,
          medication: alarm.medication.toJSON(),
          alarm: alarm.toJSON(),
          timestamp
        });
      }

      console.log(`✅ Alarm acknowledged for ${alarm.medication.commonName} by ${alarm.patient.firstName}`);
      
      return alarm;
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
      throw error;
    }
  }

  async snoozeAlarm(alarmId, userId, minutes = 15, reason = '') {
    try {
      const alarm = await MedicationAlarm.findById(alarmId)
        .populate('medication')
        .populate('patient', 'firstName lastName');

      if (!alarm) {
        throw new Error('Alarm not found');
      }

      if (alarm.patient._id.toString() !== userId.toString()) {
        throw new Error('Only the patient can snooze their own alarms');
      }

      // Update alarm status
      alarm.status = 'snoozed';
      alarm.snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
      alarm.snoozeReason = reason;
      await alarm.save();

      // Clear current timer
      const timer = this.activeAlarms.get(alarmId);
      if (timer) {
        clearInterval(timer);
        this.activeAlarms.delete(alarmId);
      }

      // Schedule reactivation
      setTimeout(async () => {
        await this.reactivateSnoozedalarm(alarm);
      }, minutes * 60 * 1000);

      console.log(`⏰ Alarm snoozed for ${minutes} minutes: ${alarm.medication.commonName}`);
      
      return alarm;
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      throw error;
    }
  }

  async reactivateSnoozedalarm(alarm) {
    try {
      alarm.status = 'active';
      alarm.snoozeUntil = null;
      await alarm.save();

      const medication = await Medication.findById(alarm.medication);
      await this.triggerAlarm(alarm, medication);

      console.log(`🔔 Reactivated snoozed alarm: ${medication.commonName}`);
    } catch (error) {
      console.error('Error reactivating snoozed alarm:', error);
    }
  }

  async markAlarmMissed(alarm, reason = '') {
    try {
      alarm.status = 'missed';
      alarm.missedReason = reason;
      alarm.missedAt = new Date();
      await alarm.save();

      // Clear any active timers
      const timer = this.activeAlarms.get(alarm._id.toString());
      if (timer) {
        clearInterval(timer);
        this.activeAlarms.delete(alarm._id.toString());
      }

      // Mark medication dose as missed
      const medication = await Medication.findById(alarm.medication);
      await medication.markDoseMissed();

      console.log(`❌ Alarm marked as missed: ${medication.commonName}`);
    } catch (error) {
      console.error('Error marking alarm as missed:', error);
    }
  }

  async checkOverdueMedications() {
    try {
      const overdueThreshold = 30; // minutes
      const now = new Date();
      const overdueTime = new Date(now.getTime() - overdueThreshold * 60 * 1000);

      const overdueAlarms = await MedicationAlarm.find({
        status: 'active',
        scheduledTime: { $lt: overdueTime },
        reminderCount: { $gte: 3 } // Already sent max reminders
      }).populate('medication');

      for (const alarm of overdueAlarms) {
        await this.markAlarmMissed(alarm, 'Overdue - max reminders sent');
      }
    } catch (error) {
      console.error('Error checking overdue medications:', error);
    }
  }

  // Clean up completed alarms (older than 7 days)
  async cleanupOldAlarms() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await MedicationAlarm.deleteMany({
        status: { $in: ['acknowledged', 'missed', 'cancelled'] },
        scheduledTime: { $lt: sevenDaysAgo }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old medication alarms`);
    } catch (error) {
      console.error('Error cleaning up old alarms:', error);
    }
  }
}

module.exports = MedicationAlarmService;
