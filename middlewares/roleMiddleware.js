const logger = require('../utils/logger');

const restrictTo = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Accès non autorisé pour ${req.user.email} (rôle: ${req.user.role})`);
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : Rôle non autorisé',
      });
    }
    next();
  };
};

module.exports = { restrictTo };