
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const { authenticateToken } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validation rules from authController
const validateRegister = authController.validateRegister;
const validatePasswordResetRequest = authController.validatePasswordResetRequest;
const validatePasswordReset = authController.validatePasswordReset;

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', ...authController.login);
router.post('/validate-admin-code', adminController.validateAdminCode);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.post('/refresh', ...authController.refreshToken);
router.post('/request', ...authController.requestPasswordReset);
router.post('/reset', ...authController.resetPassword);

// Admin registration route
router.post(
  '/register-admin',
  [
    body('email').isEmail().normalizeEmail().withMessage('Format email invalide'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Mot de passe: 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial'),
    body('role').isIn(['ADMIN']).withMessage('Rôle invalide'),
    body('adminCode').notEmpty().withMessage('Code admin requis'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          code: 400,
          errors: errors.array(),
        });
      }

      const { email, password, role, adminCode, ...profileData } = req.body;
      
      const isValidCode = adminController.validateAdminCodeUtil({ body: { code: adminCode } });
      if (!isValidCode.data.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Code admin invalide',
          code: 400,
        });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email déjà utilisé',
          code: 400,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        profile: { ...profileData, adminCode }
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'Admin créé avec succès',
        code: 201,
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        code: 500
      });
    }
  }
);

module.exports = router;