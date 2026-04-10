const mongoose = require('mongoose');

const leaderboardHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true // One snapshot per day
  },
  rankings: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    employeeId: String,
    callsDone: Number,
    selectedCount: Number,
    rejectedCount: Number,
    dispatchedCount: Number,
    performanceScore: Number,
    rank: Number
  }],
  totalCalls: Number,
  totalSelected: Number,
  totalRejected: Number,
  totalDispatched: Number,
  topPerformer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeaderboardHistory', leaderboardHistorySchema);
