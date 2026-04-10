const IncentiveSlab = require('../models/IncentiveSlab');

// @desc    Get all slabs
// @route   GET /api/slabs
// @access  Private/Admin
const getSlabs = async (req, res) => {
  try {
    const slabs = await IncentiveSlab.find({}).sort({ minCards: 1 });
    res.json(slabs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a slab
// @route   POST /api/slabs
// @access  Private/Admin
const createSlab = async (req, res) => {
  try {
    const slab = await IncentiveSlab.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(slab);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a slab
// @route   PUT /api/slabs/:id
// @access  Private/Admin
const updateSlab = async (req, res) => {
  try {
    const slab = await IncentiveSlab.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slab) return res.status(404).json({ message: 'Slab not found' });
    res.json(slab);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a slab
// @route   DELETE /api/slabs/:id
// @access  Private/Admin
const deleteSlab = async (req, res) => {
  try {
    const slab = await IncentiveSlab.findByIdAndDelete(req.params.id);
    if (!slab) return res.status(404).json({ message: 'Slab not found' });
    res.json({ message: 'Slab removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSlabs,
  createSlab,
  updateSlab,
  deleteSlab
};
