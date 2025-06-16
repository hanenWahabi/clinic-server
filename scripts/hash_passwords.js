const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Mot de passe invalide pour hachage');
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error(`Erreur lors du hachage du mot de passe: ${error.message}`);
  }
};

const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword || typeof password !== 'string' || typeof hashedPassword !== 'string') {
    throw new Error('Arguments invalides pour comparaison de mot de passe');
  }
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Erreur lors de la comparaison du mot de passe: ${error.message}`);
  }
};

module.exports = {
  hashPassword,
  comparePassword,
};