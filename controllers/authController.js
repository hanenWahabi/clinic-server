const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const logger = require('../utils/logger');
const { generateToken } = require('../utils/generateToken');
const { hashPassword, comparePassword } = require('../scripts/hash_passwords');
const bcrypt = require('bcrypt');

// Validation rules for registration
const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Mot de passe: 8+ caractères, 1 majuscule, 1 chiffre, 1 caractère spécial'),
  body('role')
    .isIn(['patient', 'doctor', 'laboratory', 'imaging_service', 'admin'])
    .withMessage('Rôle invalide'),
  body('firstName').trim().notEmpty().withMessage('Prénom requis').isLength({ max: 50 }).withMessage('Prénom max 50 caractères'),
  body('lastName').trim().notEmpty().withMessage('Nom requis').isLength({ max: 50 }).withMessage('Nom max 50 caractères'),
  body('phone').optional().matches(/^\+\d{1,4}\d{8,}$/).withMessage('Format téléphone invalide'),
  body('address').optional().isLength({ max: 255 }).withMessage('Adresse max 255 caractères'),
  // body('adminCode')
  //   .if(body('role').equals('admin'))
    // .equals('adminCLINIC')
    // .withMessage('Code admin invalide'),
];

// Validation rules for password reset
const validatePasswordResetRequest = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
];

const validatePasswordReset = [
  body('token').notEmpty().withMessage('Token requis'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Mot de passe: 8+ caractères, 1 majuscule, 1 chiffre, 1 caractère spécial'),
];

exports.validateRegister = validateRegister;
exports.validatePasswordResetRequest = validatePasswordResetRequest;
exports.validatePasswordReset = validatePasswordReset;

exports.register = async (req, res) => {
  let user = null;
  let profile = null;
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        code: 400,
        errors: errors.array(),
      });
    }

    const { email, password, role, firstName, lastName, phone, address, ...profileData } = req.body;
    
    // Vérifier si l'utilisateur existe déjà avec un timeout plus long
    const existingUser = await User.findOne({ email }).maxTimeMS(30000);
    if (existingUser) {
      logger.warn(`Email déjà utilisé: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Email déjà utilisé',
        code: 400,
      });
    }

    // Vérifier le code admin si le rôle est admin
    // if (role === 'admin' ) {
    //   logger.warn(`Code admin invalide pour: ${email}`);
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Code admin invalide',
    //     code: 400,
    //   });
    // }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le nouvel utilisateur
    user = new User({
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      phone,
      address,
    });

    await user.save();
    logger.info(`Utilisateur créé: ${email}`);

    // Créer le profil spécifique selon le rôle
    switch (role) {
      case 'patient':
        profile = new Patient({
          userId: user._id,
          firstName,
          lastName,
          email,
          phone,
          address,
          ...profileData
        });
        break;
      case 'doctor':
        profile = new Doctor({
          userId: user._id,
          firstName,
          lastName,
          email,
          phone,
          address,
          verificationStatus: 'pending',
          ...profileData
        });
        break;
      case 'laboratory':
        profile = new Laboratory({
          userId: user._id,
          name: `${firstName} ${lastName}`,
          email,
          phone,
          address,
          verificationStatus: 'pending',
          ...profileData
        });
        break;
      case 'imaging_service':
        profile = new MedicalImagingService({
          userId: user._id,
          name: `${firstName} ${lastName}`,
          email,
          phone,
          address,
          ...profileData
        });
        break;
    }

    if (profile) {
      await profile.save();
      logger.info(`Profil ${role} créé pour: ${email}`);
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      code: 201,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de l'inscription: ${error.message}`);
    // Si une erreur se produit après la création de l'utilisateur, le supprimer
    if (user && user._id) {
      await User.findByIdAndDelete(user._id);
      if (profile && profile._id) {
        await profile.constructor.findByIdAndDelete(profile._id);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      code: 500,
      error: error.message
    });
  }
};

