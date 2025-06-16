const mongoose = require('mongoose');

const laboratorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String},
  address: { type: String, trim: true, maxlength: 255 },
  services: [{ type: String, trim: true }],
  licenseNumber: { type: String, trim: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  profilePicture: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Laboratory', laboratorySchema);