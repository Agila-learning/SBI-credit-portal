const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // null = broadcast to all
  },
  content: {
    type: String,
    required: function () {
      return this.messageType === 'text' || this.messageType === 'announcement' || this.messageType === 'reminder' || this.messageType === 'lead-ref';
    },
  },
  messageType: {
    type: String,
    enum: ['text', 'voice', 'image', 'file', 'announcement', 'reminder', 'lead-ref'],
    default: 'text',
  },
  fileUrl: {
    type: String,
  },
  // For lead-ref type messages
  leadRef: {
    leadId: String,
    customerName: String,
    mobileNumber: String,
    status: String,
  },
  // Delivery tracking
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  // true = sent by admin to all employees
  isBroadcast: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for fast conversation queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