exports.login = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: errors.array(),
          code: 400,
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
          code: 401,
        });
      }

      // Debug: Log the stored password hash and provided password
      logger.info(`Stored password hash for ${email}: ${user.password}`);
      logger.info(`Provided password: ${password}`);
      logger.info(`Password length: ${password.length}`);
      logger.info(`Hash length: ${user.password.length}`);

      // Verify the password hash format
      if (!user.password || (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$'))) {
        logger.error(`Stored password for ${email} is not a valid bcrypt hash: ${user.password}`);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur: Mot de passe mal formaté dans la base de données',
          code: 500,
        });
      }

      // Use the comparePassword utility function
      logger.info(`Mot de passe fourni: ${password}`);
      logger.info(`Mot de passe haché en base: ${user.password}`);
      logger.info(`Longueur du mot de passe fourni: ${password.length}`);
      logger.info(`Longueur du hash en base: ${user.password.length}`);
      
      const isMatch = await comparePassword(password, user.password);
      logger.info(`Résultat de la comparaison: ${isMatch}`);
      logger.info(`Format du hash en base: ${user.password.substring(0, 20)}...`);
      if (!isMatch) {
        logger.warn(`Mot de passe incorrect pour: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
          code: 401,
        });
      }

      const token = generateToken(user._id, email, user.role);

      const userResponse = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        phone: user.phone,
        address: user.address,
        fatherName: user.fatherName,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : undefined,
        isCnamMember: user.isCnamMember,
        cnamFileId: user.cnamFileId,
        specialty: user.specialty,
        licenseNumber: user.licenseNumber,
        hospital: user.hospital,
        services: user.services || [],
      };

      logger.info(`Connexion réussie: ${email}, ID: ${user._id}`);
      res.status(200).json({
        success: true,
        user: userResponse,
        token,
        message: 'Connexion réussie',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur connexion: ${error.message}`);
      next(error);
    }
  },
];

// Rest of the file remains unchanged (logout, refreshToken)
exports.logout = async (req, res, next) => {
  try {
    logger.info(`Utilisateur déconnecté: ${req.user.email}, ID: ${req.user.user_id}`);
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie (blacklisting disabled)',
      code: 200,
    });
  } catch (error) {
    logger.error(`Erreur déconnexion: ${error.message}`);
    next(error);
  }
};

exports.requestPasswordReset = [
  validatePasswordResetRequest,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: errors.array(),
          code: 400,
        });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        logger.warn(`Utilisateur non trouvé pour réinitialisation: ${email}`);
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
          code: 404,
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in user document
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      logger.info(`Demande de réinitialisation pour: ${email}`);
      res.status(200).json({
        success: true,
        message: 'Un email de réinitialisation a été envoyé',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur demande de réinitialisation: ${error.message}`);
      next(error);
    }
  },
];

exports.resetPassword = [
  validatePasswordReset,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: errors.array(),
          code: 400,
        });
      }

      const { token, password } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findOne({
        _id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        logger.warn(`Token de réinitialisation invalide ou expiré`);
        return res.status(400).json({
          success: false,
          message: 'Token invalide ou expiré',
          code: 400,
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user password and clear reset fields
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.info(`Mot de passe réinitialisé pour: ${user.email}`);
      res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur réinitialisation: ${error.message}`);
      next(error);
    }
  },
];

exports.refreshToken = [
  body('token').notEmpty().withMessage('Token requis'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: errors.array(),
          code: 400,
        });
      }

      const { token } = req.body;
      logger.info(`Token reçu pour rafraîchissement: ${token.substring(0, 20)}...`);
      logger.info(`Longueur du token: ${token.length}`);

      // Vérifier le format du token
      if (!token || typeof token !== 'string' || token.length < 10) {
        logger.warn(`Format de token invalide: ${token}`);
        return res.status(401).json({
          success: false,
          message: 'Format de token invalide',
          code: 401,
        });
      }

      // Vérifier le token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info(`Token décodé pour l'utilisateur: ${decoded.userId}`);

        const user = await User.findById(decoded.userId);
        if (!user) {
          logger.warn(`Utilisateur non trouvé pour rafraîchissement: ${decoded.userId}`);
          return res.status(401).json({
            success: false,
            message: 'Utilisateur non trouvé',
            code: 401,
          });
        }

        const newToken = generateToken(user._id, user.email, user.role);
        logger.info(`Nouveau token généré pour: ${user.email}`);

        res.status(200).json({
          success: true,
          token: newToken,
          message: 'Token rafraîchi avec succès',
          code: 200,
        });
      } catch (jwtError) {
        logger.error(`Erreur JWT: ${jwtError.message}`);
        return res.status(401).json({
          success: false,
          message: 'Token invalide ou expiré',
          code: 401,
        });
      }
    } catch (error) {
      logger.error(`Erreur rafraîchissement token: ${error.message}`);
      next(error);
    }
  },
];