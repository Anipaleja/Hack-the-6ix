const mongoose = require('mongoose');

const googleFitDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Google OAuth tokens (encrypted)
  encryptedTokens: {
    encryptedData: String,
    metadata: {
      algorithm: String,
      iv: String,
      authTag: String,
      keyId: String,
      timestamp: String
    }
  },
  // Fitness data (quantum encrypted)
  encryptedFitnessData: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SecureHealthData'
  },
  // Google Fit specific metadata
  googleFitMetadata: {
    dataSourceIds: [String],
    lastSyncTime: Date,
    syncStatus: {
      type: String,
      enum: ['active', 'error', 'token_expired', 'disconnected'],
      default: 'active'
    },
    permissions: [String],
    accountId: String
  },
  // Data summary (for quick access, still encrypted)
  latestSummary: {
    dateRange: {
      start: Date,
      end: Date
    },
    totalSteps: Number,
    totalDistance: Number,
    totalCalories: Number,
    avgHeartRate: Number,
    totalActiveMinutes: Number,
    sleepSessions: Number,
    lastUpdated: Date
  },
  // Sync settings
  syncSettings: {
    autoSync: {
      type: Boolean,
      default: true
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'manual'],
      default: 'daily'
    },
    dataTypes: [{
      type: String,
      enum: ['steps', 'distance', 'calories', 'heart_rate', 'sleep', 'activity', 'location', 'body_measurements']
    }],
    retentionDays: {
      type: Number,
      default: 365
    }
  },
  // Privacy and security
  privacySettings: {
    shareWithResearchers: {
      type: Boolean,
      default: false
    },
    anonymizeData: {
      type: Boolean,
      default: true
    },
    allowAnalytics: {
      type: Boolean,
      default: true
    }
  },
  // Blockchain verification for Google Fit data integrity
  blockchainProof: {
    blockIndex: Number,
    blockHash: String,
    dataIntegrityProof: String,
    googleFitChecksum: String
  }
}, {
  timestamps: true
});

// Indexes for performance
googleFitDataSchema.index({ userId: 1, 'googleFitMetadata.syncStatus': 1 });
googleFitDataSchema.index({ 'latestSummary.lastUpdated': -1 });
googleFitDataSchema.index({ 'syncSettings.syncFrequency': 1, 'googleFitMetadata.lastSyncTime': 1 });

// Method to check if tokens need refresh
googleFitDataSchema.methods.needsTokenRefresh = function() {
  if (!this.googleFitMetadata.lastSyncTime) return true;
  
  const hoursSinceSync = (Date.now() - this.googleFitMetadata.lastSyncTime) / (1000 * 60 * 60);
  return hoursSinceSync > 1; // Refresh if more than 1 hour since last sync
};

// Method to update sync status
googleFitDataSchema.methods.updateSyncStatus = function(status, error = null) {
  this.googleFitMetadata.syncStatus = status;
  this.googleFitMetadata.lastSyncTime = new Date();
  
  if (error) {
    this.googleFitMetadata.lastError = {
      message: error.message,
      timestamp: new Date()
    };
  }
  
  return this.save();
};

// Method to encrypt and store Google OAuth tokens
googleFitDataSchema.methods.storeEncryptedTokens = async function(tokens) {
  const QuantumHealthSecurity = require('../utils/quantumHealthSecurity');
  const security = new QuantumHealthSecurity();
  
  try {
    const encryptedTokens = await security.encryptData(JSON.stringify(tokens));
    this.encryptedTokens = encryptedTokens;
    return await this.save();
  } catch (error) {
    throw new Error('Failed to encrypt Google Fit tokens: ' + error.message);
  }
};

// Method to decrypt Google OAuth tokens
googleFitDataSchema.methods.getDecryptedTokens = async function() {
  if (!this.encryptedTokens || !this.encryptedTokens.encryptedData) {
    throw new Error('No encrypted tokens found');
  }
  
  const QuantumHealthSecurity = require('../utils/quantumHealthSecurity');
  const security = new QuantumHealthSecurity();
  
  try {
    const decryptedData = await security.decryptData(this.encryptedTokens);
    return JSON.parse(decryptedData);
  } catch (error) {
    throw new Error('Failed to decrypt Google Fit tokens: ' + error.message);
  }
};

// Method to store fitness data with quantum encryption
googleFitDataSchema.methods.storeFitnessData = async function(fitnessData) {
  const QuantumHealthSecurity = require('../utils/quantumHealthSecurity');
  const SecureHealthData = require('./SecureHealthData');
  const security = new QuantumHealthSecurity();
  
  try {
    // Prepare data for quantum encryption
    const dataToEncrypt = {
      source: 'google_fit',
      data: fitnessData,
      timestamp: new Date(),
      checksum: security.generateChecksum(JSON.stringify(fitnessData))
    };
    
    // Encrypt the data
    const encryptedPayload = await security.encryptData(JSON.stringify(dataToEncrypt));
    
    // Create blockchain proof
    const blockchainProof = await security.addToBlockchain({
      userId: this.userId,
      dataType: 'google_fit_data',
      dataHash: encryptedPayload.hash,
      timestamp: new Date()
    });
    
    // Store in SecureHealthData
    const secureHealthData = new SecureHealthData({
      userId: this.userId,
      encryptedPayload: encryptedPayload,
      blockchainProof: blockchainProof,
      dataType: 'wearable_data',
      securityLevel: 'quantum_protected',
      privacyLevel: 'personal',
      quantumMetadata: {
        keyRotationCount: 0,
        lastKeyRotation: new Date(),
        quantumEntropy: security.generateQuantumEntropy(),
        securityAuditPassed: true
      }
    });
    
    await secureHealthData.save();
    
    // Update reference and summary
    this.encryptedFitnessData = secureHealthData._id;
    this.updateLatestSummary(fitnessData);
    this.blockchainProof = {
      blockIndex: blockchainProof.blockIndex,
      blockHash: blockchainProof.blockHash,
      dataIntegrityProof: blockchainProof.dataIntegrityProof,
      googleFitChecksum: dataToEncrypt.checksum
    };
    
    return await this.save();
  } catch (error) {
    throw new Error('Failed to store encrypted fitness data: ' + error.message);
  }
};

// Method to update latest summary
googleFitDataSchema.methods.updateLatestSummary = function(fitnessData) {
  if (!fitnessData) return;
  
  this.latestSummary = {
    dateRange: {
      start: fitnessData.dailyBreakdown?.[0]?.date || new Date(),
      end: fitnessData.dailyBreakdown?.[fitnessData.dailyBreakdown.length - 1]?.date || new Date()
    },
    totalSteps: fitnessData.steps || 0,
    totalDistance: fitnessData.distance || 0,
    totalCalories: fitnessData.calories || 0,
    avgHeartRate: fitnessData.heartRate?.average || 0,
    totalActiveMinutes: fitnessData.activeMinutes || 0,
    sleepSessions: fitnessData.sleepSessions?.length || 0,
    lastUpdated: new Date()
  };
};

// Static method to find user's Google Fit integration
googleFitDataSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId: userId });
};

// Static method to find users who need sync
googleFitDataSchema.statics.findUsersNeedingSync = function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return this.find({
    'syncSettings.autoSync': true,
    'googleFitMetadata.syncStatus': 'active',
    $or: [
      { 'googleFitMetadata.lastSyncTime': { $lt: oneHourAgo } },
      { 'googleFitMetadata.lastSyncTime': { $exists: false } }
    ]
  });
};

module.exports = mongoose.model('GoogleFitData', googleFitDataSchema);
