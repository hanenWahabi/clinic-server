const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/payment');
const { authenticateToken, checkBlacklist } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

const validatePayment = [
  body('userId').isMongoId().withMessage('User ID invalide'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'cash', 'cnam', 'bank_transfer']).withMessage('Méthode de paiement invalide'),
  body('appointmentId').optional().isMongoId().withMessage('Appointment ID invalide'),
  body('consultationId').optional().isMongoId().withMessage('Consultation ID invalide'),
];

router.post('/create-payment-intent', 
  authenticateToken,
  checkBlacklist,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'tnd',
        payment_method_types: ['card'],
      });

      logger.info(`Payment intent créé pour userId: ${req.user.id}`);
      res.status(200).json({
        success: true,
        data: { clientSecret: paymentIntent.client_secret },
        message: 'Payment intent créé',
        code: 200,
      });
    } catch (error) {
      logger.error(`Erreur lors de la création du payment intent: ${error.message}`);
      next(error);
    }
  }
);

router.post('/', 
  authenticateToken,
  checkBlacklist,
  validatePayment,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ success: false, message: 'Erreur de validation', code: 400, errors: errors.array() });
      }

      const { userId, appointmentId, consultationId, amount, paymentMethod } = req.body;
      const payment = new Payment({
        userId,
        appointmentId,
        consultationId,
        amount,
        currency: 'TND',
        status: 'pending',
        paymentMethod,
      });
      await payment.save();

      logger.info(`Paiement créé pour userId: ${userId}`);
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Paiement créé',
        code: 201,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;