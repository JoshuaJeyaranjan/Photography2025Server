const express = require('express');
const router = express.Router();

// GET /api/print-sizes
router.get('/print-sizes', async (req, res) => {
  try {
    const sizes = await req.db('print_sizes').select(
      'id',
      'label',
      'width_in',
      'height_in',
      'price',
      'preview_url'
    );
    res.json(sizes);
  } catch (error) {
    console.error('Error fetching print sizes:', error);
    res.status(500).json({ error: 'Failed to retrieve print sizes.' });
  }
});

module.exports = router;