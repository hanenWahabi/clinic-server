const axios = require('axios');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const FormData = require('form-data');

const validateUploadImaging = [
  body('userId').isMongoId().withMessage('ID utilisateur invalide'),
];

exports.uploadImaging = [
  authenticateToken,
  checkBlacklist,
  validateUploadImaging,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreur de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
    }

    try {
      const { userId } = req.body;
      const image = req.file;
      if (!image) {
        logger.warn('Aucun fichier image fourni');
        return res.status(400).json({ success: false, message: 'Aucun fichier image fourni' });
      }

      const formData = new FormData();
      formData.append('image', image.buffer, { filename: image.originalname });

      const response = await axios.post(`${process.env.AI_BASE_URL}/predict-image`, formData, {
        headers: { ...formData.getHeaders() },
      });

      const db = mongoose.connection.db;
      const imagingCollection = db.collection('imagingReports');
      const report = {
        userId: new mongoose.Types.ObjectId(userId),
        imagePath: image.originalname,
        result: response.data.data,
        createdAt: new Date(),
      };

      const result = await imagingCollection.insertOne(report);
      logger.info(`Rapport d'imagerie téléversé pour userId ${userId}`);
      return res.status(201).json({
        success: true,
        message: 'Image téléversée et analysée',
        data: { id: result.insertedId, ...report },
      });
    } catch (error) {
      logger.error(`Erreur lors du téléversement: ${error.message}`, { stack: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors du téléversement de l\'image',
        details: error.response?.data?.error || error.message,
      });
    }
  },
];