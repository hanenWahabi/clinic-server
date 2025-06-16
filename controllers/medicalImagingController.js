const MedicalImagingService = require('../models/medicalImagingService');
const User = require('../models/user');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');

const validateGetImagingServices = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
];

exports.getImagingServices = [
  authenticateToken,
  checkBlacklist,
  validateGetImagingServices,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreur de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
    }

    try {
      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const imagingServices = await MedicalImagingService.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'email');

      const total = await MedicalImagingService.countDocuments();

      logger.info(`Services d'imagerie récupérés pour ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Services d\'imagerie récupérés avec succès',
        data: imagingServices,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des services d'imagerie: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
];