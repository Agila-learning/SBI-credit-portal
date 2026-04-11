const express = require('express');
const router = express.Router();
const {
  getLeadByMobile,
  submitDailyBatch,
  getLeads,
  updateLead,
  deleteLead,
  bulkUpload,
} = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeads);

router.post('/batch', protect, submitDailyBatch);
router.post('/bulk', protect, bulkUpload);
router.get('/mobile/:mobile', protect, getLeadByMobile);

router.route('/:id')
  .put(protect, updateLead)
  .delete(protect, authorize('admin'), deleteLead);

module.exports = router;
