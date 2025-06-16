const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['credit_card', 'debit_card', 'cash', 'cnam', 'bank_transfer'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);