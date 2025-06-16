const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const Laboratory = require('../models/laboratory');
const Analysis = require('../models/analysis');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  async (req, res, next) => {
    try {
      const laboratories = await Laboratory.find();
      logger.info(`Laboratoires récupérés: ${laboratories.length}`);
      res.status(200).json({
        success: true,
        data: laboratories,
        message: 'Laboratoires récupérés',
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
  [
    body('serviceName').notEmpty().withMessage('Nom du service requis'),
    body('userId').isMongoId().withMessage('User ID invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { serviceName, userId } = req.body;
      const laboratory = await Laboratory.findOne({ userId });
      if (!laboratory) {
        logger.warn(`Laboratoire non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Laboratoire non trouvé', code: 404 });
      }

      const analysis = new Analysis({
        userId,
        laboratoryId: laboratory._id,
        type: serviceName,
        results: {},
        status: 'pending',
      });
      await analysis.save();

      logger.info(`Service de laboratoire demandé: ${serviceName} pour userId: ${userId}`);
      res.status(200).json({
        success: true,
        data: analysis,
        message: 'Demande de service enregistrée',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/history/:userId', 
  authenticateToken,
  checkBlacklist,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const analyses = await Analysis.find({ userId });
      logger.info(`Historique des analyses récupéré pour userId: ${userId}`);
      res.status(200).json({
        success: true,
        data: analyses,
        message: 'Historique récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;