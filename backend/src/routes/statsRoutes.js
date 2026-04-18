const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getLeaderboard,
  getLeaderboardHistory,
  getTeamReport,
  exportTeamReport
} = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/history', protect, getLeaderboardHistory);
router.get('/team-report', protect, authorize('admin', 'team_leader'), getTeamReport);
router.get('/team-report/export', protect, authorize('admin', 'team_leader'), exportTeamReport);

module.exports = router;
