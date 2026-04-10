const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  callType: {
    type: String,
    enum: [
      'First Time Call', 
      'Follow-Up Call', 
      'Selected Notified Call', 
      'Rejected Notified Call', 
      'Dispatch Follow-Up', 
      'Pending Follow-Up'
    ],
    required: [true, 'Please select interaction type'],
  },
  stage: {
    type: String,
    enum: ['Called', 'Selected', 'Rejected', 'Dispatched', 'Pending'],
    required: [true, 'Please select current stage'],
  },
  remarks: {
    type: String,
    required: [true, 'Remarks are mandatory for every interaction'],
    trim: true,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Interaction', interactionSchema);
