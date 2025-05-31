// server/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const knexConfig = require('./knexfile'); // Import Knex configuration
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']); // Initialize Knex

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes (adjust origins in production)
app.use(express.json()); // To parse JSON request bodies
console.log(`Knex initialized for environment: ${process.env.NODE_ENV || 'development'}`);

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

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`SERVER RUNNING on http://localhost:${PORT}`);
  console.log(`Images are expected in: ${imagesDirectory}`);
  console.log(`Access an image via: http://localhost:${PORT}/api/images/<filename.ext>`);
  console.log(`Access the gallery list via: http://localhost:${PORT}/api/gallery`);
  console.log(`Access portraits via: http://localhost:${PORT}/api/gallery?category=portrait`);
});
