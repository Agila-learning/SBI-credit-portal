const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get messages between two users
// @route   GET /api/chat/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const query = req.user.role === 'admin' 
      ? {
          $or: [
            { sender: userId, recipient: { $in: await User.find({ role: 'admin' }).distinct('_id') } },
            { sender: { $in: await User.find({ role: 'admin' }).distinct('_id') }, recipient: userId },
          ],
        }
      : {
          $or: [
            { sender: currentUserId, recipient: userId },
            { sender: userId, recipient: currentUserId },
          ],
        };

    const messages = await Message.find(query)
      .populate('sender', 'name role profilePicture')
      .populate('recipient', 'name role profilePicture')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all contacts with last message preview + unread count
// @route   GET /api/chat/contacts
// @access  Private
const getContacts = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all visible users
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('name role employeeId profilePicture lastSeen status');

    // For each user, get last message and unread count
    const contactsWithMeta = await Promise.all(
      users.map(async (contact) => {
        const adminIds = await User.find({ role: 'admin' }).distinct('_id');
        const contactQuery = (req.user.role === 'admin' && contact.role === 'employee')
          ? {
              $or: [
                { sender: contact._id, recipient: { $in: adminIds } },
                { sender: { $in: adminIds }, recipient: contact._id },
              ],
            }
          : {
              $or: [
                { sender: currentUserId, recipient: contact._id },
                { sender: contact._id, recipient: currentUserId },
              ],
            };

        const lastMsg = await Message.findOne(contactQuery)
          .sort({ createdAt: -1 })
          .select('content messageType createdAt isRead sender isBroadcast');

        const unreadCount = await Message.countDocuments({
          sender: contact._id,
          recipient: currentUserId,
          isRead: false,
        });

        return {
          ...contact.toObject(),
          lastMessage: lastMsg || null,
          unreadCount,
        };
      })
    );

    // De-duplicate contacts by _id to prevent React key errors
    const uniqueContacts = Array.from(
      new Map(contactsWithMeta.map(c => [c._id.toString(), c])).values()
    );

    // Sort by last message time (most recent first)
    uniqueContacts.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json(uniqueContacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { recipient, content, messageType, fileUrl, leadRef, isBroadcast } = req.body;

    // Build base message
    const msgData = {
      sender: req.user._id,
      content,
      messageType: messageType || 'text',
      fileUrl,
      isBroadcast: !!isBroadcast,
    };

    if (leadRef) {
      msgData.leadRef = leadRef;
    }

    if (isBroadcast) {
      // Send to all employees
      const employees = await User.find({ role: 'employee' }).select('_id');
      const messages = await Promise.all(
        employees.map(emp =>
          Message.create({ ...msgData, recipient: emp._id })
        )
      );
      return res.status(201).json({ broadcast: true, count: messages.length });
    }

    msgData.recipient = recipient;
    const message = await Message.create(msgData);
    await message.populate('sender', 'name role profilePicture');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:userId
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await Message.updateMany(
      { sender: userId, recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread count
// @route   GET /api/chat/unread
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender or admin can delete
    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.deleteOne();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  getContacts,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteMessage,
};
