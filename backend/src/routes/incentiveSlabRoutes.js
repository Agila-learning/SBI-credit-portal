const express = require('express');
const router = express.Router();
const { getSlabs, createSlab, updateSlab, deleteSlab } = require('../controllers/incentiveSlabController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('admin'), getSlabs)
  .post(protect, authorize('admin'), createSlab);

router.route('/:id')
  .put(protect, authorize('admin'), updateSlab)
  .delete(protect, authorize('admin'), deleteSlab);

module.exports = router;
