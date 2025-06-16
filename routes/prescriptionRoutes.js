const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Prescription = require('../models/prescription');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

const validatePrescription = [
  body('patientId').isMongoId().withMessage('Patient ID invalide'),
  body('consultationId').isMongoId().withMessage('Consultation ID invalide'),
  body('medications').isArray({ min: 1 }).withMessage('Au moins un médicament requis'),
  body('medications.*.name').isString().trim().notEmpty().withMessage('Nom du médicament requis'),
  body('medications.*.dosage').isString().trim().notEmpty().withMessage('Dosage requis'),
  body('medications.*.frequency').isString().trim().notEmpty().withMessage('Fréquence requise'),
  body('medications.*.duration').isString().trim().notEmpty().withMessage('Durée requise'),
  body('instructions').optional().isString().trim(),
  body('pdfUrl').optional().isString().trim(),
];

router.post('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor']),
  validatePrescription,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { patientId, consultationId, medications, instructions, pdfUrl } = req.body;
      const prescription = new Prescription({
        patientId,
        doctorId: req.user.id,
        consultationId,
        medications,
        instructions,
        pdfUrl,
        status: 'pending',
      });
      await prescription.save();

      logger.info(`Ordonnance créée pour patientId: ${patientId}`);
      res.status(201).json({
        success: true,
        data: prescription,
        message: 'Ordonnance créée',
        code: 201,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/patient/:patientId', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const prescriptions = await Prescription.find({ patientId });
      logger.info(`Ordonnances récupérées pour patientId: ${patientId}`);
      res.status(200).json({
        success: true,
        data: prescriptions,
        message: 'Ordonnances récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;