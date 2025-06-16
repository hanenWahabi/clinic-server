const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const User = require('../models/user');
const Admin = require('../models/admin');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');
const { hashPassword } = require('../utils/passwordUtils');

const validateUser = [
  body('email').isEmail().normalizeEmail().withMessage('Format email invalide'),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
    .withMessage('Mot de passe: 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial'),
  body('firstName').optional().isString().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().isString().trim().notEmpty().isLength({ max: 50 }),
  body('role').isIn(['admin']).withMessage('Rôle invalide pour cette route'),
];

const validateUpdateUser = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Format email invalide'),
  body('name').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().matches(/^\+\d{1,4}\d{8,}$/).withMessage('Format téléphone invalide'),
  body('role').optional().isIn(['admin', 'patient', 'doctor', 'laboratory', 'imaging_service']).withMessage('Rôle invalide'),
];

const validateVerifyUser = [
  body('verificationStatus').isIn(['verified', 'rejected']).withMessage('Statut de vérification invalide'),
];

// Create admin user
router.post('/admin/add-admin', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  validateUser,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { email, password, firstName, lastName, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn(`Email déjà utilisé: ${email}`);
        return res.status(400).json({ success: false, message: 'Email déjà utilisé', code: 400 });
      }

      const user = new User({
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        role,
      });
      await user.save();

      const admin = new Admin({
        userId: user._id,
        firstName,
        lastName,
        email,
      });
      await admin.save();

      logger.info(`Admin créé: ${email}`);
      res.status(201).json({
        success: true,
        data: { id: user._id, email: user.email, role: user.role },
        message: 'Administrateur ajouté avec succès',
        code: 201,
      });
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        logger.warn(`Duplicate key error: ${field}`);
        return res.status(400).json({ success: false, message: `Valeur en double pour ${field}`, code: 400 });
      }
      next(error);
    }
  }
);

