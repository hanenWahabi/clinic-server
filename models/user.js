const mongoose = require('mongoose');

// Options de schéma pour améliorer la performance et la gestion des timeouts
const schemaOptions = {
  timestamps: true,
  bufferTimeoutMS: 30000,
  maxTimeMS: 30000,
  writeConcern: { w: 'majority', wtimeout: 30000 }
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Exclude password by default
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'laboratory', 'imaging_service', 'admin'],
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    fatherName: {
      type: String,
      trim: true,
    },
    dob: {
      type: Date,
    },
    isCnamMember: {
      type: Boolean,
      default: false,
    },
    cnamFileId: {
      type: String,
      trim: true,
    },
    specialty: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    hospital: {
      type: String,
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  schemaOptions
);

// Ajouter des index pour améliorer les performances
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);