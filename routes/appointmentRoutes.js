const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Appointment = require('../models/appointment');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const Doctor = require('../models/doctor');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');
const consultationController = require('../controllers/consultationController');

// Middleware pour restreindre l'accès basé sur les rôles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for role: ${req.user.role}`);
      return res.status(403).json({ success: false, message: 'Accès non autorisé', code: 403 });
    }
    next();
  };
};

// Validation pour la création d'un rendez-vous
const validateAppointment = [
  body('patientId').isMongoId().withMessage('Patient ID invalide'),
  body('serviceId').isMongoId().withMessage('Service ID invalide'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Format date invalide (YYYY-MM-DD)'),
  body('time')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Format heure invalide (HH:MM)')
    .custom(value => {
      const [hours, minutes] = value.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Heure invalide : heures doivent être entre 00 et 23, minutes entre 00 et 59');
      }
      return true;
    }),
  body('status')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Statut invalide'),
  body('location').optional().isString().trim().notEmpty().withMessage('Lieu requis'),
];

// Route POST pour créer un rendez-vous
router.post(
  '/',
  authenticateToken,
  checkBlacklist,
  restrictTo('patient'), // Seuls les patients peuvent créer des rendez-vous
  validateAppointment,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          code: 400,
          errors: errors.array(),
        });
      }

      const { patientId, serviceId, date, time, status, location } = req.body;

      // Vérifier que l'utilisateur authentifié est le patient qui crée le rendez-vous
      if (req.user.userId !== patientId) {
        logger.warn(`User ${req.user.userId} tried to create appointment for patient ${patientId}`);
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez créer un rendez-vous que pour vous-même',
          code: 403,
        });
      }

      const appointment = new Appointment({
        patientId,
        serviceId,
        date: new Date(date),
        time,
        status,
        location,
      });

      // Déterminer le type de service et définir les champs correspondants
      const lab = await Laboratory.findById(serviceId);
      if (lab) {
        appointment.laboratoryId = serviceId;
        appointment.serviceModel = 'Laboratory';
      } else {
        const imaging = await MedicalImagingService.findById(serviceId);
        if (imaging) {
          appointment.imagingServiceId = serviceId;
          appointment.serviceModel = 'MedicalImagingService';
        } else {
          const doctor = await Doctor.findById(serviceId);
          if (doctor) {
            appointment.doctorId = serviceId;
            appointment.serviceModel = 'Doctor';
          } else {
            logger.warn(`Service non trouvé: ${serviceId}`);
            return res.status(404).json({
              success: false,
              message: 'Service non trouvé',
              code: 404,
            });
          }
        }
      }

      await appointment.save();
      logger.info(`Rendez-vous créé pour patientId: ${patientId}`);
      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Rendez-vous créé',
        code: 201,
      });
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        logger.warn(`Duplicate key error: ${field} (${value})`);
        return res.status(400).json({
          success: false,
          message: `Valeur en double pour ${field}: ${value}`,
          code: 400,
        });
      }
      next(error);
    }
  }
);

// Route GET pour l'historique des rendez-vous
router.get(
  '/history',
  authenticateToken,
  checkBlacklist,
  restrictTo('patient'), // Seuls les patients peuvent voir leur historique
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page doit être un entier positif'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit doit être un entier positif'),
    query('status')
      .optional()
      .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
      .withMessage('Statut invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          code: 400,
          errors: errors.array(),
        });
      }

      const { page = 1, limit = 10, status } = req.query;
      const query = { patientId: req.user.id };
      if (status) {
        query.status = status;
      }

      const appointments = await Appointment.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      logger.info(`Historique des rendez-vous récupéré pour userId: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: appointments,
        message: 'Historique récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);




module.exports = router;