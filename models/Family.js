const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Primary client (patient)
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Family members and doctors
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'doctor', 'next_of_kin'],
      required: true
    },
    permissions: {
      viewMedications: {
        type: Boolean,
        default: true
      },
      manageMedications: {
        type: Boolean,
        default: false
      },
      viewHealthData: {
        type: Boolean,
        default: true
      },
      viewMedicalInfo: {
        type: Boolean,
        default: true
      },
      manageMedicalInfo: {
        type: Boolean,
        default: false
      },
      receiveAlerts: {
        type: Boolean,
        default: true
      }
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Family settings
  settings: {
    emergencyNotifications: {
      type: Boolean,
      default: true
    },
    medicationReminders: {
      type: Boolean,
      default: true
    },
    healthDataSharing: {
      type: Boolean,
      default: true
    },
    aiQuerySharing: {
      type: Boolean,
      default: true
    }
  },
  // Family invitation codes
  inviteCode: {
    type: String,
    unique: true
  },
  inviteCodeExpires: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate invite code
familySchema.methods.generateInviteCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  this.inviteCode = result;
  this.inviteCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return result;
};

// Check if user is member
familySchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString()) ||
         this.client.toString() === userId.toString();
};

// Get member permissions
familySchema.methods.getMemberPermissions = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (member) {
    return member.permissions;
  }
  // If it's the client, they have all permissions
  if (this.client.toString() === userId.toString()) {
    return {
      viewMedications: true,
      manageMedications: true,
      viewHealthData: true,
      viewMedicalInfo: true,
      manageMedicalInfo: true,
      receiveAlerts: true
    };
  }
  return null;
};

// Add member to family
familySchema.methods.addMember = function(userId, role, permissions = {}, invitedBy = null) {
  // Default permissions based on role
  const defaultPermissions = {
    client: {
      viewMedications: true,
      manageMedications: true,
      viewHealthData: true,
      viewMedicalInfo: true,
      manageMedicalInfo: true,
      receiveAlerts: true
    },
    doctor: {
      viewMedications: true,
      manageMedications: true,
      viewHealthData: true,
      viewMedicalInfo: true,
      manageMedicalInfo: true,
      receiveAlerts: true
    },
    next_of_kin: {
      viewMedications: true,
      manageMedications: false,
      viewHealthData: true,
      viewMedicalInfo: true,
      manageMedicalInfo: false,
      receiveAlerts: true
    }
  };

  const finalPermissions = { ...defaultPermissions[role], ...permissions };

  this.members.push({
    user: userId,
    role: role,
    permissions: finalPermissions,
    invitedBy: invitedBy
  });

  return this.save();
};

module.exports = mongoose.model('Family', familySchema);
