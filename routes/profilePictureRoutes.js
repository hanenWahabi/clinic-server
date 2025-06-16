const express = require('express');
const router = express.Router();
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const { upload, handleMulterError } = require('../middlewares/uploadMiddleware');
const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/imagingService');
const Admin = require('../models/admin');
const logger = require('../utils/logger');

router.post('/:userId', 
  authenticateToken,
  checkBlacklist,
  upload.single('image'),
  handleMulterError,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const image = req.file;
      if (!image) {
        logger.warn('Aucune image fournie');
        return res.status(400).json({ success: false, message: 'Image requise', code: 400 });
      }

      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Utilisateur non trouvé: ${userId}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 404 });
      }

      user.profilePicture = `/uploads/${image.filename}`;
      await user.save();

      let profileModel;
      switch (user.role) {
        case 'patient': profileModel = Patient; break;
        case 'doctor': profileModel = Doctor; break;
        case 'laboratory': profileModel = Laboratory; break;
        case 'imaging_service': profileModel = MedicalImagingService; break;
        case 'admin': profileModel = Admin; break;
      }

      const profile = await profileModel.findOne({ userId });
      if (profile) {
        profile.profilePicture = user.profilePicture;
        await profile.save();
      }

      logger.info(`Photo de profil mise à jour pour userId: ${userId}`);
      res.status(200).json({
        success: true,
        data: { profilePicture: user.profilePicture },
        message: 'Photo de profil mise à jour',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;