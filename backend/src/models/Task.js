const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['Calls Target', 'Selected Target', 'Dispatched Target', 'Follow-up Target', 'General Admin'],
    default: 'General Admin'
  },
  targetCount: {
    type: Number,
    default: 0
  },
  achievedCount: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date']
  },
  remarks: String
}, {
  timestamps: true
});

// Virtual for completion percentage
taskSchema.virtual('completionPercentage').get(function() {
  if (this.targetCount === 0) return this.status === 'Completed' ? 100 : 0;
  return Math.min(100, Math.round((this.achievedCount / this.targetCount) * 100));
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
