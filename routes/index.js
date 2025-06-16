const express = require('express');
const router = express.Router();

// Routes d'authentification
const authRoutes = require('./authRoutes');
router.use('/auth', authRoutes);

// Autres routes
const userRoutes = require('./userRoutes');
router.use('/users', userRoutes);

const appointmentRoutes = require('./appointmentRoutes');
router.use('/appointments', appointmentRoutes);

const doctorRoutes = require('./doctorRoutes');
router.use('/doctors', doctorRoutes);

const patientRoutes = require('./patientRoutes');
router.use('/patients', patientRoutes);

const laboratoryRoutes = require('./laboratoryRoutes');
router.use('/laboratories', laboratoryRoutes);

const medicalImagingRoutes = require('./medicalImagingRoutes');
router.use('/medical-imaging', medicalImagingRoutes);

const consultationRoutes = require('./consultationRoutes');
router.use('/consultations', consultationRoutes);

const documentRoutes = require('./documentRoutes');
router.use('/documents', documentRoutes);

const notificationRoutes = require('./notificationRoutes');
router.use('/notifications', notificationRoutes);

const paymentRoutes = require('./paymentRoutes');
router.use('/payments', paymentRoutes);

const prescriptionRoutes = require('./prescriptionRoutes');
router.use('/prescriptions', prescriptionRoutes);

const searchRoutes = require('./searchRoutes');
router.use('/search', searchRoutes);

const statisticsRoutes = require('./statisticsRoutes');
router.use('/statistics', statisticsRoutes);

const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

module.exports = router;
