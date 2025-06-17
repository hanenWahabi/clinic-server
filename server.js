require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const logger = require('./utils/logger');
const http = require('http');
const { Server } = require('socket.io');
const { cleanEnv, str, port } = require('envalid');
const stripe = require('stripe'); // Ajouté pour Stripe

// Validate environment variables
const env = cleanEnv(process.env, {
  MONGO_URI: str(),
  FRONTEND_URL: str({ default: 'http://192.168.1.19' }),
  PORT: port({ default: 5003, choices: [5003] }),
  JWT_SECRET: str(),
  AI_BASE_URL: str({ default: 'http://192.168.1.19:5001' }),
  CORS_ORIGINS: str({ default: 'http://192.168.1.19,http://localhost:*,http://127.0.0.1:*' }),
  EMAIL_HOST: str({ default: 'smtp.gmail.com' }),
  EMAIL_PORT: str({ default: '587' }),
  EMAIL_USER: str({ default: 'jrnaziha@gmail.com' }),
  EMAIL_PASS: str({ default: 'your_app_specific_password' }),
  EMAIL_FROM: str({ default: 'ClinicHub <jrnaziha@gmail.com>' }),
  STRIPE_SECRET_KEY: str({ default: 'sk_test_51QQ5yzDRx1b1efNabFfNZCZcHnbu7Ftj7iMIsaq3ZTYrC7tb4cSzz0YBb4bJmCLBZTk5a5CJ9MncvuuACvtLiPY200EmbiaMfn' }),
  STRIPE_PUBLISHABLE_KEY: str({ default: 'pk_test_51QQ5yzDRx1b1efNa5G8vdlsxYvqdLLoE7S7t6PbK0i7F0LduNAOw7JeANJAfF7N1ebub211tTUMNM7wR6mo4pXEE00BYhySipv' })
});

// Initialiser Stripe
const stripeClient = stripe(env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());

// Configuration CORS
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin.endsWith('*')) {
                const baseOrigin = allowedOrigin.slice(0, -1);
                return origin.startsWith(baseOrigin);
            }
            return allowedOrigin === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked request from origin: ${origin}`);
            callback(null, true); // Temporairement autoriser toutes les origines pour le débogage
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400, // 24 heures
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Log CORS headers for debugging
app.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.url} from ${req.headers.origin || 'unknown origin'}`);
    logger.info(`Request headers: ${JSON.stringify(req.headers)}`);
    
    // Ajouter les en-têtes CORS manuellement pour s'assurer qu'ils sont présents
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Répondre immédiatement aux requêtes OPTIONS
    if (req.method === 'OPTIONS') {
        logger.info('Handling OPTIONS request');
        return res.status(204).end();
    }
    
    res.on('finish', () => {
        logger.info(`Response for ${req.method} ${req.url}:`, {
            status: res.statusCode,
            'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': res.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
        });
    });
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = env.CORS_ORIGINS.split(',').map(allowedOrigin => allowedOrigin.trim()).some(allowedOrigin => {
        if (allowedOrigin.endsWith('*')) {
          const baseOrigin = allowedOrigin.slice(0, -1);
          return origin.startsWith(baseOrigin);
        }
        return allowedOrigin === origin;
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

// Socket.IO for video consultations
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    logger.info(`User ${userId} joined room ${roomId}`);
  });
  socket.on('signal', (data) => {
    socket.to(data.roomId).emit('signal', {
      userId: data.userId,
      signal: data.signal,
    });
  });
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
  socket.on('error', (error) => {
    logger.error(`Socket.IO error: ${error.message}`);
  });
});

// Middleware
app.use(helmet());
app.use(compression());

// Request logging
app.use((req, res, next) => {
  const loggedBody = { ...req.body };
  if (loggedBody.password) loggedBody.password = '[REDACTED]';
  logger.info(`Requête entrante: ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    body: loggedBody,
  });
  next();
});

// JSON error handling
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(`Erreur JSON: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: 'JSON mal formé',
      code: 400,
    });
  }
  next(err);
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Trop de requêtes', code: 429 },
});
app.use('/api/v1', apiLimiter);

