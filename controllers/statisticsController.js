const Payment = require('../models/payment');
const logger = require('../utils/logger');

// Récupérer les statistiques des paiements
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    logger.info(`Statistiques des paiements récupérées par ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques des paiements: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = { getPaymentStats };