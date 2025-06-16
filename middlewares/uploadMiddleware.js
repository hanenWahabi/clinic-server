const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|dcm|nii/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    logger.warn(`Type de fichier non supporté: ${file.originalname}`);
    cb(new Error('Type de fichier non supporté'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.warn(`Erreur Multer: ${err.message}`);
    return res.status(400).json({ success: false, message: err.message, code: 400 });
  }
  if (err) {
    logger.warn(`Erreur de téléchargement: ${err.message}`);
    return res.status(400).json({ success: false, message: err.message, code: 400 });
  }
  next();
};

module.exports = { upload, handleMulterError };