const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getUsers);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

module.exports = router;
