// /routes/galleryRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Helper to build absolute base URL (e.g. "https://your-backend.up.railway.app")
function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// GET /api/gallery - Endpoint to get image metadata from the database
router.get('/', async (req, res) => {
  const category = req.query.category;
  const knex = req.db; // Access knex from the request object

  try {
    let queryBuilder = knex('images')
      .select('id', 'filename', 'title', 'description', 'category');

    if (category) {
      queryBuilder = queryBuilder.where('category', category);
    }

    queryBuilder = queryBuilder.orderBy('uploaded_at', 'desc');
    const rows = await queryBuilder;

    const baseUrl = getBaseUrl(req);
    const imageObjects = rows.map(row => ({
      id: row.id,
      title: row.title || '',
      description: row.description,
      category: row.category,
      filename: row.filename,
      url: `${baseUrl}/api/gallery/images/${encodeURIComponent(row.filename)}` 
    }));

    res.json(imageObjects);
  } catch (error) {
    console.error('Error fetching images from database:', error);
    res
      .status(500)
      .json({ error: 'Error retrieving image gallery.', details: error.message });
  }
});

// GET /api/gallery/images/:filename - Endpoint to serve a specific image file
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  const imagesDirectory = req.imagesDirectory; // Access imagesDirectory from req
  const imagePath = path.join(imagesDirectory, filename);

  // Prevent directory traversal
  if (filename.includes('..')) {
    return res.status(400).send('Invalid filename.');
  }

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath, err => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error serving the image.');
        }
      }
    });
  } else {
    res.status(404).send('Image not found.');
  }
});

module.exports = router;
