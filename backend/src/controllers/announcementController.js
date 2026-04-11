const Announcement = require('../models/Announcement');

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, expiresAt } = req.body;
    
    // Construct payload, only add expiresAt if it's a valid non-empty value
    const payload = {
      title,
      content,
      priority: priority || 'Medium',
      author: req.user._id
    };

    if (expiresAt && expiresAt.trim() !== "") {
      payload.expiresAt = expiresAt;
    }

    const announcement = await Announcement.create(payload);
    
    // Notify all users in real-time
    if (req.io) {
      req.io.emit('notification', {
        type: 'announcement',
        title: 'New Announcement',
        message: announcement.title,
        data: announcement
      });
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Announcement Creation Error:", error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get active announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ 
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    .populate('author', 'name')
    .sort('-createdAt');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Not found' });
    await announcement.deleteOne();
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement
};
