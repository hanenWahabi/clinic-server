const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  serviceModel: { type: String, enum: ['Laboratory', 'MedicalImagingService'], required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['available', 'booked'], default: 'available' },
}, { timestamps: true });

module.exports = mongoose.model('Availability', availabilitySchema);