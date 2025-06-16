const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { cleanEnv, str } = require('envalid');

// Validate environment variables
const env = cleanEnv(process.env, {
  MONGODB_URI: str({ desc: 'MongoDB connection URI' }),
  NODE_ENV: str({ choices: ['development', 'production'], default: 'development' }),
});

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI); // Options obsolètes supprimées
    logger.info('✅ MongoDB connecté avec succès', { timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`❌ Erreur de connexion à MongoDB: ${error.message}`, {
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

module.exports = connectDB;