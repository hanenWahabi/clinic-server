const Doctor = require('../models/doctor');
const Patient = require('../models/patient');
const fs = require('fs').promises;

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const userType = req.params.type.toLowerCase();
    let user;

    // Check if user exists
    if (userType === 'doctor') {
      user = await Doctor.findById(userId);
    } else if (userType === 'patient') {
      user = await Patient.findById(userId);
    } else {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      try {
        await fs.unlink(`uploads/profile-pictures/${user.profilePicture}`);
      } catch (err) {
        console.error('Erreur lors de la suppression de l\'ancienne photo:', err);
      }
    }

    // Update user profile picture
    user.profilePicture = req.file.filename;
    await user.save();

    res.status(200).json({
      message: 'Photo de profil mise à jour avec succès',
      profilePicture: req.file.filename
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload de la photo' });
  }
};

// Get profile picture
const getProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const userType = req.params.type.toLowerCase();
    let user;

    if (userType === 'doctor') {
      user = await Doctor.findById(userId);
    } else if (userType === 'patient') {
      user = await Patient.findById(userId);
    } else {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.profilePicture) {
      return res.status(404).json({ message: 'Aucune photo de profil' });
    }

    res.sendFile(path.join(__dirname, '..', 'uploads', 'profile-pictures', user.profilePicture));
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la photo' });
  }
};

module.exports = {
  uploadProfilePicture,
  getProfilePicture
};
