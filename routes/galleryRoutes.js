// /routes/galleryRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Helper to build absolute base URL (e.g. "https://your-backend.up.railway.app")
// function getBaseUrl(req) {
//   return `${req.protocol}://${req.get('host')}`;
// }
// GET /api/gallery - returns metadata with Cloudflare R2 URLs
router.get('/', async (req, res) => {
  const category = req.query.category;
  const knex = req.db;

  try {
    let queryBuilder = knex('images')
      .select('id', 'filename', 'title', 'description', 'category');

    if (category) {
      queryBuilder = queryBuilder.where('category', category);
    }

    queryBuilder = queryBuilder.orderBy('uploaded_at', 'desc');
    const rows = await queryBuilder;

    // Instead of backend URL, build Cloudflare R2 URL
    // Adjust this URL to match your actual R2 bucket domain and path
    const R2_BASE_URL = 'https://assets.joshuajeyphotography.com/portraits';

    const imageObjects = rows.map(row => ({
      id: row.id,
      title: row.title || '',
      description: row.description,
      category: row.category,
      filename: row.filename,
      url: `${R2_BASE_URL}/${encodeURIComponent(row.filename)}`,  // <-- Change here
    }));

    res.json(imageObjects);
  } catch (error) {
    console.error('Error fetching images from database:', error);
    res.status(500).json({ error: 'Error retrieving image gallery.', details: error.message });
  }
});

module.exports = router;
