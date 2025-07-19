const express = require('express');
const router = express.Router();
const GoogleFitService = require('../services/googleFitService');
const GoogleFitData = require('../models/GoogleFitData');
const User = require('../models/User');

// Initialize Google Fit service
const googleFitService = new GoogleFitService();

// GET /api/google-fit/status - Check Google Fit integration status
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const googleFitData = await GoogleFitData.findByUserId(userId);
    
    if (!googleFitData) {
      return res.json({
        success: true,
        connected: false,
        message: 'Google Fit not connected'
      });
    }

    res.json({
      success: true,
      connected: true,
      status: googleFitData.googleFitMetadata.syncStatus,
      lastSync: googleFitData.googleFitMetadata.lastSyncTime,
      permissions: googleFitData.googleFitMetadata.permissions,
      summary: googleFitData.latestSummary
    });
  } catch (error) {
    console.error('Google Fit status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Google Fit status'
    });
  }
});

// GET /api/google-fit/authorize - Start OAuth flow
router.get('/authorize', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    // Store userId in session or use state parameter
    const authUrl = googleFitService.getAuthUrl();
    
    // Add userId to the auth URL as state parameter
    const authUrlWithState = `${authUrl}&state=${encodeURIComponent(JSON.stringify({ userId }))}`;
    
    res.json({
      success: true,
      authUrl: authUrlWithState
    });
  } catch (error) {
    console.error('Google Fit authorize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

// GET /api/google-fit/oauth2callback - OAuth callback handler
router.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({
        success: false,
        error: 'OAuth authorization failed'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      });
    }

    let userId;
    try {
      const stateData = JSON.parse(decodeURIComponent(state));
      userId = stateData.userId;
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }

    // Exchange code for tokens
    const tokens = await googleFitService.getTokens(code);
    
    // Find or create GoogleFitData record
    let googleFitData = await GoogleFitData.findByUserId(userId);
    
    if (!googleFitData) {
      googleFitData = new GoogleFitData({
        userId: userId,
        googleFitMetadata: {
          syncStatus: 'active',
          permissions: googleFitService.SCOPES
        },
        syncSettings: {
          autoSync: true,
          syncFrequency: 'daily',
          dataTypes: ['steps', 'distance', 'calories', 'heart_rate', 'sleep']
        }
      });
    }
    
    // Encrypt and store tokens
    await googleFitData.storeEncryptedTokens(tokens);
    await googleFitData.updateSyncStatus('active');
    
    // Initial sync
    try {
      await performInitialSync(googleFitData);
    } catch (syncError) {
      console.error('Initial sync failed:', syncError);
      // Don't fail the whole process, just log the error
    }
    
    res.json({
      success: true,
      message: 'Google Fit connected successfully',
      status: googleFitData.googleFitMetadata.syncStatus
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete OAuth flow'
    });
  }
});

// POST /api/google-fit/sync - Manual sync
router.post('/sync', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const googleFitData = await GoogleFitData.findByUserId(userId);
    
    if (!googleFitData) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected'
      });
    }

    await performSync(googleFitData);
    
    res.json({
      success: true,
      message: 'Sync completed successfully',
      lastSync: googleFitData.googleFitMetadata.lastSyncTime,
      summary: googleFitData.latestSummary
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed: ' + error.message
    });
  }
});