// MongoDB connection with reconnection logic
async function connectDB() {
  try {
    logger.info('Attempting to connect to MongoDB...');
    logger.info(`MongoDB URI: ${env.MONGO_URI.substring(0, 20)}...`); // Log only the beginning of the URI for security
    
    const options = {
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };
    
    logger.info('MongoDB connection options:', options);
    
    await mongoose.connect(env.MONGO_URI, options);
    
    // Log connection state
    logger.info('MongoDB connection state:', {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
    
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    logger.error('Full error details:', error);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
}

// Add more detailed connection event listeners
mongoose.connection.on('connecting', () => {
  logger.info('MongoDB connecting...');
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected event fired');
});

mongoose.connection.on('disconnecting', () => {
  logger.info('MongoDB disconnecting...');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected, attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB error: ${error.message}`);
  logger.error('Full error details:', error);
});

// Health check - Déplacé avant les autres routes
app.get('/api/v1/api/health', (req, res) => {
    logger.info('Health check request received', {
        origin: req.headers.origin,
        method: req.method,
        path: req.path,
        headers: req.headers
    });

    const health = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    };
    
    logger.info('Health check response', health);
    res.status(200).json(health);
});

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/patients', require('./routes/patientRoutes'));
app.use('/api/v1/doctors', require('./routes/doctorRoutes'));
app.use('/api/v1/laboratories', require('./routes/laboratoryRoutes'));
app.use('/api/v1/medical-imaging', require('./routes/imagingServiceRoutes'));
app.use('/api/v1/imaging-services', require('./routes/imagingServiceRoutes'));
app.use('/api/v1/profile-picture', require('./routes/profilePictureRoutes'));
app.use('/api/v1/appointments', require('./routes/appointmentRoutes'));
app.use('/api/v1/consultations', require('./routes/consultationRoutes'));
app.use('/api/v1/statistics', require('./routes/statisticsRoutes'));
app.use('/api/v1/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/v1/payments', require('./routes/paymentRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/search', require('./routes/searchRoutes'));
app.use('/api/v1/analyses', require('./routes/analysesRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/availability', require('./routes/availabilityRoutes'));
app.use('/api/v1/documents', require('./routes/documentRoutes'));

// Stripe Endpoints
// Créer un PaymentIntent
app.post('/api/payments/create-payment-intent', async (req, res, next) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Montant et devise requis',
        code: 400,
      });
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amount, // En centimes
      currency: currency,
      payment_method_types: ['card'],
    });

    logger.info(`PaymentIntent créé: ${paymentIntent.id}`);
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      code: 200,
    });
  } catch (error) {
    logger.error(`Erreur lors de la création du PaymentIntent: ${error.message}`);
    next(error);
  }
});

// Afficher le formulaire de paiement
app.get('/api/payments/checkout/:clientSecret', (req, res) => {
  const clientSecret = req.params.clientSecret;
  logger.info(`Affichage du formulaire de paiement pour clientSecret: ${clientSecret}`);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Paiement ClinicHub</title>
      <script src="https://js.stripe.com/v3/"></script>
      <style>
        #card-element { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
        #submit { background: #5469d4; color: white; padding: 10px; border-radius: 4px; border: none; cursor: pointer; }
        #error-message { color: red; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Paiement ClinicHub</h1>
      <form id="payment-form">
        <div id="card-element"></div>
        <button id="submit">Payer</button>
        <div id="error-message"></div>
      </form>
      <script>
        const stripe = Stripe('${env.STRIPE_PUBLISHABLE_KEY}');
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');
        const form = document.getElementById('payment-form');
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const { error, paymentIntent } = await stripe.confirmCardPayment('${clientSecret}', {
            payment_method: { card: cardElement },
          });
          if (error) {
            document.getElementById('error-message').textContent = error.message;
          } else {
            window.location.href = '/success';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Routes de redirection pour Stripe
app.get('/success', (req, res) => {
  res.send('<h1>Paiement réussi !</h1><p>Vous serez redirigé...</p>');
});
app.get('/cancel', (req, res) => {
  res.send('<h1>Paiement annulé.</h1><p>Vous serez redirigé...</p>');
});

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Erreur: ${err.message}`, {
    timestamp: new Date().toISOString(),
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const lang = req.headers['accept-language']?.includes('ar')
    ? 'ar'
    : req.headers['accept-language']?.includes('en')
    ? 'en'
    : 'fr';
  const messages = {
    fr: {
      validation: 'Erreur de validation',
      duplicate: 'Valeur en double pour',
      invalidToken: 'Token invalide',
      expiredToken: 'Token expiré',
      multipart: 'Requête multipart mal formée',
      server: 'Erreur serveur',
    },
    en: {
      validation: 'Validation error',
      duplicate: 'Duplicate value for',
      invalidToken: 'Invalid token',
      expiredToken: 'Token expired',
      multipart: 'Malformed multipart request',
      server: 'Server error',
    },
    ar: {
      validation: 'خطأ في التحقق',
      duplicate: 'قيمة مكررة لـ',
      invalidToken: 'رمز غير صالح',
      expiredToken: 'انتهت صلاحية الرمز',
      multipart: 'طلب متعدد الأجزاء غير صحيح',
      server: 'خطأ في الخادم',
    },
  };

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
    return res.status(400).json({
      success: false,
      message: messages[lang].validation,
      code: 400,
      errors,
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${messages[lang].duplicate} ${field}`,
      code: 400,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: messages[lang].invalidToken,
      code: 401,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: messages[lang].expiredToken,
      code: 401,
    });
  }

  if (err.message.includes('Multipart: Boundary not found')) {
    return res.status(400).json({
      success: false,
      message: messages[lang].multipart,
      code: 400,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : messages[lang].server,
    code: err.status || 500,
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Then start the server
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Starting server on port ${env.PORT}...`);
      logger.info(`AI Server URL: ${env.AI_BASE_URL}`);
      logger.info(`✅ Server running on port ${env.PORT}`);
      logger.info(`🌐 Server accessible at http://192.168.1.19:${env.PORT}`);
      logger.info(`🤖 AI Server URL: ${env.AI_BASE_URL}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Replace the old server.listen with startServer()
startServer();

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${env.PORT} déjà utilisé`);
    process.exit(1);
  } else {
    logger.error(`❌ Erreur serveur: ${error.message}`);
    process.exit(1);
  }
});