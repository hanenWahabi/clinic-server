const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const ImagingReport = require('../models/imagingReport');
const MedicalImagingService = require('../models/imagingService');
const { upload, handleMulterError } = require('../middlewares/uploadMiddleware');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const config = require('config');

const validateUploadImaging = [
  body('userId').optional().isMongoId().withMessage('User ID invalide'),
];

// Get all imaging services (public access)
router.get('/', async (req, res, next) => {
  try {
    const services = await MedicalImagingService.find().lean();
    logger.info(`Services d'imagerie récupérés: ${services.length}`);
    res.status(200).json({
      success: true,
      data: services,
      message: 'Services récupérés',
      code: 200,
    });
  } catch (error) {
    logger.error(`Erreur récupération services d'imagerie: ${error.message}`);
    next(error);
  }
});

// Placeholder for imaging requests (to be implemented or removed)
router.get('/requests', authenticateToken, checkBlacklist, async (req, res, next) => {
  try {
    logger.info(`Requêtes d'imagerie récupérées, par utilisateur: ${req.user.user_id}`);
    res.status(200).json({
      success: true,
      data: [], // TODO: Implement logic to fetch imaging requests
      message: 'Requêtes récupérées',
      code: 200,
    });
  } catch (error) {
    logger.error(`Erreur récupération requêtes d'imagerie: ${error.message}`);
    next(error);
  }
});

// Get imaging reports for a specific user (user, doctor, or admin access)
router.get(
  '/:userId',
  authenticateToken,
  checkBlacklist,
  checkRole(['patient', 'doctor', 'admin']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      // If not admin or doctor, ensure the user is accessing their own reports
      if (req.user.role !== 'admin' && req.user.role !== 'doctor' && req.user.user_id !== userId) {
        logger.warn(`Accès non autorisé aux rapports: user ${req.user.user_id}, requested user ${userId}`);
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé',
          code: 403,
        });
      }

      const reports = await ImagingReport.find({ userId }).lean();
      logger.info(`Rapports d'imagerie récupérés pour userId: ${userId}, par utilisateur: ${req.user.user_id}`);
      res.status(200).json({
        success: true,
        data: reports,
        message: 'Rapports récupérés',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur récupération rapports d'imagerie: ${error.message}`);
      next(error);
    }
  }
);

// Upload an image for AI prediction (public access)
router.post(
  '/upload',
  upload.single('image'),
  handleMulterError,
  validateUploadImaging,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          code: 400,
          errors: errors.array(),
        });
      }

      const { userId } = req.body;
      const image = req.file;

      if (!image) {
        logger.warn('Aucune image fournie');
        return res.status(400).json({
          success: false,
          message: 'Image requise',
          code: 400,
        });
      }

      // Ensure AI_BASE_URL is configured
      const aiBaseUrl = config.get('aiBaseUrl') || process.env.AI_BASE_URL;
      if (!aiBaseUrl) {
        logger.error('AI_BASE_URL non défini dans la configuration');
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur: URL de l\'API AI manquante',
          code: 500,
        });
      }

      const formData = new FormData();
      formData.append('image', image.buffer, { filename: image.originalname });

      const response = await axios.post(`${aiBaseUrl}/v1/predict-image`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      // Validate AI response structure
      if (!response.data || !response.data.data || !response.data.data.result) {
        logger.error('Réponse AI mal formée');
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur: Réponse AI mal formée',
          code: 500,
        });
      }

      // Si userId est fourni, sauvegarder le rapport
      if (userId) {
        const report = new ImagingReport({
          userId,
          imagePath: image.originalname,
          result: response.data.data.result,
        });
        await report.save();
        logger.info(`Rapport d'imagerie créé pour userId: ${userId}`);
      }

      res.status(201).json({
        success: true,
        data: {
          result: response.data.data.result,
          reportId: userId ? report._id : null
        },
        message: 'Analyse terminée',
        code: 201,
      });
    } catch (error) {
      if (error.isAxiosError) {
        logger.error(`Erreur lors de la requête AI: ${error.response?.data?.message || error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur: Échec de la prédiction AI',
          code: 500,
        });
      }
      logger.error(`Erreur lors de l'upload d'image: ${error.message}`);
      next(error);
    }
  }
);

module.exports = router;