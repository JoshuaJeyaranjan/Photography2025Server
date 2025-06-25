const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, req.imagesDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

// Get about section content
router.get('/about', async (req, res) => {
  try {
    const aboutContent = await req.db('about_section').first();
    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch about content' });
  }
});

// Update about section content
router.put('/about', isAuthenticated, async (req, res) => {
  try {
    const { expertise, creativeVision, impact } = req.body;
    await req.db('about_section')
      .where({ id: 1 })
      .update({ expertise, creativeVision, impact });
    res.json({ message: 'About section updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update about content' });
  }
});

// Update profile image
router.post('/profile-image', isAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
    console.log('Profile image upload request received');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = `/images/${req.file.filename}`;
    console.log('Attempting to update profile image in database with path:', imagePath);

    // First check if a profile image exists
    const existingImage = await req.db('profile_image').first();
    
    if (existingImage) {
      // Update existing record
      await req.db('profile_image')
        .where({ id: existingImage.id })
        .update({ image_path: imagePath });
    } else {
      // Create new record
      await req.db('profile_image').insert({ image_path: imagePath });
    }

    console.log('Profile image updated successfully');
    res.json({ 
      message: 'Profile image updated successfully',
      imagePath 
    });
  } catch (error) {
    console.error('Error in profile image upload:', error);
    res.status(500).json({ error: 'Failed to update profile image', details: error.message });
  }
});

// Get profile image
router.get('/profile-image', async (req, res) => {
  try {
    const profileImage = await req.db('profile_image').first();
    if (!profileImage) {
      return res.status(404).json({ error: 'Profile image not found' });
    }
    res.json({ image_path: profileImage.image_path });
  } catch (error) {
    console.error('Error fetching profile image:', error);
    res.status(500).json({ error: 'Failed to fetch profile image' });
  }
});

// Get portfolio images
router.get('/portfolio', async (req, res) => {
  try {
    const images = await req.db('portfolio_images')
      .orderBy('display_order', 'asc');
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio images' });
  }
});

// Upload new portfolio image
router.post('/portfolio', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { title, description } = req.body;
    const imagePath = `/images/${req.file.filename}`;
    
    // Get the highest display order
    const maxOrder = await req.db('portfolio_images')
      .max('display_order as max')
      .first();
    
    const newOrder = (maxOrder?.max || 0) + 1;

    const [newImage] = await req.db('portfolio_images')
      .insert({
        image_path: imagePath,
        title,
        description,
        display_order: newOrder
      })
      .returning('*');

    res.json(newImage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload portfolio image' });
  }
});

// Update portfolio image order
router.put('/portfolio/reorder', isAuthenticated, async (req, res) => {
  try {
    const { images } = req.body; // Array of { id, display_order }
    
    // Update each image's order
    await Promise.all(images.map(image => 
      req.db('portfolio_images')
        .where({ id: image.id })
        .update({ display_order: image.display_order })
    ));

    res.json({ message: 'Portfolio order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio order' });
  }
});

// Delete portfolio image
router.delete('/portfolio/:id', isAuthenticated, async (req, res) => {
  try {
    const image = await req.db('portfolio_images')
      .where({ id: req.params.id })
      .first();

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete the file from the filesystem
    const filePath = path.join(req.imagesDirectory, path.basename(image.image_path));
    fs.unlinkSync(filePath);

    // Delete from database
    await req.db('portfolio_images')
      .where({ id: req.params.id })
      .del();

    res.json({ message: 'Portfolio image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete portfolio image' });
  }
});

// Update portfolio image details
router.put('/portfolio/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, description } = req.body;
    await req.db('portfolio_images')
      .where({ id: req.params.id })
      .update({ title, description });
    
    res.json({ message: 'Portfolio image updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio image' });
  }
});

module.exports = router;
