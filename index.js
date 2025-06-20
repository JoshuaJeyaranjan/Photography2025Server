//index.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const knexConfig = require('./knexfile'); // Import Knex configuration
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']); // Initialize Knex
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3001;
const helmet = require('helmet');

// --- Import Routes ---
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'https://joshuajeyphotography.com', // Your deployed site
  'https://joshuajeyphotographycom.netlify.app',
  'https://www.joshuajeyphotography.com'

];



app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS policy: No access for origin ${origin}`), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json()); 

app.use(helmet());


// --- Nodemailer Transporter Setup ---
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'Gmail', // Default to Gmail if not specified
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log('Nodemailer transporter configured.');
} else {
  console.warn('Nodemailer not configured. EMAIL_USER or EMAIL_PASS missing in .env');
}

// --- Image Storage Location ---
// This directory should be INSIDE your 'server' directory or accessible by it.
const imagesDirectory = path.join(__dirname, 'public', 'images');

// Create the directory if it doesn't exist (for first-time setup)
if (!fs.existsSync(imagesDirectory)) {
  fs.mkdirSync(imagesDirectory, { recursive: true });
  console.log(`Created images directory at ${imagesDirectory}`);
  // You would then manually add your images to this folder
  // e.g., server/public/images/portrait_example_1.jpg
}

// --- Middleware to attach dependencies to req object ---
app.use((req, res, next) => {
  req.db = knex;
  req.transporter = transporter;
  req.stripe = stripe;
  req.imagesDirectory = imagesDirectory;
  next();
});

// --- Test Route ---
app.get("/", (req, res) => {
  res.send("Welcome to the Photography API");
});

// --- Use API Routes ---
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);

// --- Serve static files from the public directory ---
// app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// --- Catch 404s and forward to error handler ---
// This should be after all your specific routes
app.use((req, res, next) => {
  // Create an error object for 404s to be handled by the global error handler
  const err = new Error(`The requested URL ${req.originalUrl} was not found on this server.`);
  err.status = 404;
  next(err);
});

// --- Global Error Handler ---
// This middleware must have four arguments to be recognized as an error handler by Express.
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
  });
});
// In index.js or routes file
app.get("/api/test-stripe", async (req, res) => {
  try {
    const response = await fetch("https://api.stripe.com");
    res.status(200).json({ status: response.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- Start the Server ---
app.listen(PORT, () => {

  console.log(`SERVER RUNNING on http://localhost:${PORT}`);
  console.log(`Images are expected in: ${imagesDirectory}`);
  console.log(`Access an image via: http://localhost:${PORT}/images/<filename.ext>`);
  console.log(`Access the gallery list via: http://localhost:${PORT}/api/gallery`);
  console.log(`Access portraits via: http://localhost:${PORT}/api/gallery?category=portrait`);
  console.log(`Admin routes available at: http://localhost:${PORT}/api/admin`);
  console.log('Connecting to DB:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    db: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });
  console.log(`Backend base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);


});
