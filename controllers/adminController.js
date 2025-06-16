const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin code from environment variable
const ADMIN_CODE = process.env.ADMIN_SECRET_KEY;

const validateAdminCode = (req) => {
  const { code } = req.body;
  return {
    success: true,
    data: { isValid: code === ADMIN_CODE }
  };
};

exports.validateAdminCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }
    const result = validateAdminCode(req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// Export the utility function for use in other controllers
exports.validateAdminCodeUtil = validateAdminCode;

exports.registerUser = async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;
    
    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and role are required' 
      });
    }

    // Validate role
    const validRoles = ['PATIENT', 'DOCTOR', 'LABORATORY', 'IMAGING_SERVICE', 'ADMIN'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role' 
      });
    }

    // For admin registration, validate admin code
    if (role.toUpperCase() === 'ADMIN') {
      if (!profileData.adminCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'Admin code is required for admin registration' 
        });
      }
      if (profileData.adminCode !== ADMIN_CODE) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid admin code' 
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      role: role.toUpperCase(),
      profile: profileData
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token
      }
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'doctor', 'pharmacy', 'laboratory', 'patient', 'imaging_service'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id === userId) {
      return res.status(403).json({ success: false, message: 'Admin cannot delete themselves' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};