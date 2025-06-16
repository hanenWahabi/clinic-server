const Laboratory = require('../models/laboratory');
const User = require('../models/user');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');

const validateGetLaboratories = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
];

exports.getLaboratories = [
  authenticateToken,
  checkBlacklist,
  validateGetLaboratories,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreur de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
    }

    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const laboratories = await Laboratory.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'email firstName lastName phone');

      const total = await Laboratory.countDocuments();

      logger.info(`Laboratoires récupérés pour ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Laboratoires récupérés avec succès',
        data: laboratories,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des laboratoires: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
];