const express = require('express');
const router = express.Router();
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const Doctor = require('../models/doctor');
const Patient = require('../models/patient');
const Consultation = require('../models/consultation');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'admin']),
  async (req, res, next) => {
    try {
      const doctors = await Doctor.find();
      logger.info(`Docteurs récupérés: ${doctors.length}`);
      res.status(200).json({
        success: true,
        data: doctors,
        message: 'Docteurs récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin', 'patient']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const doctor = await Doctor.findOne({ userId: id });
      if (!doctor) {
        logger.warn(`Docteur non trouvé: ${id}`);
        return res.status(404).json({ success: false, message: 'Docteur non trouvé', code: 404 });
      }
      logger.info(`Profil docteur récupéré: ${id}`);
      res.status(200).json({
        success: true,
        data: doctor,
        message: 'Profil récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id/patients', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultations = await Consultation.find({ doctorId: id }).distinct('patientId');
      const patients = await Patient.find({ userId: { $in: consultations } });
      logger.info(`Patients récupérés pour docteur: ${id}`);
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

router.get('/:id/consultations', 
  authenticateToken,
  checkBlacklist,
  checkRole(['doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const consultations = await Consultation.find({ doctorId: id });
      logger.info(`Consultations récupérées pour docteur: ${id}`);
      res.status(200).json({
        success: true,
        data: consultations,
        message: 'Consultations récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;