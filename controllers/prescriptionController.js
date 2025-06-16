const mongoose = require('mongoose');
const Prescription = require('../models/prescription');
const logger = require('../utils/logger');

exports.createPrescription = async (req, res) => {
  try {
    const { doctorId, patientId, consultationId, medications, instructions } = req.body;

    if (!doctorId || !patientId || !consultationId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, error: 'Les champs doctorId, patientId, consultationId et medications sont requis' });
    }

    const prescription = new Prescription({
      doctorId,
      patientId,
      consultationId,
      medications,
      instructions: instructions || '',
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await prescription.save();
    logger.info(`Prescription créée pour patientId: ${patientId}`);
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    logger.error(`Erreur lors de la création de la prescription: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPrescriptionsByPatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, error: 'ID patient invalide' });
    }

    const prescriptions = await Prescription.find({ patientId }).populate('doctorId consultationId');
    res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des prescriptions: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};