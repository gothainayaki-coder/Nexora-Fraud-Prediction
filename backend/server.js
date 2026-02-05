// FILE: server.js
// Main Entry Point - Express Server with MongoDB, WebSocket & Real-time Services

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

// Import services
const emailService = require('./services/emailService');
const websocketService = require('./services/websocketService');

// Import routes
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// ==========================================
// SECURITY PRE-FLIGHT (PRO-TIER)
// ==========================================
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('🚨 CRITICAL ERROR: JWT_SECRET must be defined in production!');
  process.exit(1);
}
const MASTER_SECRET = process.env.JWT_SECRET || 'dev-nexora-secure-key-2026-pivot';

// ==========================================
// CORS CONFIGURATION (MUST BE FIRST)
// ==========================================
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));
// Handle preflight
app.options('*', cors(corsOptions));

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet - Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "http://127.0.0.1:5000", "ws://127.0.0.1:5000"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - Relaxed for Development/Demo
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed auth limit for development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased for development testing
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Sanitize data against NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`🚨 NoSQL Injection attempt blocked on key: ${key}`);
  }
}));

// XSS Protection - Hardened Sanitizer (Security Engineer Approved)
app.use((req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val !== 'string') return val;
    // Remove null bytes and escape critical chars
    return val.replace(/\0/g, '').replace(/[&<>"'/]/g, (s) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '/': '&#x2F;'
    }[s]));
  };

  const traverse = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key in obj) {
      if (key.toLowerCase().includes('password')) continue; // Skip sensitive fields
      if (typeof obj[key] === 'string') obj[key] = sanitizeValue(obj[key]);
      else if (typeof obj[key] === 'object') traverse(obj[key]);
    }
  };

  traverse(req.body);
  traverse(req.query);
  traverse(req.params);
  next();
});

// HTTPS Enforcement in Production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ==========================================
// SERVE STATIC FILES
// ==========================================

// Serve static files (for test.html) - Only in development
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(__dirname));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware with PII Masking
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const maskedPath = req.path.replace(/[0-9a-f]{24}/g, '[:id]');
    console.log(`[${timestamp}] ${req.method} ${maskedPath}`);
    next();
  });
}

// Trust proxy for IP detection behind reverse proxies
app.set('trust proxy', 1);

// ==========================================
// DATABASE CONNECTION
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_fraud_predictor';

// Disable buffering so routes don't hang if DB is down
mongoose.set('bufferCommands', false);

let connectionRetries = 0;
global.DEMO_MODE = false;

const connectDB = async () => {
  const uris = [
    MONGODB_URI,
    'mongodb://127.0.0.1:27017/nexora_fraud_predictor',
    'mongodb://localhost:27017/nexora_fraud_predictor?family=4'
  ];

  for (const uri of uris) {
    try {
      console.log(`🔌 Attempting to connect to MongoDB at: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ MongoDB Connected Successfully');
      console.log(`📦 Database: ${mongoose.connection.name}`);
      global.DEMO_MODE = false;
      return;
    } catch (error) {
      console.error(`❌ Connection failed for ${uri}:`, error.message);
    }
  }

  if (!global.DEMO_MODE) {
    console.log('🚀 ACTIVATING DEMO MODE: App will function using in-memory storage.');
    global.DEMO_MODE = true;
  }

  // Retry periodically in background
  setTimeout(connectDB, 60000);
};

// Demo Mode Storage (In-memory)
global.demoStorage = {
  users: [],
  reports: [],
  activities: [],
  alerts: []
};

// Connect to database
connectDB();

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nexora Fraud Predictor API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websocket: {
      status: 'active',
      connectedUsers: websocketService.getConnectedUsersCount()
    }
  });
});

// API routes - Pass websocket service
app.use('/api', (req, res, next) => {
  req.io = websocketService.getIO();
  req.websocket = websocketService;
  req.emailService = emailService;
  next();
}, apiRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for field: ${field}`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal security protocol error occurred.'
      : err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack, details: err.message })
  });
});

// ==========================================
// START SERVER WITH REAL-TIME SERVICES
// ==========================================

const PORT = process.env.PORT || 5000;

// Initialize WebSocket
websocketService.initialize(server);

// Initialize Email Service
emailService.initialize().then(ready => {
  if (ready) {
    console.log('📧 Email service initialized');
  }
}).catch(err => {
  console.error('❌ Email service failed to start:', err.message);
});

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
});

server.listen(PORT, () => {
  console.log('==========================================');
  console.log('🛡️  NEXORA FRAUD PREDICTOR API');
  console.log('   Crowd Intelligence Powered');
  console.log('   ⚡ REAL-TIME ENABLED');
  console.log('==========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('==========================================');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    console.log('Process terminated');
    await mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  server.close(async () => {
    console.log('Process terminated');
    await mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