// GET /api/google-fit/data - Get fitness data
router.get('/data', async (req, res) => {
  try {
    const { userId, days = 7, type = 'summary' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const googleFitData = await GoogleFitData.findByUserId(userId);
    
    if (!googleFitData) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected'
      });
    }

    if (type === 'summary') {
      // Return quick summary
      res.json({
        success: true,
        data: googleFitData.latestSummary,
        lastSync: googleFitData.googleFitMetadata.lastSyncTime
      });
    } else {
      // Fetch fresh data from Google Fit
      const tokens = await googleFitData.getDecryptedTokens();
      googleFitService.setCredentials(tokens);
      
      const timeRange = googleFitService.getTimeRange(parseInt(days));
      let data;
      
      switch (type) {
        case 'activity':
          data = await googleFitService.getAggregatedData(
            timeRange.startTimeMillis,
            timeRange.endTimeMillis
          );
          break;
        case 'sleep':
          data = await googleFitService.getSleepData(
            timeRange.startTimeMillis,
            timeRange.endTimeMillis
          );
          break;
        case 'datasources':
          data = await googleFitService.getDataSources();
          break;
        default:
          throw new Error('Invalid data type requested');
      }
      
      res.json({
        success: true,
        data: data,
        type: type,
        dateRange: {
          start: new Date(timeRange.startTimeMillis),
          end: new Date(timeRange.endTimeMillis)
        }
      });
    }
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fitness data: ' + error.message
    });
  }
});

// DELETE /api/google-fit/disconnect - Disconnect Google Fit
router.delete('/disconnect', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const googleFitData = await GoogleFitData.findByUserId(userId);
    
    if (!googleFitData) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected'
      });
    }

    await googleFitData.updateSyncStatus('disconnected');
    
    // Clear encrypted tokens
    googleFitData.encryptedTokens = undefined;
    await googleFitData.save();
    
    res.json({
      success: true,
      message: 'Google Fit disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Fit'
    });
  }
});

// GET /api/google-fit/analytics - Get health analytics
router.get('/analytics', async (req, res) => {
  try {
    const { userId, period = '30d' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    const googleFitData = await GoogleFitData.findByUserId(userId)
      .populate('encryptedFitnessData');
    
    if (!googleFitData) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected'
      });
    }

    // Get analytics from quantum-secured data
    const QuantumHealthSecurity = require('../utils/quantumHealthSecurity');
    const security = new QuantumHealthSecurity();
    
    const analytics = await security.performPrivateAnalytics(
      userId,
      'google_fit_trends',
      { period }
    );
    
    res.json({
      success: true,
      analytics: analytics,
      summary: googleFitData.latestSummary,
      securityLevel: 'quantum_protected'
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics: ' + error.message
    });
  }
});

// Helper function to perform initial sync
async function performInitialSync(googleFitData) {
  try {
    const tokens = await googleFitData.getDecryptedTokens();
    googleFitService.setCredentials(tokens);
    
    // Get last 7 days of data
    const timeRange = googleFitService.getTimeRange(7);
    
    const [activityData, sleepData] = await Promise.all([
      googleFitService.getAggregatedData(timeRange.startTimeMillis, timeRange.endTimeMillis),
      googleFitService.getSleepData(timeRange.startTimeMillis, timeRange.endTimeMillis)
    ]);
    
    const combinedData = {
      ...activityData,
      sleepSessions: sleepData
    };
    
    await googleFitData.storeFitnessData(combinedData);
    console.log(`Initial sync completed for user ${googleFitData.userId}`);
  } catch (error) {
    console.error('Initial sync failed:', error);
    await googleFitData.updateSyncStatus('error', error);
    throw error;
  }
}

// Helper function to perform sync
async function performSync(googleFitData) {
  try {
    const tokens = await googleFitData.getDecryptedTokens();
    googleFitService.setCredentials(tokens);
    
    // Get data since last sync or last 24 hours
    const lastSync = googleFitData.googleFitMetadata.lastSyncTime;
    const startTime = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = new Date();
    
    const [activityData, sleepData] = await Promise.all([
      googleFitService.getAggregatedData(startTime.getTime(), endTime.getTime()),
      googleFitService.getSleepData(startTime.getTime(), endTime.getTime())
    ]);
    
    const combinedData = {
      ...activityData,
      sleepSessions: sleepData
    };
    
    await googleFitData.storeFitnessData(combinedData);
    await googleFitData.updateSyncStatus('active');
    
    console.log(`Sync completed for user ${googleFitData.userId}`);
  } catch (error) {
    console.error('Sync failed:', error);
    await googleFitData.updateSyncStatus('error', error);
    throw error;
  }
}

module.exports = router;
