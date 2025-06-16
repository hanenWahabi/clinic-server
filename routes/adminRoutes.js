const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticateToken, checkBlacklist, checkRole } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

router.get('/', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  async (req, res, next) => {
    try {
      const users = await User.find({ role: 'ADMIN' }, '-password');
      logger.info(`Admins récupérés: ${users.length}`);
      res.status(200).json({
        success: true,
        data: users,
        message: 'Admins récupérés',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:adminId', 
  authenticateToken,
  checkBlacklist,
  checkRole(['admin']),
  async (req, res, next) => {
    try {
      const { adminId } = req.params;
      const user = await User.findOne({ _id: adminId, role: 'ADMIN' }, '-password');
      if (!user) {
        logger.warn(`Admin non trouvé: ${adminId}`);
        return res.status(404).json({ success: false, message: 'Admin non trouvé', code: 404 });
      }
      logger.info(`Profil admin récupéré: ${adminId}`);
      res.status(200).json({
        success: true,
        data: user,
        message: 'Profil récupéré',
        code: 200,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;