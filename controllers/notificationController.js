const Notification = require('../models/notification');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');

const validateGetNotifications = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
];

exports.getNotifications = [
  authenticateToken,
  checkBlacklist,
  validateGetNotifications,
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

      const notifications = await Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Notification.countDocuments({ userId: req.user.id });

      logger.info(`Notifications récupérées pour ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Notifications récupérées avec succès',
        data: notifications,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des notifications: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
];