
const express = require('express');
const db = require('../db');
const authenticateJWT = require('../middleware/authenticateJWT');
const router = express.Router();

// GET /api/cart → fetch user's cart
router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const items = await db('cart_items').where({ user_id: userId });
  res.json(items);
});

// POST /api/cart → add/update item
router.post('/', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const { image_id, print_size_id, quantity } = req.body;
  // upsert
  const existing = await db('cart_items')
    .where({ user_id: userId, image_id, print_size_id })
    .first();
  if (existing) {
    await db('cart_items')
      .where({ id: existing.id })
      .update({ quantity: existing.quantity + quantity });
  } else {
    await db('cart_items').insert({ user_id: userId, image_id, print_size_id, quantity });
  }
  const updated = await db('cart_items').where({ user_id: userId });
  res.json(updated);
});

// DELETE /api/cart/:itemId → remove item
router.delete('/:itemId', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const { itemId } = req.params;
  await db('cart_items').where({ id: itemId, user_id: userId }).del();
  const items = await db('cart_items').where({ user_id: userId });
  res.json(items);
});

module.exports = router;
