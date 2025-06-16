const logger = require('../utils/logger');

   const errorHandler = (err, req, res, next) => {
     logger.error(`Erreur: ${err.message}`);
     logger.error(`Stack: ${err.stack}`);

     // Erreurs de validation Mongoose
     if (err.name === 'ValidationError') {
       const errors = Object.values(err.errors).map(error => error.message);
       return res.status(400).json({
         success: false,
         error: 'Erreur de validation',
         details: errors,
       });
     }

     // Erreurs JWT
     if (err.name === 'JsonWebTokenError') {
       return res.status(401).json({
         success: false,
         error: 'Token invalide',
       });
     }

     // Erreurs MongoDB
     if (err.name === 'MongoServerError') {
       if (err.code === 11000) {
         const field = Object.keys(err.keyValue)[0];
         return res.status(400).json({
           success: false,
           error: `Un document avec cette valeur existe déjà pour le champ ${field}`,
           details: err.keyValue,
         });
       }
     }

     // Erreurs de syntaxe JSON
     if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
       return res.status(400).json({
         success: false,
         error: 'JSON invalide',
         details: err.message,
       });
     }

     // Erreur par défaut
     res.status(500).json({
       success: false,
       error: 'Une erreur est survenue sur le serveur',
       details: process.env.NODE_ENV === 'development' ? err.message : undefined,
     });
   };

   module.exports = errorHandler;