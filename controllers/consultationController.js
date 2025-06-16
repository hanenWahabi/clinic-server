const { body, validationResult } = require('express-validator');
const Consultation = require('../models/consultation');
const Appointment = require('../models/appointment'); // Corrigé : Standardisé
const logger = require('../utils/logger');

exports.createConsultation = [
  body('patientId').isMongoId().withMessage('Patient ID invalide'),
  body('doctorId').isMongoId().withMessage('Docteur ID invalide'),
  body('appointmentId').isMongoId().withMessage('Rendez-vous ID invalide'),
  body('date').isISO8601().withMessage('Date invalide'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Erreurs de validation: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', errors: errors.array() });
      }

      const { patientId, doctorId, appointmentId, date, time, notes, prescriptionId } = req.body;

      // Vérifier l'existence du rendez-vous
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        logger.warn(`Rendez-vous non trouvé: ${appointmentId}`);
        return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
      }

      // TODO: Intégrer un service WebRTC (par exemple, Agora) pour générer un videoRoomId dynamique
      const videoRoomId = `agora_channel_${appointmentId}`; // Placeholder : Remplacer par Agora SDK

      const consultation = new Consultation({
        patientId,
        doctorId,
        appointmentId,
        date,
        time,
        status: 'pending',
        videoRoomId,
        notes,
        prescriptionId,
      });
      await consultation.save();

      logger.info(`Consultation créée: ${consultation._id}`);
      res.status(201).json({ success: true, data: consultation });
    } catch (error) {
      logger.error(`Erreur création consultation: ${error.message}`);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
];

exports.getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      logger.warn(`Consultation non trouvée: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Consultation non trouvée' });
    }
    res.status(200).json({ success: true, data: consultation });
  } catch (error) {
    logger.error(`Erreur récupération consultation: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getConsultations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const consultations = await Consultation.find({ $or: [{ patientId: req.user.user_id }, { doctorId: req.user.user_id }] })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1 });
    const total = await Consultation.countDocuments({ $or: [{ patientId: req.user.user_id }, { doctorId: req.user.user_id }] });
    res.status(200).json({
      success: true,
      data: consultations,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error(`Erreur liste consultations: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.startConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      logger.warn(`Consultation non trouvée: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Consultation non trouvée' });
    }

    // TODO: Générer un token Agora pour la vidéoconférence
    const channel = consultation.videoRoomId;
    res.status(200).json({ success: true, data: { videoRoomId: channel } });
  } catch (error) {
    logger.error(`Erreur démarrage consultation: ${error.message}`);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};