const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  counts: {
    callsDone: { type: Number, default: 0 },
    selected: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    dispatched: { type: Number, default: 0 },
  },
  actualEntries: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

// Ensure one report per employee per date
dailyReportSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
