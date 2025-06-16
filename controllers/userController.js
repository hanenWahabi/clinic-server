const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Laboratory = require('../models/laboratory');
const MedicalImagingService = require('../models/medicalImagingService');
const Admin = require('../models/admin');
const { param, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

exports.getAllUsers = [
  authenticateToken,
  checkBlacklist,
  restrictTo(['admin']),
  async (req, res) => {
    try {
      const users = await User.find().select('-password');
      logger.info(`Liste des utilisateurs récupérée par admin: ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Liste des utilisateurs',
        data: users,
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des utilisateurs: ${error.message}`, { stack: error.stack });
      return res.status(500).json({ success: false, message: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  },
];

const validateDeleteUser = [
  param('id').isMongoId().withMessage('ID utilisateur invalide'),
];

exports.deleteUser = [
  authenticateToken,
  checkBlacklist,
  restrictTo(['admin']),
  validateDeleteUser,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Erreur de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
    }

    try {
      const { id } = req.params;

      // Vérifier si l'utilisateur est l'admin courant
      if (id === req.user.id) {
        logger.warn(`Tentative de suppression de soi-même par admin: ${req.user.email}`);
        return res.status(403).json({ success: false, message: 'Vous ne pouvez pas vous supprimer vous-même' });
      }

      // Trouver l'utilisateur
      const user = await User.findById(id);
      if (!user) {
        logger.warn(`Utilisateur non trouvé pour suppression: ${id}`);
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }

      // Supprimer le profil associé selon le rôle
      switch (user.role) {
        case 'patient':
          await Patient.deleteOne({ userId: id });
          break;
        case 'doctor':
          await Doctor.deleteOne({ userId: id });
          break;
        case 'laboratory':
          await Laboratory.deleteOne({ userId: id });
          break;
        case 'imaging_service':
          await MedicalImagingService.deleteOne({ userId: id });
          break;
        case 'admin':
          await Admin.deleteOne({ userId: id });
          break;
        default:
          logger.warn(`Rôle inconnu pour utilisateur: ${user.role}`);
          return res.status(400).json({ success: false, message: 'Rôle utilisateur invalide' });
      }

      // Supprimer l'utilisateur
      await User.deleteOne({ _id: id });

      logger.info(`Utilisateur supprimé: ${user.email} par admin: ${req.user.email}`);
      return res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé avec succès',
      });
    } catch (error) {
      logger.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`, { stack: error.stack });
      return res.status(500).json({ success: false, message: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  },
];