const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: { type: String, trim: true, maxlength: 50 },
  lastName: { type: String, trim: true, maxlength: 50 },
  fatherName: { type: String, trim: true },
  dob: { type: Date },
  address: { type: String, trim: true, maxlength: 255 },
  phone: { type: String},
  email: { type: String, trim: true, lowercase: true },
  isCnamMember: { type: Boolean, default: false },
  cnamFileId: { type: String, trim: true },
  profilePicture: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);