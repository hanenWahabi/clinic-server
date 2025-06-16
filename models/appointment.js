const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serviceModel: {
      type: String,
      enum: ['Doctor', 'Laboratory', 'MedicalImagingService'],
      required: true,
    },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    laboratoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory' },
    imagingServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalImagingService' },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

// Validation personnalisée pour s'assurer que le champ lié correspond à serviceModel
appointmentSchema.pre('validate', async function (next) {
  if (this.serviceModel === 'Doctor' && !this.doctorId) {
    this.invalidate('doctorId', 'doctorId est requis lorsque serviceModel est Doctor');
  } else if (this.serviceModel === 'Laboratory' && !this.laboratoryId) {
    this.invalidate('laboratoryId', 'laboratoryId est requis lorsque serviceModel est Laboratory');
  } else if (this.serviceModel === 'MedicalImagingService' && !this.imagingServiceId) {
    this.invalidate(
      'imagingServiceId',
      'imagingServiceId est requis lorsque serviceModel est MedicalImagingService'
    );
  }
  next();
});

// Ajout d'index pour optimiser les requêtes
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ laboratoryId: 1 });
appointmentSchema.index({ imagingServiceId: 1 });
appointmentSchema.index({ date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);