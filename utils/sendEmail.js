const nodemailer = require('nodemailer');
const config = require('config'); // Added to use config library
const logger = require('./logger');

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Validate email configuration
    const emailConfig = config.get('email');
    if (!emailConfig.host || !emailConfig.port || !emailConfig.user || !emailConfig.pass || !emailConfig.from) {
      const missingFields = [];
      if (!emailConfig.host) missingFields.push('EMAIL_HOST');
      if (!emailConfig.port) missingFields.push('EMAIL_PORT');
      if (!emailConfig.user) missingFields.push('EMAIL_USER');
      if (!emailConfig.pass) missingFields.push('EMAIL_PASS');
      if (!emailConfig.from) missingFields.push('EMAIL_FROM');
      throw new Error(`Configuration email manquante: ${missingFields.join(', ')}`);
    }

    // Parse port as an integer
    const port = parseInt(emailConfig.port, 10);
    if (isNaN(port)) {
      throw new Error(`EMAIL_PORT invalide: ${emailConfig.port} doit être un nombre`);
    }

    // Determine if secure connection should be used (port 465 typically uses TLS)
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: port,
      secure: secure, // Use TLS for port 465, STARTTLS for port 587
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      tls: {
        // Ensure STARTTLS is used for non-secure connections (port 587)
        rejectUnauthorized: false, // Optional: Allow self-signed certificates in development
      },
    });

    const info = await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      text,
      html,
    });

    logger.info(`Email envoyé à: ${to}, Subject: ${subject}, MessageID: ${info.messageId}`);
    return info; // Return the sendMail result (e.g., messageId)
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de l'email à ${to}: ${error.message}`, {
      subject,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = sendEmail;