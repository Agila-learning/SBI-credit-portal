const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: false,
  },
  mobileNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  location: {
    type: String,
    required: false, // Made optional as per previous iteration
  },
  employmentType: {
    type: String,
    enum: ['Business', 'Salaried', ''],
    default: ''
  },
  companyName: {
    type: String,
    default: ''
  },
  designation: {
    type: String,
    default: ''
  },
  panNumber: {
    type: String,
    default: ''
  },
  applicationNumber: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Called', 'Selected', 'Rejected', 'Dispatched', 'Pending', 'QD'],
    default: 'Called',
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  history: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interaction',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Index to prevent duplicate lead for same mobile number by same employee today? 
// Or just globally? User said "Duplicate mobile number alert". 
// I'll leave it to the controller to check for duplicate mobile number across all leads.

module.exports = mongoose.model('Lead', leadSchema);
