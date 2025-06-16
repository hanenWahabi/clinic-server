const jwt = require('jsonwebtoken');
const logger = require('./logger');

const generateToken = (userId, email, role) => {
  try {
    const payload = {
      user_id: userId,
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // Expiration in 7 days
      iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    logger.info(`Token généré pour: ${email}`);
    return token;
  } catch (error) {
    logger.error(`Erreur génération token: ${error.message}`);
    throw error;
  }
};

module.exports = { generateToken };