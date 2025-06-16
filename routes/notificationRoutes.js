const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  async (req, res, next) => {
    try {
      const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
      logger.info(`Notifications récupérées pour userId: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: notifications,
        message: 'Notifications récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;