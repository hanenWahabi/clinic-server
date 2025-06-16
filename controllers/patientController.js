const { body, validationResult } = require('express-validator');
const Patient = require('../models/patient');
const User = require('../models/user');
const { generateToken } = require('../utils/generateToken');
const logger = require('../utils/logger');

exports.registerPatient = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Mot de passe doit contenir 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('Prénom requis'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Nom requis'),
  body('fatherName').trim().isLength({ min: 2 }).withMessage('Nom du père requis'),
  body('dob').isISO8601().withMessage('Date de naissance invalide'), // Corrigé : dateDeNais → dob
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
      }

      const { email, password, firstName, lastName, fatherName, dob, phone, address, isCnamMember, cnamFileId } = req.body;

      // Vérifier l'unicité de l'email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn(`Email déjà utilisé: ${email}`);
        return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
      }

      // Créer l'utilisateur
      const user = new User({ email, password, role: 'patient' });
      await user.save();

      // Créer le patient
      const patient = new Patient({
        userId: user._id, // Corrigé : Ajout explicite de userId
        firstName,
        lastName,
        fatherName,
        dob,
        address,
        phone,
        email,
        isCnamMember: isCnamMember || false,
        cnamFileId,
      });
      await patient.save();

      const token = generateToken(user._id, email, 'patient');
      logger.info(`Patient inscrit: ${email}`);
      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
          id: patient._id,
          email,
          role: 'patient',
          firstName,
          lastName,
        },
        token,
      });
    } catch (error) {
      logger.error(`Erreur inscription patient: ${error.message}`);
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ success: false, message: `Valeur en double pour ${field}` });
      }
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
];

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      logger.warn(`Patient non trouvé: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    logger.error(`Erreur récupération patient: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const patients = await Patient.find()
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Patient.countDocuments();
    res.status(200).json({
      success: true,
      data: patients,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error(`Erreur liste patients: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updatePatient = [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('fatherName').optional().trim().isLength({ min: 2 }),
  body('dob').optional().isISO8601(),
  body('phone').optional().isMobilePhone(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
      }

      const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!patient) {
        logger.warn(`Patient non trouvé: ${req.params.id}`);
        return res.status(404).json({ success: false, message: 'Patient non trouvé' });
      }
      res.status(200).json({ success: true, data: patient });
    } catch (error) {
      logger.error(`Erreur mise à jour patient: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
];

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      logger.warn(`Patient non trouvé: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Patient non trouvé' });
    }
    await User.findByIdAndDelete(patient.userId);
    res.status(200).json({ success: true, message: 'Patient supprimé' });
  } catch (error) {
    logger.error(`Erreur suppression patient: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};