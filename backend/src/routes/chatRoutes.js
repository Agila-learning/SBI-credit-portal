const express = require('express');
const router = express.Router();
const {
  getMessages,
  getContacts,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// IMPORTANT: In Express 5, specific string routes MUST come before parameterized routes
// GET /api/chat/contacts  — fetch all contacts with last msg preview
router.get('/contacts', protect, getContacts);

// GET /api/chat/unread  — unread count for badge
router.get('/unread', protect, getUnreadCount);

// POST /api/chat  — send a message (or broadcast)
router.post('/', protect, sendMessage);

// PUT /api/chat/read/:userId  — mark conversation as read
// NOTE: Must be before /:userId GET to avoid conflict
router.put('/read/:userId', protect, markAsRead);

// GET /api/chat/:userId  — fetch messages between current user and userId
router.get('/:userId', protect, getMessages);

// DELETE /api/chat/:messageId — delete a message
router.delete('/:messageId', protect, deleteMessage);

module.exports = router;
