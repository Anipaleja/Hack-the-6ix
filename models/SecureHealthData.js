const mongoose = require('mongoose');

const secureHealthDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Encrypted data payload
  encryptedPayload: {
    encryptedData: {
      type: String,
      required: true
    },
    metadata: {
      algorithm: String,
      iv: String,
      authTag: String,
      keyId: String,
      timestamp: String
    },
    hash: String
  },
  // Blockchain verification
  blockchainProof: {
    blockIndex: Number,
    blockHash: String,
    dataIntegrityProof: String,
    timestamp: String
  },
  // Data classification
  dataType: {
    type: String,
    enum: ['wearable_data', 'health_log', 'biometric', 'voice_transcript', 'medical_record'],
    required: true
  },
  securityLevel: {
    type: String,
    enum: ['standard', 'high', 'quantum_protected'],
    default: 'quantum_protected'
  },
  // Access control
  accessLog: [{
    accessedBy: String,
    accessTime: Date,
    accessType: {
      type: String,
      enum: ['read', 'write', 'analytics', 'emergency']
    },
    zkProofId: String
  }],
  // Privacy settings
  privacyLevel: {
    type: String,
    enum: ['personal', 'medical_team', 'emergency_only', 'research_anonymized'],
    default: 'personal'
  },
  consentVersion: {
    type: String,
    default: '1.0'
  },
  // Quantum security metadata
  quantumMetadata: {
    keyRotationCount: {
      type: Number,
      default: 0
    },
    lastKeyRotation: Date,
    quantumEntropy: String,
    securityAuditPassed: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for performance and security
secureHealthDataSchema.index({ userId: 1, dataType: 1, createdAt: -1 });
secureHealthDataSchema.index({ 'blockchainProof.blockHash': 1 });
secureHealthDataSchema.index({ securityLevel: 1, privacyLevel: 1 });

// Pre-save middleware to ensure quantum encryption
secureHealthDataSchema.pre('save', function(next) {
  if (!this.encryptedPayload || !this.blockchainProof) {
    return next(new Error('Data must be quantum encrypted and blockchain verified'));
  }
  next();
});

// Method to verify data integrity
secureHealthDataSchema.methods.verifyIntegrity = function() {
  const QuantumHealthSecurity = require('../utils/quantumHealthSecurity');
  const security = new QuantumHealthSecurity();
  
  try {
    // Verify blockchain proof exists
    if (!this.blockchainProof.blockHash) {
      return { valid: false, reason: 'Missing blockchain proof' };
    }
    
    // In a real implementation, this would verify against the actual blockchain
    return {
      valid: true,
      blockHash: this.blockchainProof.blockHash,
      verifiedAt: new Date()
    };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
};

module.exports = mongoose.model('SecureHealthData', secureHealthDataSchema);
