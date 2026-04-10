const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getLeaderboard,
  getLeaderboardHistory
} = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/history', protect, getLeaderboardHistory);

module.exports = router;
