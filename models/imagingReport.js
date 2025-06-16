const mongoose = require('mongoose');

const imagingReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imagePath: { type: String, trim: true, required: true },
    result: { type: String, trim: true, required: true }, // AI prediction result
  },
  { timestamps: true }
);

// Index for faster lookups by userId
imagingReportSchema.index({ userId: 1 });

module.exports = mongoose.model('ImagingReport', imagingReportSchema);