const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: { type: String, trim: true, maxlength: 50 },
  lastName: { type: String, trim: true, maxlength: 50 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String},
  address: { type: String, trim: true, maxlength: 255 },
  specialty: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  hospital: { type: String, trim: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  profilePicture: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);