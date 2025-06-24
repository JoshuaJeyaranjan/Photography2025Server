// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/auth/me
// — returns the currently-authenticated user
router.get(
  '/me',
  authenticateToken,
  async (req, res) => {
    try {
      const u = await db('users')
        .select('id', 'name', 'email')
        .where({ id: req.user.userId })
        .first();
      if (!u) return res.status(404).json({ error: 'User not found.' });
      res.json({ user: u });
    } catch (err) {
      console.error('Error in /me:', err);
      res.sendStatus(500);
    }
  }
);

// POST /api/auth/register
// — create a new user and return a JWT
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({ email, password: hashed, name });
    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, email, name } });
  } catch (err) {
    console.error('Error in /register:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
// — authenticate a user and return a JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;