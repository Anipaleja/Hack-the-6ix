const cron = require('node-cron');
const GoogleFitService = require('../services/googleFitService');
const GoogleFitData = require('../models/GoogleFitData');

class GoogleFitSyncService {
  constructor() {
    this.googleFitService = new GoogleFitService();
    this.isRunning = false;
  }

  // Start the sync service with scheduled tasks
  start() {
    if (this.isRunning) {
      console.log('Google Fit sync service is already running');
      return;
    }

    console.log('Starting Google Fit sync service...');

    // Schedule sync every hour
    this.hourlySync = cron.schedule('0 * * * *', async () => {
      await this.performScheduledSync('hourly');
    }, {
      scheduled: false
    });

    // Schedule daily sync at 2 AM
    this.dailySync = cron.schedule('0 2 * * *', async () => {
      await this.performScheduledSync('daily');
    }, {
      scheduled: false
    });

    // Schedule cleanup every 6 hours
    this.cleanupTask = cron.schedule('0 */6 * * *', async () => {
      await this.performCleanup();
    }, {
      scheduled: false
    });

    // Start all scheduled tasks
    this.hourlySync.start();
    this.dailySync.start();
    this.cleanupTask.start();

    this.isRunning = true;
    console.log('Google Fit sync service started successfully');
  }

  // Stop the sync service
  stop() {
    if (!this.isRunning) {
      console.log('Google Fit sync service is not running');
      return;
    }

    console.log('Stopping Google Fit sync service...');

    if (this.hourlySync) this.hourlySync.stop();
    if (this.dailySync) this.dailySync.stop();
    if (this.cleanupTask) this.cleanupTask.stop();

    this.isRunning = false;
    console.log('Google Fit sync service stopped');
  }

  // Perform scheduled sync for users
  async performScheduledSync(frequency) {
    try {
      console.log(`Starting ${frequency} Google Fit sync...`);

      // Find users who need sync based on frequency
      const usersToSync = await this.getUsersNeedingSync(frequency);
      
      if (usersToSync.length === 0) {
        console.log(`No users need ${frequency} sync`);
        return;
      }

      console.log(`Found ${usersToSync.length} users needing ${frequency} sync`);

      // Process users in batches to avoid API rate limits
      const batchSize = 5;
      const batches = this.chunkArray(usersToSync, batchSize);

      let successCount = 0;
      let failureCount = 0;

      for (const batch of batches) {
        await Promise.all(batch.map(async (googleFitData) => {
          try {
            await this.syncUserData(googleFitData);
            successCount++;
          } catch (error) {
            console.error(`Sync failed for user ${googleFitData.userId}:`, error.message);
            failureCount++;
          }
        }));

        // Add delay between batches to respect API rate limits
        if (batches.length > 1) {
          await this.delay(1000); // 1 second delay
        }
      }

      console.log(`${frequency} sync completed: ${successCount} success, ${failureCount} failures`);
    } catch (error) {
      console.error(`Error in ${frequency} sync:`, error);
    }
  }

  // Get users that need syncing based on frequency
  async getUsersNeedingSync(frequency) {
    const now = new Date();
    let cutoffTime;

    switch (frequency) {
      case 'hourly':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        break;
      case 'daily':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        break;
      default:
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // Default to 1 hour
    }

    return await GoogleFitData.find({
      'syncSettings.autoSync': true,
      'syncSettings.syncFrequency': { $in: [frequency, 'realtime'] },
      'googleFitMetadata.syncStatus': 'active',
      $or: [
        { 'googleFitMetadata.lastSyncTime': { $lt: cutoffTime } },
        { 'googleFitMetadata.lastSyncTime': { $exists: false } }
      ]
    });
  }

  // Sync data for a specific user
  async syncUserData(googleFitData) {
    try {
      // Get decrypted tokens
      const tokens = await googleFitData.getDecryptedTokens();
      this.googleFitService.setCredentials(tokens);

      // Determine time range for sync
      const lastSync = googleFitData.googleFitMetadata.lastSyncTime;
      const startTime = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endTime = new Date();

      // Fetch new data
      const [activityData, sleepData] = await Promise.all([
        this.googleFitService.getAggregatedData(startTime.getTime(), endTime.getTime()),
        this.googleFitService.getSleepData(startTime.getTime(), endTime.getTime())
      ]);

      // Only store if there's new data
      if (this.hasNewData(activityData, sleepData)) {
        const combinedData = {
          ...activityData,
          sleepSessions: sleepData
        };

        await googleFitData.storeFitnessData(combinedData);
        console.log(`Synced data for user ${googleFitData.userId}`);
      } else {
        // Update last sync time even if no new data
        await googleFitData.updateSyncStatus('active');
      }
    } catch (error) {
      console.error(`Sync error for user ${googleFitData.userId}:`, error);
      
      // Handle token expiration
      if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
        await googleFitData.updateSyncStatus('token_expired', error);
      } else {
        await googleFitData.updateSyncStatus('error', error);
      }
      
      throw error;
    }
  }

  // Check if there's new data worth storing
  hasNewData(activityData, sleepData) {
    const hasActivity = activityData && (
      activityData.steps > 0 ||
      activityData.distance > 0 ||
      activityData.calories > 0 ||
      activityData.heartRate.values.length > 0 ||
      activityData.activeMinutes > 0
    );

    const hasSleep = sleepData && sleepData.length > 0;

    return hasActivity || hasSleep;
  }

  // Perform cleanup tasks
  async performCleanup() {
    try {
      console.log('Starting Google Fit data cleanup...');

      // Find users with old data to clean up
      const cleanupDate = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)); // 1 year ago

      // This would be implemented based on your data retention policy
      // For now, just update sync status for inactive connections
      const inactiveUsers = await GoogleFitData.find({
        'googleFitMetadata.lastSyncTime': { $lt: cleanupDate },
        'googleFitMetadata.syncStatus': { $ne: 'disconnected' }
      });

      for (const user of inactiveUsers) {
        await user.updateSyncStatus('disconnected');
        console.log(`Marked user ${user.userId} as disconnected due to inactivity`);
      }

      console.log(`Cleanup completed: processed ${inactiveUsers.length} inactive users`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Utility function to chunk array into batches
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manual sync for specific user
  async syncUser(userId) {
    const googleFitData = await GoogleFitData.findByUserId(userId);
    if (!googleFitData) {
      throw new Error('Google Fit not connected for this user');
    }

    await this.syncUserData(googleFitData);
    return googleFitData.latestSummary;
  }

  // Get sync service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: {
        hourly: this.hourlySync ? this.hourlySync.running : false,
        daily: this.dailySync ? this.dailySync.running : false,
        cleanup: this.cleanupTask ? this.cleanupTask.running : false
      },
      nextSyncTimes: {
        hourly: this.hourlySync ? this.hourlySync.nextDate() : null,
        daily: this.dailySync ? this.dailySync.nextDate() : null,
        cleanup: this.cleanupTask ? this.cleanupTask.nextDate() : null
      }
    };
  }
}

module.exports = GoogleFitSyncService;
