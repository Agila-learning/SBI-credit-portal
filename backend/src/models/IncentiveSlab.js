const mongoose = require('mongoose');

const incentiveSlabSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a slab name'],
    trim: true
  },
  minCards: {
    type: Number,
    required: [true, 'Minimum dispatched cards required'],
    default: 0
  },
  maxCards: {
    type: Number,
    required: [true, 'Maximum dispatched cards required'],
    default: 9999
  },
  ratePerCard: {
    type: Number,
    required: [true, 'Incentive amount per card required'],
    default: 0
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  cycle: {
    type: String, // Format "MM-YYYY" or "Global"
    default: 'Global'
  },
  remarks: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IncentiveSlab', incentiveSlabSchema);
