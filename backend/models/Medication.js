const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  // Basic medication info
  scientificName: {
    type: String,
    required: true,
    trim: true
  },
  commonName: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  dosage: {
    amount: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      enum: ['mg', 'g', 'ml', 'tablets', 'capsules', 'drops', 'puffs']
    }
  },
  instructions: {
    type: String,
    trim: true
  },
  sideEffects: [String],
  
  // Scheduling
  schedule: {
    frequency: {
      type: String,
      required: true,
      enum: ['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed', 'custom']
    },
    times: [{
      hour: {
        type: Number,
        min: 0,
        max: 23
      },
      minute: {
        type: Number,
        min: 0,
        max: 59
      }
    }],
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }],
    interval: {
      type: Number,
      default: 1 // Every X days
    }
  },

  // Medical information
  prescribedBy: {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    doctorName: String,
    prescriptionDate: Date,
    prescriptionNumber: String
  },
  purpose: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['prescription', 'over_the_counter', 'supplement', 'vitamin']
  },

  // Patient and family
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Status and tracking
  isActive: {
    type: Boolean,
    default: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  pauseReason: String,
  lastTaken: Date,
  
  // Alarm settings
  alarmSettings: {
    soundEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    },
    reminderInterval: {
      type: Number,
      default: 5 // minutes between reminders
    },
    maxReminders: {
      type: Number,
      default: 3
    },
    notifyFamilyAfter: {
      type: Number,
      default: 15 // minutes before notifying family
    },
    customSound: String
  },

  // Adherence tracking
  adherence: {
    totalDoses: {
      type: Number,
      default: 0
    },
    takenDoses: {
      type: Number,
      default: 0
    },
    missedDoses: {
      type: Number,
      default: 0
    },
    adherenceRate: {
      type: Number,
      default: 0
    },
    lastCalculated: Date
  },

  // Medication history
  inventory: {
    totalPills: Number,
    remainingPills: Number,
    refillReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      threshold: {
        type: Number,
        default: 7 // days worth of medication
      }
    },
    lastRefill: Date,
    nextRefill: Date
  },

  // Notes and updates
  notes: [{
    text: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['note', 'side_effect', 'effectiveness', 'dosage_change']
    }
  }]
}, {
  timestamps: true
});

// Calculate next dose time
medicationSchema.methods.getNextDoseTime = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If medication is not active or paused, return null
  if (!this.isActive || this.isPaused) {
    return null;
  }

  // Check if medication has ended
  if (this.schedule.endDate && now > this.schedule.endDate) {
    return null;
  }

  const nextDoses = [];

  for (const time of this.schedule.times) {
    const doseTime = new Date(today);
    doseTime.setHours(time.hour, time.minute, 0, 0);

    // If the dose time has passed today, check tomorrow
    if (doseTime <= now) {
      doseTime.setDate(doseTime.getDate() + 1);
    }

    // Check if this day of week is included
    if (this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
      while (!this.schedule.daysOfWeek.includes(doseTime.getDay())) {
        doseTime.setDate(doseTime.getDate() + 1);
      }
    }

    nextDoses.push(doseTime);
  }

  return nextDoses.length > 0 ? new Date(Math.min(...nextDoses)) : null;
};

// Check if dose is due
medicationSchema.methods.isDoseDue = function(tolerance = 5) {
  const now = new Date();
  const nextDose = this.getNextDoseTime();
  
  if (!nextDose) return false;

  const timeDiff = Math.abs(now - nextDose) / (1000 * 60); // difference in minutes
  return timeDiff <= tolerance;
};

// Calculate adherence rate
medicationSchema.methods.calculateAdherence = function() {
  if (this.adherence.totalDoses === 0) {
    this.adherence.adherenceRate = 0;
  } else {
    this.adherence.adherenceRate = (this.adherence.takenDoses / this.adherence.totalDoses) * 100;
  }
  this.adherence.lastCalculated = new Date();
  return this.adherence.adherenceRate;
};

// Add dose taken
medicationSchema.methods.markDoseTaken = function(timestamp = new Date()) {
  this.lastTaken = timestamp;
  this.adherence.takenDoses += 1;
  this.adherence.totalDoses += 1;
  
  // Update inventory
  if (this.inventory.remainingPills && this.inventory.remainingPills > 0) {
    this.inventory.remainingPills -= 1;
  }

  this.calculateAdherence();
  return this.save();
};

// Add missed dose
medicationSchema.methods.markDoseMissed = function() {
  this.adherence.missedDoses += 1;
  this.adherence.totalDoses += 1;
  this.calculateAdherence();
  return this.save();
};

// Check if refill is needed
medicationSchema.methods.needsRefill = function() {
  if (!this.inventory.remainingPills || !this.inventory.refillReminder.enabled) {
    return false;
  }

  const daysWorth = this.inventory.remainingPills / this.schedule.times.length;
  return daysWorth <= this.inventory.refillReminder.threshold;
};

// Index for efficient queries
medicationSchema.index({ patient: 1, isActive: 1 });
medicationSchema.index({ familyId: 1, isActive: 1 });
medicationSchema.index({ 'schedule.times': 1, isActive: 1 });

module.exports = mongoose.model('Medication', medicationSchema);
