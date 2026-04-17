const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
const registerUser = async (req, res) => {
  const { name, email, password, role, employeeId, phone } = req.body;

  try {
    const userExists = await User.findOne({ email, platform: 'sbi_portal' });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      employeeId,
      phone,
      platform: 'sbi_portal'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email: identifier, password } = req.body;
  console.log('Login attempt:', identifier);

  try {
    // Search for user by email or phone
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ],
      platform: 'sbi_portal'
    }).select('+password');

    if (user) {
      let isMatch = false;

      // Conditional password matching based on role
      if (user.role === 'admin') {
        // Admins can log in with email or phone but must use their set password
        isMatch = await user.matchPassword(password);
      } else {
        // Employee and Team Leader use their mobile number as password
        isMatch = (password === user.phone);
      }

      console.log(`User found (${user.role}), password match:`, isMatch);
      
      if (isMatch) {
         res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          token: generateToken(user._id),
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      console.log('User not found');
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
