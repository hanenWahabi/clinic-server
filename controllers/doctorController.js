const Doctor = require('../models/doctor');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');
const { generateToken } = require('../utils/generateToken');

// Validation pour l'inscription d'un docteur
const validateRegisterDoctor = [
  body('email').isEmail().normalizeEmail().withMessage('Format email invalide'),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial'),
  body('firstName').trim().notEmpty().withMessage('Prénom requis').isLength({ max: 50 }).withMessage('Prénom max 50 caractères'),
  body('lastName').trim().notEmpty().withMessage('Nom requis').isLength({ max: 50 }).withMessage('Nom max 50 caractères'),
  body('specialty').trim().notEmpty().withMessage('Spécialité requise').isLength({ max: 50 }).withMessage('Spécialité max 50 caractères'),
  body('licenseNumber').trim().notEmpty().withMessage('Numéro de licence requis').isLength({ max: 50 }).withMessage('Numéro de licence max 50 caractères'),
  body('hospital').optional().isLength({ max: 100 }).withMessage('Hôpital max 100 caractères'),
  body('phone').optional().matches(/^\+\d{1,4}\d{8,}$/).withMessage('Format téléphone invalide'),
  body('address').optional().isLength({ min: 5, max: 255 }).withMessage('Adresse entre 5 et 255 caractères'),
];

// Route pour enregistrer un docteur
exports.registerDoctor = [
  validateRegisterDoctor,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreur de validation lors de l'inscription docteur: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
    }

    try {
      const { email, password, firstName, lastName, specialty, licenseNumber, hospital, phone, address } = req.body;

      // Vérifier si l'email ou le téléphone existe
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        logger.warn(`Utilisateur existant: ${email} ou ${phone}`);
        return res.status(400).json({
          success: false,
          message: existingUser.email === email ? 'Cet email est déjà utilisé' : 'Ce numéro de téléphone est déjà utilisé',
        });
      }

      // Créer l'utilisateur principal
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        email,
        password: hashedPassword,
        role: 'doctor',
        firstName,
        lastName,
        phone,
        address,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await user.save();

      // Créer le profil docteur
      const doctor = new Doctor({
        userId: user._id,
        firstName,
        lastName,
        email,
        specialty,
        licenseNumber,
        hospital,
        verificationStatus: 'pending',
        phone,
        address,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await doctor.save();

      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      logger.info(`Docteur inscrit: ${email}`);
      return res.status(201).json({
        success: true,
        message: 'Docteur créé',
        data: { id: user._id, email, role: 'doctor', firstName, lastName },
        token,
      });
    } catch (error) {
      logger.error(`Erreur lors de l'inscription docteur: ${error.message}`);
      if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ success: false, message: `Valeur en double pour ${field}` });
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
        return res.status(400).json({ success: false, message: 'Erreur de validation', errors });
      }
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
];

// Route pour récupérer la liste des docteurs (admin uniquement)
exports.getDoctors = [
  authenticateToken,
  checkBlacklist,
  restrictTo(['admin']),
  async (req, res) => {
    try {
      const doctors = await Doctor.find().populate('userId', 'email firstName lastName phone');
      logger.info(`Liste des docteurs récupérée par admin: ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Liste des docteurs',
        data: doctors,
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des docteurs: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
];