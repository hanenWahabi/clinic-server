const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Consultation = require('../models/consultation');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

// Validation rules for creating consultation
const validateCreateConsultation = [
  body('patientId').notEmpty().withMessage('Patient ID requis'),
  body('doctorId').notEmpty().withMessage('Doctor ID requis'),
  body('date').notEmpty().withMessage('Date requise'),
  body('symptoms').notEmpty().withMessage('Symptoms requis'),
  body('diagnosis').notEmpty().withMessage('Diagnostic requis'),
  body('treatment').notEmpty().withMessage('Traitement requis'),
];

// Endpoint pour créer une consultation
router.post('/',
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin']),
  validateCreateConsultation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: errors.array(),
          code: 400
        });
      }

      const { patientId, doctorId, date, symptoms, diagnosis, treatment } = req.body;
      const consultation = new Consultation({
        patientId,
        doctorId,
        date,
        symptoms,
        diagnosis,
        treatment
      });

      await consultation.save();
      logger.info(`Consultation créée avec succès: ${consultation._id}`);

      res.status(201).json({
        success: true,
        data: consultation,
        message: 'Consultation créée avec succès',
        code: 201
      });
    } catch (error) {
      logger.error(`Erreur lors de la création de la consultation: ${error.message}`);
      next(error);
    }
  }
);

// Endpoint pour récupérer toutes les consultations
router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'patient', 'admin']),
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { role } = req.user;
      
      let consultations;
      if (role === 'patient') {
        consultations = await Consultation.find({ patientId: userId });
      } else if (role === 'doctor') {
        consultations = await Consultation.find({ doctorId: userId });
      } else {
        consultations = await Consultation.find();
      }

      logger.info(`Consultations récupérées pour userId: ${userId}`);
      res.status(200).json({
        success: true,
        data: consultations,
        message: 'Consultations récupérées avec succès',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint pour récupérer une consultation spécifique
router.get('/:id', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'patient', 'admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultation = await Consultation.findById(id);
      
      if (!consultation) {
        logger.warn(`Consultation non trouvée: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Consultation non trouvée',
          code: 404
        });
      }

      logger.info(`Consultation récupérée: ${id}`);
      res.status(200).json({
        success: true,
        data: consultation,
        message: 'Consultation récupérée avec succès',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

const validateConsultation = [
  body('patientId').isMongoId().withMessage('Patient ID invalide'),
  body('doctorId').isMongoId().withMessage('Docteur ID invalide'),
  body('appointmentId').isMongoId().withMessage('Rendez-vous ID invalide'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Format date invalide (YYYY-MM-DD)'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Format heure invalide (HH:MM)'),
  body('status').isIn(['scheduled', 'in-progress', 'completed', 'cancelled']).withMessage('Statut invalide'),
];

router.post('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin']),
  validateConsultation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { patientId, doctorId, appointmentId, date, time, status } = req.body;
      const consultation = new Consultation({
        patientId,
        doctorId,
        appointmentId,
        date: new Date(date),
        time,
        status,
      });
      await consultation.save();

      logger.info(`Consultation créée pour patientId: ${patientId}`);
      res.status(201).json({
        success: true,
        data: consultation,
        message: 'Consultation créée',
        code: 201,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/start-video', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'patient']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultation = await Consultation.findById(id);
      if (!consultation) {
        logger.warn(`Consultation non trouvée: ${id}`);
        return res.status(404).json({ success: false, message: 'Consultation non trouvée', code: 404 });
      }

      consultation.status = 'in-progress';
      consultation.videoRoomId = `room-${id}`;
      await consultation.save();

      logger.info(`Consultation vidéo démarrée: ${id}`);
      res.status(200).json({
        success: true,
        data: { videoRoomId: consultation.videoRoomId },
        message: 'Consultation vidéo démarrée',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/end-video', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultation = await Consultation.findById(id);
      if (!consultation) {
        logger.warn(`Consultation non trouvée: ${id}`);
        return res.status(404).json({ success: false, message: 'Consultation non trouvée', code: 404 });
      }

      consultation.status = 'completed';
      await consultation.save();

      logger.info(`Consultation vidéo terminée: ${id}`);
      res.status(200).json({
        success: true,
        message: 'Consultation vidéo terminée',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/validate', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultation = await Consultation.findById(id);
      if (!consultation) {
        logger.warn(`Consultation non trouvée: ${id}`);
        return res.status(404).json({ success: false, message: 'Consultation non trouvée', code: 404 });
      }

      consultation.status = 'completed';
      await consultation.save();

      logger.info(`Consultation validée: ${id}`);
      res.status(200).json({
        success: true,
        message: 'Consultation validée',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;