const mongoose = require('mongoose');

const imagingServiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, trim: true, required: true },
    address: { type: String, trim: true, maxlength: 255 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    services: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImagingService', imagingServiceSchema);