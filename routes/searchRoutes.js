const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  [
    query('query').notEmpty().withMessage('Requête de recherche requise'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { query } = req.query;
      const searchRegex = new RegExp(query, 'i');

      const doctors = await Doctor.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { specialty: searchRegex },
        ],
      });
      const laboratories = await Laboratory.find({
        $or: [
          { name: searchRegex },
          { services: searchRegex },
        ],
      });
      const imagingServices = await MedicalImagingService.find({
        $or: [
          { name: searchRegex },
          { services: searchRegex },
        ],
      });

      logger.info(`Résultats de recherche pour query: ${query}`);
      res.status(200).json({
        success: true,
        data: {
          doctors,
          laboratories,
          imagingServices,
        },
        message: 'Résultats de recherche récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;