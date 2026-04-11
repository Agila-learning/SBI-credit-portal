const User = require('../models/User');

// @desc    Get all active employees
// @route   GET /api/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
  try {
    let query = { isDeleted: false };
    
    // Team Leader only sees their assigned employees
    if (req.user.role === 'team_leader') {
      query.reportingTo = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin sees everyone except themselves maybe, or all active
    }

    const employees = await User.find(query)
      .populate('reportingTo', 'name employeeId')
      .select('-password')
      .sort('-createdAt');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee detail
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.employeeId = req.body.employeeId || user.employeeId;
    user.location = req.body.location || user.location;
    user.status = req.body.status || user.status;
    user.role = req.body.role || user.role;
    user.reportingTo = req.body.reportingTo || user.reportingTo;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Soft delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isDeleted = true;
    user.status = 'inactive';
    await user.save();
    
    res.json({ message: 'Employee removed (soft delete)' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getEmployees,
  updateEmployee,
  deleteEmployee
};
