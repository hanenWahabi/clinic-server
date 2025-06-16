const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', required: true },
  medications: [{
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
  }],
  instructions: { type: String, trim: true },
  pdfUrl: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'filled', 'cancelled'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);