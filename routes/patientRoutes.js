const express = require('express');
const router = express.Router();
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const Patient = require('../models/patient');
const Appointment = require('../models/appointment');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin']),
  async (req, res, next) => {
    try {
      const patients = await Patient.find();
      logger.info(`Patients récupérés: ${patients.length}`);
      res.status(200).json({
        success: true,
        data: patients,
        message: 'Patients récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/profile', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient']),
  async (req, res, next) => {
    try {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        logger.warn(`Profil patient non trouvé: ${req.user.id}`);
        return res.status(404).json({ success: false, message: 'Profil non trouvé', code: 404 });
      }
      logger.info(`Profil patient récupéré: ${req.user.email}`);
      res.status(200).json({
        success: true,
        data: patient,
        message: 'Profil récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:patientId/appointments', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const appointments = await Appointment.find({ patientId });
      logger.info(`Rendez-vous récupérés pour patientId: ${patientId}`);
      res.status(200).json({
        success: true,
        data: appointments,
        message: 'Rendez-vous récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:patientId/medical-history', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const appointments = await Appointment.find({ patientId });
      const consultations = await Consultation.find({ patientId });
      const prescriptions = await Prescription.find({ patientId });
      logger.info(`Historique médical récupéré pour patientId: ${patientId}`);
      res.status(200).json({
        success: true,
        data: { appointments, consultations, prescriptions },
        message: 'Historique médical récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;