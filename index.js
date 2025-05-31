// server/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const knexConfig = require('./knexfile'); // Import Knex configuration
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']); // Initialize Knex

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes (adjust origins in production)
app.use(express.json()); // To parse JSON request bodies
console.log(`Knex initialized for environment: ${process.env.NODE_ENV || 'development'}`);

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

// --- API Endpoints ---

// 1. Endpoint to get image metadata from the database
app.get('/api/gallery', async (req, res) => {
  const category = req.query.category; // e.g., /api/gallery?category=portrait

  try {
    let queryBuilder = knex('images').select('id', 'filename', 'title', 'description', 'category');

    if (category) {
      queryBuilder = queryBuilder.where('category', category);
    }

    queryBuilder = queryBuilder.orderBy('uploaded_at', 'desc'); // Or any other order you prefer

    const rows = await queryBuilder;

    const imageObjects = rows.map(row => ({
      id: row.id,
      title: row.title || '', // Ensure title is not null
      description: row.description,
      category: row.category,
      filename: row.filename,
      // Construct the URL the client will use to fetch the actual image
      url: `/api/images/${row.filename}`
    }));
    res.json(imageObjects);
  } catch (error) {
    console.error('Error fetching images from database:', error);
    res.status(500).send('Error retrieving image gallery.');
  }
});

// 2. Endpoint to serve a specific image file
app.get('/api/images/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(imagesDirectory, filename);

  // Basic security: prevent directory traversal
  if (filename.includes('..')) {
      return res.status(400).send('Invalid filename.');
  }

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Check if headers were already sent, common issue with res.sendFile
        if (!res.headersSent) {
          res.status(500).send('Error serving the image.');
        }
      }
    });
  } else {
    res.status(404).send('Image not found.');
  }
});

// 3. Endpoint for contact form submissions
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields (name, email, message) are required.' });
  }

  // Basic email format validation (can be more robust)
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    console.log('Contact form submission received:');
    console.log(`Name: ${name}, Email: ${email}, Message: ${message}`);

    if (!transporter) {
      console.error('Nodemailer transporter not available. Cannot send email.');
      // Still send a success to the client, but log the issue server-side
      return res.status(200).json({ message: 'Form submitted (email sending disabled server-side).' });
    }

    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`, // Sender address (shows your email, but name is from form)
      to: process.env.EMAIL_TO, // List of receivers
      replyTo: email, // So you can reply directly to the user's email
      subject: `New Contact Form Submission from ${name}`, // Subject line
      text: `You have a new contact form submission:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`, // Plain text body
      html: `<p>You have a new contact form submission:</p>
             <ul>
               <li><strong>Name:</strong> ${name}</li>
               <li><strong>Email:</strong> ${email}</li>
             </ul>
             <p><strong>Message:</strong></p>
             <p>${message.replace(/\n/g, '<br>')}</p>`, // HTML body
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact email sent successfully.');
    res.status(200).json({ message: 'Message sent successfully! Thank you for reaching out.' });
  } catch (error) {
    console.error('Error processing contact form or sending email:', error);
    res.status(500).json({ error: 'Server error while processing your request. Please try again later.' });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`SERVER RUNNING on http://localhost:${PORT}`);
  console.log(`Images are expected in: ${imagesDirectory}`);
  console.log(`Access an image via: http://localhost:${PORT}/api/images/<filename.ext>`);
  console.log(`Access the gallery list via: http://localhost:${PORT}/api/gallery`);
  console.log(`Access portraits via: http://localhost:${PORT}/api/gallery?category=portrait`);
});
