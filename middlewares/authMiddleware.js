const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Aucun token fourni ou format invalide');
    return res.status(401).json({ success: false, message: 'Token requis (format: Bearer <token>)', code: 401 });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    logger.warn('Token manquant dans l\'en-tête Authorization');
    return res.status(401).json({ success: false, message: 'Token requis', code: 401 });
  }

  // Use environment variable for JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET non défini dans les variables d\'environnement');
    return res.status(500).json({ success: false, message: 'Erreur serveur: clé secrète manquante', code: 500 });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn(`Token expiré: ${token}`);
        return res.status(401).json({ success: false, message: 'Token expiré', code: 401 });
      }
      logger.warn(`Erreur de vérification du token: ${err.message}, token: ${token}`);
      return res.status(401).json({ success: false, message: 'Token invalide', code: 401 });
    }

    logger.info(`Token vérifié avec succès, user: ${user.email}, role: ${user.role}`);
    req.user = user;
    next();
  });
};

// Removed Redis dependency; checkBlacklist is now a no-op (pass-through)
const checkBlacklist = (req, res, next) => {
  logger.info('Token blacklisting disabled (Redis removed)');
  next();
};

const checkRole = (roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.warn('Utilisateur ou rôle non défini dans la requête');
    return res.status(401).json({ success: false, message: 'Utilisateur non authentifié', code: 401 });
  }

  if (!roles.includes(req.user.role)) {
    logger.warn(`Accès non autorisé pour le rôle: ${req.user.role}, rôles attendus: ${roles.join(', ')}`);
    return res.status(403).json({
      success: false,
      message: `Accès non autorisé. Rôles requis: ${roles.join(', ')}`,
      code: 403,
    });
  }

  logger.info(`Rôle vérifié: ${req.user.role}, accès autorisé`);
  next();
};

module.exports = { authenticateToken, checkBlacklist, checkRole };