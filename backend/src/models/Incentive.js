const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true // Format: "MM-YYYY"
  },
  dispatchedCards: {
    type: Number,
    default: 0
  },
  selectedApps: {
    type: Number,
    default: 0
  },
  totalCalls: {
    type: Number,
    default: 0
  },
  totalRejected: {
    type: Number,
    default: 0
  },
  slabUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncentiveSlab'
  },
  rateApplied: {
    type: Number,
    default: 0
  },
  bonusApplied: {
    type: Number,
    default: 0
  },
  adjustments: {
    amount: { type: Number, default: 0 },
    remarks: { type: String }
  },
  incentiveAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Paid', 'On Hold'],
    default: 'Pending'
  },
  payoutDate: {
    type: Date
  },
  remarks: {
    type: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Incentive = mongoose.model('Incentive', incentiveSchema);

module.exports = Incentive;
