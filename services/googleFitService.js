const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleFitService {
  constructor() {
    this.CLIENT_SECRETS_FILE = path.join(__dirname, '..', 'client_secret.json');
    this.SCOPES = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.location.read', 
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
    ];
    this.REDIRECT_URI = process.env.GOOGLE_FIT_REDIRECT_URI || 'http://localhost:3000/api/google-fit/oauth2callback';
    this.oauth2Client = null;
    this.initializeOAuth();
  }

  initializeOAuth() {
    try {
      if (!fs.existsSync(this.CLIENT_SECRETS_FILE)) {
        console.log('Google Fit: client_secret.json not found. Google Fit integration disabled.');
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(this.CLIENT_SECRETS_FILE, 'utf8'));
      const { client_id, client_secret } = credentials.web || credentials.installed;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        this.REDIRECT_URI
      );

      console.log('Google Fit OAuth client initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Fit OAuth:', error.message);
    }
  }

  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      prompt: 'consent'
    });
  }

  async getTokens(authCode) {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(authCode);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  setCredentials(tokens) {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }
    this.oauth2Client.setCredentials(tokens);
  }

  async getDataSources() {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });
    
    try {
      const response = await fitness.users.dataSources.list({
        userId: 'me'
      });
      return response.data.dataSource || [];
    } catch (error) {
      console.error('Error fetching data sources:', error);
      throw error;
    }
  }

  async getAggregatedData(startTimeMillis, endTimeMillis) {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });
    
    try {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [
            { dataTypeName: 'com.google.step_count.delta' },
            { dataTypeName: 'com.google.distance.delta' },
            { dataTypeName: 'com.google.calories.expended' },
            { dataTypeName: 'com.google.heart_rate.bpm' },
            { dataTypeName: 'com.google.active_minutes' }
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
          startTimeMillis: startTimeMillis.toString(),
          endTimeMillis: endTimeMillis.toString()
        }
      });

      return this.processAggregatedData(response.data.bucket || []);
    } catch (error) {
      console.error('Error fetching aggregated data:', error);
      throw error;
    }
  }

  processAggregatedData(buckets) {
    const processedData = {
      steps: 0,
      distance: 0,
      calories: 0,
      heartRate: { values: [], average: 0 },
      activeMinutes: 0,
      dailyBreakdown: []
    };

    buckets.forEach(bucket => {
      const dayData = {
        date: new Date(parseInt(bucket.startTimeMillis)),
        steps: 0,
        distance: 0,
        calories: 0,
        heartRate: 0,
        activeMinutes: 0
      };

      bucket.dataset.forEach(dataset => {
        dataset.point.forEach(point => {
          switch (dataset.dataSourceId.split(':')[1]) {
            case 'com.google.step_count.delta':
              const steps = point.value[0]?.intVal || 0;
              dayData.steps += steps;
              processedData.steps += steps;
              break;
            case 'com.google.distance.delta':
              const distance = point.value[0]?.fpVal || 0;
              dayData.distance += distance;
              processedData.distance += distance;
              break;
            case 'com.google.calories.expended':
              const calories = point.value[0]?.fpVal || 0;
              dayData.calories += calories;
              processedData.calories += calories;
              break;
            case 'com.google.heart_rate.bpm':
              const heartRate = point.value[0]?.fpVal || 0;
              if (heartRate > 0) {
                dayData.heartRate = heartRate;
                processedData.heartRate.values.push(heartRate);
              }
              break;
            case 'com.google.active_minutes':
              const activeMinutes = point.value[0]?.intVal || 0;
              dayData.activeMinutes += activeMinutes;
              processedData.activeMinutes += activeMinutes;
              break;
          }
        });
      });

      processedData.dailyBreakdown.push(dayData);
    });

    // Calculate average heart rate
    if (processedData.heartRate.values.length > 0) {
      processedData.heartRate.average = 
        processedData.heartRate.values.reduce((a, b) => a + b, 0) / processedData.heartRate.values.length;
    }

    return processedData;
  }

  async getSleepData(startTimeMillis, endTimeMillis) {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });
    
    try {
      // Get sleep sessions
      const sessionsResponse = await fitness.users.sessions.list({
        userId: 'me',
        startTime: new Date(startTimeMillis).toISOString(),
        endTime: new Date(endTimeMillis).toISOString()
      });

      const sleepSessions = (sessionsResponse.data.session || [])
        .filter(session => session.activityType === 72); // Sleep activity type

      const sleepData = [];

      for (const session of sleepSessions) {
        const sessionData = {
          id: session.id,
          name: session.name,
          startTime: new Date(parseInt(session.startTimeMillis)),
          endTime: new Date(parseInt(session.endTimeMillis)),
          duration: parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis),
          stages: []
        };

        // Get sleep stages for this session
        try {
          const stagesResponse = await fitness.users.dataset.get({
            userId: 'me',
            datasetId: `${session.startTimeMillis}-${session.endTimeMillis}`,
            dataSourceId: 'derived:com.google.sleep.segment:com.google.android.gms:merged'
          });

          sessionData.stages = (stagesResponse.data.point || []).map(point => ({
            startTime: new Date(parseInt(point.startTimeNanos) / 1000000),
            endTime: new Date(parseInt(point.endTimeNanos) / 1000000),
            stage: this.getSleepStageLabel(point.value[0]?.intVal || 0)
          }));
        } catch (stageError) {
          console.log('Could not fetch sleep stages for session:', session.id);
        }

        sleepData.push(sessionData);
      }

      return sleepData;
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      throw error;
    }
  }

  getSleepStageLabel(stageValue) {
    const stages = {
      1: 'Awake (during sleep)',
      2: 'Sleep',
      3: 'Out-of-bed',
      4: 'Light sleep',
      5: 'Deep sleep',
      6: 'REM sleep'
    };
    return stages[stageValue] || 'Unknown';
  }

  async getRawDataPoints(dataSourceId, startTimeMillis, endTimeMillis) {
    if (!this.oauth2Client) {
      throw new Error('Google Fit OAuth not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });
    
    try {
      const response = await fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: dataSourceId,
        datasetId: `${startTimeMillis}-${endTimeMillis}`
      });

      return response.data.point || [];
    } catch (error) {
      console.error('Error fetching raw data points:', error);
      throw error;
    }
  }

  // Helper method to get common time ranges
  getTimeRange(days = 1) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return {
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime()
    };
  }
}

module.exports = GoogleFitService;
