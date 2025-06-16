const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Availability = require('../models/availability');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

const validateAvailability = [
  body('serviceId').isMongoId().withMessage('Service ID invalide'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Format date invalide (YYYY-MM-DD)'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Format heure invalide (HH:MM)'),
];

router.get('/', 
  authenticateToken,
  checkBlacklist,
  [
    query('role').isIn(['laboratory', 'imaging_service']).withMessage('Rôle invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { role } = req.query;
      let availabilities = [];
      if (role === 'laboratory') {
        const labs = await Laboratory.find();
        const labIds = labs.map(lab => lab._id);
        availabilities = await Availability.find({ serviceModel: 'Laboratory', serviceId: { $in: labIds } });
      } else if (role === 'imaging_service') {
        const imagingServices = await MedicalImagingService.find();
        const imagingIds = imagingServices.map(service => service._id);
        availabilities = await Availability.find({ serviceModel: 'MedicalImagingService', serviceId: { $in: imagingIds } });
      }

      logger.info(`Disponibilités récupérées pour rôle: ${role}`);
      res.status(200).json({
        success: true,
        data: availabilities,
        message: 'Disponibilités récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['laboratory', 'imaging_service']),
  validateAvailability,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { serviceId, date, time } = req.body;
      let serviceModel;
      let service;

      const lab = await Laboratory.findById(serviceId);
      if (lab) {
        serviceModel = 'Laboratory';
        service = lab;
      } else {
        const imaging = await MedicalImagingService.findById(serviceId);
        if (imaging) {
          serviceModel = 'MedicalImagingService';
          service = imaging;
        } else {
          logger.warn(`Service non trouvé: ${serviceId}`);
          return res.status(404).json({ success: false, message: 'Service non trouvé', code: 404 });
        }
      }

      const availability = new Availability({
        serviceId,
        serviceModel,
        date: new Date(date),
        time,
        status: 'available',
      });
      await availability.save();

      logger.info(`Disponibilité ajoutée pour serviceId: ${serviceId}`);
      res.status(201).json({
        success: true,
        data: availability,
        message: 'Disponibilité ajoutée',
        code: 201,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;