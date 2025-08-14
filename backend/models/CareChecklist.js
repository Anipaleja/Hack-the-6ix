const mongoose = require('mongoose');

const careChecklistSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareProvider'
  },
  providerName: {
    type: String,
    required: true,
    trim: true
  },
  task: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
careChecklistSchema.index({ patient: 1, completed: 1, isActive: 1 });
careChecklistSchema.index({ dueDate: 1 });

// Middleware to set completedAt when task is marked as completed
careChecklistSchema.pre('save', function(next) {
  if (this.isModified('completed') && this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('CareChecklist', careChecklistSchema);
