const express = require('express');
const router = express.Router();
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['patient']),
  async (req, res, next) => {
    try {
      logger.info(`Documents récupérés pour userId: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: [],
        message: 'Documents récupérés',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des documents: ${error.message}`);
      next(error);
    }
  }
);

module.exports = router;