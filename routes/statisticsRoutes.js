const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const Appointment = require('../models/appointment');
const Consultation = require('../models/consultation');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin', 'doctor', 'laboratory', 'imaging_service']),
  [
    query('role').isIn(['admin', 'doctor', 'laboratory', 'imaging_service']).withMessage('Rôle invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { role } = req.query;
      let stats = {};

      switch (role) {
        case 'admin':
          stats = {
            totalUsers: await User.countDocuments(),
            totalPatients: await Patient.countDocuments(),
            totalDoctors: await Doctor.countDocuments(),
            totalLaboratories: await Laboratory.countDocuments(),
            totalImagingServices: await MedicalImagingService.countDocuments(),
            totalAppointments: await Appointment.countDocuments(),
            totalConsultations: await Consultation.countDocuments(),
          };
          break;
        case 'doctor':
          stats = {
            totalPatients: await Consultation.find({ doctorId: req.user.id }).distinct('patientId').countDocuments(),
            totalConsultations: await Consultation.countDocuments({ doctorId: req.user.id }),
            totalAppointments: await Appointment.countDocuments({ doctorId: req.user.id }),
          };
          break;
        case 'laboratory':
          stats = {
            totalAnalyses: await Analysis.countDocuments({ laboratoryId: req.user.id }),
            totalAppointments: await Appointment.countDocuments({ laboratoryId: req.user.id }),
          };
          break;
        case 'imaging_service':
          stats = {
            totalReports: await ImagingReport.countDocuments({ userId: req.user.id }),
            totalAppointments: await Appointment.countDocuments({ imagingServiceId: req.user.id }),
          };
          break;
      }

      logger.info(`Statistiques récupérées pour rôle: ${role}`);
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