// Get current user
router.get('/me', 
  authenticateToken,
  checkBlacklist,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${req.user.id}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      let profile;
      switch (user.role) {
        case 'patient': profile = await Patient.findOne({ userId: user._id }); break;
        case 'doctor': profile = await Doctor.findOne({ userId: user._id }); break;
        case 'laboratory': profile = await Laboratory.findOne({ userId: user._id }); break;
        case 'imaging_service': profile = await MedicalImagingService.findOne({ userId: user._id }); break;
        case 'admin': profile = await Admin.findOne({ userId: user._id }); break;
      }

      logger.info(`Profil utilisateur récupéré: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: { ...user.toJSON(), profile: profile ? profile.toJSON() : null },
        message: 'Profil récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user profile
router.get('/:userId', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin', 'doctor']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select('-password');
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      let profile;
      switch (user.role) {
        case 'patient': profile = await Patient.findOne({ userId }); break;
        case 'doctor': profile = await Doctor.findOne({ userId }); break;
        case 'laboratory': profile = await Laboratory.findOne({ userId }); break;
        case 'imaging_service': profile = await MedicalImagingService.findOne({ userId }); break;
        case 'admin': profile = await Admin.findOne({ userId }); break;
      }

      logger.info(`Profil utilisateur récupéré: ${userId}`);
      res.status(200).json({
        success: true,
        data: { ...user.toJSON(), profile: profile ? profile.toJSON() : null },
        message: 'Profil récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users or pending users
router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  [
    query('verificationStatus').optional().isIn(['pending', 'verified', 'rejected']).withMessage('Statut de vérification invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { verificationStatus } = req.query;
      const query = verificationStatus ? { verificationStatus } : {};
      const users = await User.find(query).select('-password');
      logger.info(`Utilisateurs récupérés: ${users.length}`);
      res.status(200).json({
        success: true,
        data: users,
        message: 'Utilisateurs récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify user
router.post('/:userId/verify', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  validateVerifyUser,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { userId } = req.params;
      const { verificationStatus } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      user.verificationStatus = verificationStatus;
      await user.save();

      let profileModel;
      switch (user.role) {
        case 'patient': profileModel = Patient; break;
        case 'doctor': profileModel = Doctor; break;
        case 'laboratory': profileModel = Laboratory; break;
        case 'imaging_service': profileModel = MedicalImagingService; break;
        case 'admin': profileModel = Admin; break;
      }

      const profile = await profileModel.findOne({ userId });
      if (profile) {
        profile.verificationStatus = verificationStatus;
        await profile.save();
      }

      logger.info(`Utilisateur vérifié: ${userId} (${verificationStatus})`);
      res.status(200).json({
        success: true,
        data: { id: user._id, verificationStatus },
        message: 'Utilisateur mis à jour',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user
router.put('/:userId', 
  authenticateToken,
  checkBlacklist,
  validateUpdateUser,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { userId } = req.params;
      const { email, name, phone, role } = req.body;

      if (userId === req.user.id && req.user.role !== 'admin') {
        logger.warn(`Tentative de modification de son propre compte: ${userId}`);
        return res.status(403).json({ success: false, message: 'Vous ne pouvez pas modifier votre propre compte', code: 403 });
      }

      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      if (email) user.email = email;
      if (name) {
        user.name = name;
        user.firstName = name.split(' ')[0];
        user.lastName = name.split(' ').slice(1).join(' ') || name;
      }
      if (phone) user.phone = phone;
      if (role && req.user.role === 'admin') user.role = role;
      await user.save();

      let profileModel;
      switch (user.role) {
        case 'admin': profileModel = Admin; break;
        case 'patient': profileModel = Patient; break;
        case 'doctor': profileModel = Doctor; break;
        case 'laboratory': profileModel = Laboratory; break;
        case 'imaging_service': profileModel = MedicalImagingService; break;
      }

      const profile = await profileModel.findOne({ userId });
      if (profile) {
        if (email) profile.email = email;
        if (name) {
          if (user.role === 'laboratory' || user.role === 'imaging_service') {
            profile.name = name;
          } else {
            profile.firstName = name.split(' ')[0];
            profile.lastName = name.split(' ').slice(1).join(' ') || name;
          }
        }
        if (phone) profile.phone = phone;
        await profile.save();
      }

      logger.info(`Utilisateur mis à jour: ${userId}`);
      res.status(200).json({
        success: true,
        data: { id: user._id, email: user.email, role: user.role },
        message: 'Utilisateur mis à jour avec succès',
        code: 200,
      });
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        logger.warn(`Duplicate key error: ${field}`);
        return res.status(400).json({ success: false, message: `Valeur en double pour ${field}`, code: 400 });
      }
      next(error);
    }
  }
);

// Delete user
router.delete('/:userId', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      if (userId === req.user.id) {
        logger.warn(`Tentative de suppression de son propre compte: ${userId}`);
        return res.status(403).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte', code: 403 });
      }

      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      let profileModel;
      switch (user.role) {
        case 'patient': profileModel = Patient; break;
        case 'doctor': profileModel = Doctor; break;
        case 'laboratory': profileModel = Laboratory; break;
        case 'imaging_service': profileModel = MedicalImagingService; break;
        case 'admin': profileModel = Admin; break;
      }

      await profileModel.deleteOne({ userId });
      await User.deleteOne({ _id: userId });

      logger.info(`Utilisateur supprimé: ${userId}`);
      res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé avec succès',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin statistics
router.get('/admin/statistics', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  async (req, res, next) => {
    try {
      const stats = {
        totalUsers: await User.countDocuments(),
        totalPatients: await Patient.countDocuments(),
        totalDoctors: await Doctor.countDocuments(),
        totalLaboratories: await Laboratory.countDocuments(),
        totalImagingServices: await MedicalImagingService.countDocuments(),
      };
      logger.info('Statistiques admin récupérées');
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Statistiques récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;