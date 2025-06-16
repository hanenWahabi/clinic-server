const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Fixed path: go up one directory to backend/utils
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' }); // Load .env from the parent directory (backend)

async function createClinicHubDB() {
  try {
    // Log the MONGO_URI to verify it's loaded correctly
    console.log('MONGO_URI:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ Connecté à MongoDB pour créer la base de données');

    const db = mongoose.connection.db;
    await db.createCollection('users');
    await db.createCollection('patients');
    await db.createCollection('doctors');
    await db.createCollection('laboratories');
    await db.createCollection('medicalImagingServices');
    await db.createCollection('admins');
    await db.createCollection('appointments');
    await db.createCollection('consultations');
    await db.createCollection('prescriptions');
    await db.createCollection('payments');
    await db.createCollection('availabilities');
    await db.createCollection('notifications');
    await db.createCollection('analyses');
    await db.createCollection('imagingReports');

    logger.info('✅ Collections créées avec succès');

    // Fix the password for test34@example.com
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      role: String,
      firstName: String,
      lastName: String,
      phone: String,
      address: String
    }, { timestamps: true }), 'users');

    const user = await User.findOne({ email: 'test34@example.com' });
    if (user) {
      logger.info(`Utilisateur trouvé: ${user.email}`);
      if (!user.password.startsWith('$2a$')) {
        logger.info('Mot de passe en texte clair. Hachage en cours...');
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        user.password = hashedPassword;
        await user.save();
        logger.info(`Mot de passe mis à jour avec succès: ${hashedPassword}`);
      } else {
        logger.info('Le mot de passe est déjà haché:', user.password);
      }
    } else {
      logger.info('Utilisateur non trouvé. Création d’un nouvel utilisateur...');
      const newUser = new User({
        email: 'test34@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'patient',
        firstName: 'Test',
        lastName: 'User',
        phone: '+21612345678',
        address: '123 Test Street'
      });
      await newUser.save();
      logger.info('Nouvel utilisateur créé:', newUser);
    }

    logger.info('✅ Initialisation de la base de données terminée');
    await mongoose.connection.close();
    logger.info('✅ Connexion MongoDB fermée');
  } catch (error) {
    logger.error(`❌ Erreur lors de la création de la base de données: ${error.message}`);
    process.exit(1);
  }
}

createClinicHubDB();