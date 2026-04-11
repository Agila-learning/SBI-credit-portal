const express = require('express');
const router = express.Router();
const { 
  getIncentives, 
  calculateIncentive, 
  bulkGenerate, 
  updateIncentive, 
  exportIncentives, 
  deleteIncentive 
} = require('../controllers/incentiveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getIncentives)
  .post(protect, authorize('admin'), calculateIncentive);

router.route('/bulk')
  .post(protect, authorize('admin'), bulkGenerate);

router.route('/export')
  .get(protect, authorize('admin', 'team_leader'), exportIncentives);

router.route('/:id')
  .put(protect, authorize('admin'), updateIncentive)
  .delete(protect, authorize('admin'), deleteIncentive);

module.exports = router;
