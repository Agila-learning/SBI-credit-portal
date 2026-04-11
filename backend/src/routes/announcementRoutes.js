const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAnnouncements)
  .post(authorize('admin', 'team_leader'), createAnnouncement);

router.route('/:id')
  .delete(authorize('admin', 'team_leader'), deleteAnnouncement);

module.exports = router;
