const axios = require('axios');
const HealthData = require('../models/HealthData');
const User = require('../models/User');

class HealthDataSyncService {
  constructor() {
    this.syncIntervals = new Map(); // Track active sync intervals for users
  }

  async syncUserHealthData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const results = await Promise.allSettled([
        this.syncAppleHealthData(user),
        this.syncGoogleFitData(user),
        this.syncFitbitData(user),
        this.syncGarminData(user)
      ]);

      const successfulSyncs = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`📊 Health data sync completed for ${user.firstName}: ${successfulSyncs}/4 sources synced`);
      
      return {
        userId,
        syncedSources: successfulSyncs,
        results,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error syncing user health data:', error);
      throw error;
    }
  }

  async syncAppleHealthData(user) {
    try {
      if (!user.healthIntegrations?.appleHealth?.enabled || 
          !user.healthIntegrations.appleHealth.accessToken) {
        return { success: false, reason: 'Apple Health not enabled or no access token' };
      }

      const lastSync = user.healthIntegrations.appleHealth.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      // Apple HealthKit data types to sync
      const healthKitTypes = [
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierBloodPressureSystolic',
        'HKQuantityTypeIdentifierBloodPressureDiastolic',
        'HKQuantityTypeIdentifierBodyTemperature',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKQuantityTypeIdentifierRespiratoryRate',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierHeight',
        'HKQuantityTypeIdentifierBodyMassIndex',
        'HKQuantityTypeIdentifierBloodGlucose'
      ];

      const syncPromises = healthKitTypes.map(type => 
        this.fetchAppleHealthKitData(user, type, lastSync, now)
      );

      const results = await Promise.allSettled(syncPromises);
      const healthDataEntries = results
        .filter(r => r.status === 'fulfilled' && r.value.length > 0)
        .flatMap(r => r.value);

      if (healthDataEntries.length > 0) {
        await this.saveHealthDataBatch(healthDataEntries);
      }

      // Update last sync time
      await User.findByIdAndUpdate(user._id, {
        'healthIntegrations.appleHealth.lastSync': now
      });

      return {
        success: true,
        source: 'apple_health',
        entriesCount: healthDataEntries.length,
        lastSync: now
      };

    } catch (error) {
      console.error('Apple Health sync error:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchAppleHealthKitData(user, dataType, startDate, endDate) {
    try {
      // In a real implementation, this would use Apple's HealthKit API
      // For now, we'll simulate the data structure
      
      // This would typically be done through a native iOS app that has HealthKit permissions
      // and sends data to your backend via secure API calls
      
      const mockData = this.generateMockAppleHealthData(user._id, dataType, startDate, endDate);
      return mockData;

    } catch (error) {
      console.error(`Error fetching Apple Health data for ${dataType}:`, error);
      return [];
    }
  }

  async syncGoogleFitData(user) {
    try {
      if (!user.healthIntegrations?.googleFit?.enabled || 
          !user.healthIntegrations.googleFit.accessToken) {
        return { success: false, reason: 'Google Fit not enabled or no access token' };
      }

      const lastSync = user.healthIntegrations.googleFit.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      // Google Fit data sources
      const dataSources = [
        'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm',
        'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
        'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
        'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes',
        'derived:com.google.weight:com.google.android.gms:merge_weight',
        'derived:com.google.height:com.google.android.gms:merge_height'
      ];

      const healthDataEntries = [];

      for (const dataSource of dataSources) {
        try {
          const data = await this.fetchGoogleFitData(user, dataSource, lastSync, now);
          healthDataEntries.push(...data);
        } catch (error) {
          console.error(`Error fetching Google Fit data for ${dataSource}:`, error);
        }
      }

      if (healthDataEntries.length > 0) {
        await this.saveHealthDataBatch(healthDataEntries);
      }

      // Update last sync time
      await User.findByIdAndUpdate(user._id, {
        'healthIntegrations.googleFit.lastSync': now
      });

      return {
        success: true,
        source: 'google_fit',
        entriesCount: healthDataEntries.length,
        lastSync: now
      };

    } catch (error) {
      console.error('Google Fit sync error:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchGoogleFitData(user, dataSource, startDate, endDate) {
    try {
      const startTimeMillis = startDate.getTime() * 1000000; // Convert to nanoseconds
      const endTimeMillis = endDate.getTime() * 1000000;

      const response = await axios.post(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          aggregateBy: [{
            dataTypeName: dataSource.split(':')[1]
          }],
          bucketByTime: { durationMillis: 3600000 }, // 1 hour buckets
          startTimeMillis,
          endTimeMillis
        },
        {
          headers: {
            'Authorization': `Bearer ${user.healthIntegrations.googleFit.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return this.parseGoogleFitResponse(user._id, dataSource, response.data);

    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, need to refresh
        await this.refreshGoogleFitToken(user);
        throw new Error('Google Fit token expired and refreshed, retry needed');
      }
      throw error;
    }
  }

  parseGoogleFitResponse(userId, dataSource, responseData) {
    const healthDataEntries = [];
    
    if (!responseData.bucket) return healthDataEntries;

    responseData.bucket.forEach(bucket => {
      if (!bucket.dataset || !bucket.dataset[0] || !bucket.dataset[0].point) return;

      bucket.dataset[0].point.forEach(point => {
        const timestamp = new Date(parseInt(point.startTimeNanos) / 1000000);
        
        let dataType, value, unit;
        
        if (dataSource.includes('heart_rate')) {
          dataType = 'heart_rate';
          value = point.value[0].fpVal;
          unit = 'bpm';
        } else if (dataSource.includes('step_count')) {
          dataType = 'steps';
          value = point.value[0].intVal;
          unit = 'count';
        } else if (dataSource.includes('distance')) {
          dataType = 'distance';
          value = point.value[0].fpVal;
          unit = 'meters';
        } else if (dataSource.includes('calories')) {
          dataType = 'calories_burned';
          value = point.value[0].fpVal;
          unit = 'calories';
        } else if (dataSource.includes('weight')) {
          dataType = 'weight';
          value = point.value[0].fpVal;
          unit = 'kg';
        } else if (dataSource.includes('height')) {
          dataType = 'height';
          value = point.value[0].fpVal;
          unit = 'meters';
        }

        if (dataType && value !== undefined) {
          healthDataEntries.push({
            userId,
            source: 'google_fit',
            dataType,
            value,
            unit,
            timestamp,
            metadata: {
              dataSource,
              originDataSourceId: point.originDataSource?.dataStreamId
            }
          });
        }
      });
    });

    return healthDataEntries;
  }

  async syncFitbitData(user) {
    try {
      if (!user.healthIntegrations?.fitbit?.enabled || 
          !user.healthIntegrations.fitbit.accessToken) {
        return { success: false, reason: 'Fitbit not enabled or no access token' };
      }

      const lastSync = user.healthIntegrations.fitbit.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      const fitbitEndpoints = [
        { path: 'activities/heart/date/', dataType: 'heart_rate' },
        { path: 'activities/steps/date/', dataType: 'steps' },
        { path: 'activities/distance/date/', dataType: 'distance' },
        { path: 'activities/calories/date/', dataType: 'calories_burned' },
        { path: 'body/weight/date/', dataType: 'weight' },
        { path: 'sleep/date/', dataType: 'sleep' }
      ];

      const healthDataEntries = [];

      for (const endpoint of fitbitEndpoints) {
        try {
          const data = await this.fetchFitbitData(user, endpoint, dateStr);
          healthDataEntries.push(...data);
        } catch (error) {
          console.error(`Error fetching Fitbit data for ${endpoint.path}:`, error);
        }
      }

      if (healthDataEntries.length > 0) {
        await this.saveHealthDataBatch(healthDataEntries);
      }

      // Update last sync time
      await User.findByIdAndUpdate(user._id, {
        'healthIntegrations.fitbit.lastSync': now
      });

      return {
        success: true,
        source: 'fitbit',
        entriesCount: healthDataEntries.length,
        lastSync: now
      };

    } catch (error) {
      console.error('Fitbit sync error:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchFitbitData(user, endpoint, dateStr) {
    try {
      const response = await axios.get(
        `https://api.fitbit.com/1/user/-/${endpoint.path}${dateStr}/1d.json`,
        {
          headers: {
            'Authorization': `Bearer ${user.healthIntegrations.fitbit.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return this.parseFitbitResponse(user._id, endpoint.dataType, response.data);

    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshFitbitToken(user);
        throw new Error('Fitbit token expired and refreshed, retry needed');
      }
      throw error;
    }
  }

  parseFitbitResponse(userId, dataType, responseData) {
    const healthDataEntries = [];
    const today = new Date().toISOString().split('T')[0];

    // Handle different Fitbit response formats
    if (dataType === 'heart_rate' && responseData['activities-heart']) {
      const heartData = responseData['activities-heart'][0];
      if (heartData && heartData.value) {
        healthDataEntries.push({
          userId,
          source: 'fitbit',
          dataType: 'heart_rate_resting',
          value: heartData.value.restingHeartRate,
          unit: 'bpm',
          timestamp: new Date(`${today}T12:00:00.000Z`),
          metadata: { period: 'daily' }
        });
      }
    } else if (dataType === 'steps' && responseData['activities-steps']) {
      const stepsData = responseData['activities-steps'][0];
      if (stepsData && stepsData.value) {
        healthDataEntries.push({
          userId,
          source: 'fitbit',
          dataType: 'steps',
          value: parseInt(stepsData.value),
          unit: 'count',
          timestamp: new Date(`${today}T23:59:59.000Z`),
          metadata: { period: 'daily' }
        });
      }
    }
    // Add more parsing logic for other data types...

    return healthDataEntries;
  }

  async syncGarminData(user) {
    // Similar implementation for Garmin Connect IQ API
    // This would require Garmin's Health API integration
    return { success: false, reason: 'Garmin integration not implemented yet' };
  }

  async saveHealthDataBatch(healthDataEntries) {
    try {
      if (healthDataEntries.length === 0) return;

      // Use bulk operations for better performance
      const bulkOps = healthDataEntries.map(entry => ({
        updateOne: {
          filter: {
            userId: entry.userId,
            source: entry.source,
            dataType: entry.dataType,
            timestamp: entry.timestamp
          },
          update: { $set: entry },
          upsert: true
        }
      }));

      const result = await HealthData.bulkWrite(bulkOps);
      
      console.log(`💾 Saved health data batch: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
      
      return result;

    } catch (error) {
      console.error('Error saving health data batch:', error);
      throw error;
    }
  }

  async startPeriodicSync(userId, intervalMinutes = 60) {
    try {
      // Clear existing interval if any
      this.stopPeriodicSync(userId);

      const interval = setInterval(async () => {
        try {
          await this.syncUserHealthData(userId);
        } catch (error) {
          console.error(`Periodic sync error for user ${userId}:`, error);
        }
      }, intervalMinutes * 60 * 1000);

      this.syncIntervals.set(userId, interval);
      
      console.log(`⏰ Started periodic health data sync for user ${userId} (every ${intervalMinutes} minutes)`);

    } catch (error) {
      console.error('Error starting periodic sync:', error);
      throw error;
    }
  }

  stopPeriodicSync(userId) {
    const interval = this.syncIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(userId);
      console.log(`⏹️ Stopped periodic health data sync for user ${userId}`);
    }
  }

  async refreshGoogleFitToken(user) {
    // Implementation for refreshing Google Fit OAuth token
    console.log('Refreshing Google Fit token...');
  }

  async refreshFitbitToken(user) {
    // Implementation for refreshing Fitbit OAuth token
    console.log('Refreshing Fitbit token...');
  }

  generateMockAppleHealthData(userId, dataType, startDate, endDate) {
    // Generate mock data for development/testing
    const mockData = [];
    const hours = Math.floor((endDate - startDate) / (1000 * 60 * 60));
    
    for (let i = 0; i < Math.min(hours, 24); i++) {
      const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      
      let value, unit, mappedType;
      
      switch (dataType) {
        case 'HKQuantityTypeIdentifierHeartRate':
          value = 65 + Math.random() * 30; // 65-95 bpm
          unit = 'bpm';
          mappedType = 'heart_rate';
          break;
        case 'HKQuantityTypeIdentifierStepCount':
          value = Math.floor(Math.random() * 1000); // 0-1000 steps per hour
          unit = 'count';
          mappedType = 'steps';
          break;
        case 'HKQuantityTypeIdentifierBloodPressureSystolic':
          value = 110 + Math.random() * 30; // 110-140 mmHg
          unit = 'mmHg';
          mappedType = 'blood_pressure_systolic';
          break;
        default:
          continue;
      }

      if (mappedType) {
        mockData.push({
          userId,
          source: 'apple_health',
          dataType: mappedType,
          value,
          unit,
          timestamp,
          metadata: { 
            originalType: dataType,
            mock: true 
          }
        });
      }
    }
    
    return mockData;
  }

  async getHealthDataSummary(userId, dateRange = 7) {
    try {
      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
      
      const summary = await HealthData.aggregate([
        {
          $match: {
            userId: userId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$dataType',
            count: { $sum: 1 },
            latestValue: { $last: '$value' },
            latestTimestamp: { $last: '$timestamp' },
            avgValue: { $avg: '$value' },
            minValue: { $min: '$value' },
            maxValue: { $max: '$value' },
            unit: { $last: '$unit' },
            sources: { $addToSet: '$source' }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);

      return summary;

    } catch (error) {
      console.error('Error generating health data summary:', error);
      throw error;
    }
  }
}

module.exports = HealthDataSyncService;
