const mongoose = require('mongoose');
const Payment = require('../models/payment');

exports.createPayment = async (req, res) => {
  try {
    const { userId, appointmentId, consultationId, amount, paymentMethod, transactionId } = req.body;

    // Validation des champs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'ID utilisateur invalide' });
    }
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, error: 'ID de rendez-vous invalide' });
    }
    if (consultationId && !mongoose.Types.ObjectId.isValid(consultationId)) {
      return res.status(400).json({ success: false, error: 'ID de consultation invalide' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide, doit être un nombre positif' });
    }
    if (!['credit_card', 'debit_card', 'cash', 'cnam', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, error: 'Méthode de paiement invalide' });
    }

    const payment = new Payment({
      userId,
      appointmentId,
      consultationId,
      amount: parseFloat(amount), // Forcer comme double
      currency: 'TND', // Valeur par défaut
      status: 'pending',
      paymentMethod,
      transactionId: transactionId || undefined, // transactionId est optionnel
    });
    await payment.save();
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'ID utilisateur invalide' });
    }

    const payments = await Payment.find({ userId })
      .populate('appointmentId')
      .populate('consultationId');
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId } = req.body;
    const paymentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, error: 'ID de paiement invalide' });
    }
    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { status, transactionId },
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};