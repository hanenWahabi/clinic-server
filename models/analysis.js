const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  laboratoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
  type: { type: String, required: true, trim: true },
  results: { type: Object, default: {} },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);