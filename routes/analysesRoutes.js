const express = require('express');
const router = express.Router();
const Analysis = require('../models/analysis');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'laboratory', 'admin']),
  async (req, res, next) => {
    try {
      const analyses = await Analysis.find({ userId: req.user.id });
      logger.info(`Analyses récupérées pour userId: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: analyses,
        message: 'Analyses récupérées',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;