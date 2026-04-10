const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private/Admin
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, type, targetCount } = req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      type,
      targetCount,
      createdBy: req.user._id
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all tasks (Admin see all, Employee see assigned)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query = { assignedTo: req.user._id };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name employeeId')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status or achieved count
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update logic
    if (req.body.status) task.status = req.body.status;
    if (req.body.achievedCount !== undefined) {
      task.achievedCount = req.body.achievedCount;
      // Auto-complete if target met
      if (task.targetCount > 0 && task.achievedCount >= task.targetCount) {
        task.status = 'Completed';
      }
    }

    // Admin can edit everything
    if (req.user.role === 'admin') {
      task.title = req.body.title || task.title;
      task.description = req.body.description || task.description;
      task.priority = req.body.priority || task.priority;
      task.dueDate = req.body.dueDate || task.dueDate;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await task.deleteOne();
    res.json({ message: 'Task removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask
};
