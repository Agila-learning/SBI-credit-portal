const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTask, deleteTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(authorize('admin', 'team_leader'), createTask);

router.route('/:id')
  .put(updateTask)
  .delete(authorize('admin', 'team_leader'), deleteTask);

module.exports = router;
