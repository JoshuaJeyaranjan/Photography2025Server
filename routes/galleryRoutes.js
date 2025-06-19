const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Helper to build Cloudflare R2 URLs (not needed if fully moved to R2)
const R2_BASE_URL = 'https://r2-image-proxy.r2-image-proxy.workers.dev';

function getR2Folder(filename) {
  if (filename.startsWith('portrait_')) return 'portraits';
  if (filename.startsWith('print_')) return 'prints';
  if (filename === 'me.jpg') return 'me';
  if (filename.endsWith('.svg')) return 'logo';
  return 'misc'; // default fallback if needed
}

// GET /api/gallery
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

    const imageObjects = rows.map(row => {
      const folder = getR2Folder(row.filename);
    
      return {
        id: row.id,
        title: row.title || '',
        description: row.description,
        category: row.category,
        filename: row.filename,
        url: `https://r2-image-proxy.r2-image-proxy.workers.dev/${folder}/${encodeURIComponent(row.filename)}`
      };
    });
    

    res.json(imageObjects);
  } catch (error) {
    console.error('Error fetching images from database:', error);
    res.status(500).json({ error: 'Error retrieving image gallery.', details: error.message });
  }
});

// ✅ CORS + Resource Policy headers only if you're still serving backend images
router.use('/images/:filename', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://joshuajeyphotographycom.netlify.app');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// GET /api/gallery/images/:filename
// (Optional: only if still serving images from backend)
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  const imagesDirectory = req.imagesDirectory;
  const imagePath = path.join(imagesDirectory, filename);

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

// GET /api/gallery/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const knex = req.db;

  try {
    const image = await knex('images')
      .select('id', 'filename', 'title', 'description', 'category')
      .where('id', id)
      .first();

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const folder = getR2Folder(image.filename);

    res.json({
      ...image,
      url: `https://r2-image-proxy.r2-image-proxy.workers.dev/${folder}/${encodeURIComponent(image.filename)}`
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to retrieve image.' });
  }
});


module.exports = router;
