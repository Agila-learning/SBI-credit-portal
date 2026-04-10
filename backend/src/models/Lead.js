const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Please add customer name'],
    minlength: [3, 'Customer name must be at least 3 characters'],
    match: [/^[a-zA-Z\s.,-]+$/, 'Name can only contain letters, spaces, dots, and commas'],
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please add mobile number'],
    unique: true,
    minlength: [10, 'Mobile number must be exactly 10 digits'],
    maxlength: [10, 'Mobile number must be exactly 10 digits'],
    match: [/^\d{10}$/, 'Please add a valid 10-digit mobile number'],
  },
  location: {
    type: String,
    required: [true, 'Please add location'],
    minlength: [3, 'Location must be at least 3 characters'],
    match: [/^[a-zA-Z\s.,-]+$/, 'Location can only contain letters, spaces, dots, and commas'],
  },
  status: {
    type: String,
    enum: ['Called', 'Selected', 'Rejected', 'Dispatched', 'Pending'],
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
