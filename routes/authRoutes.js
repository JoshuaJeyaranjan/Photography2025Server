const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');
const authenticateJWT = require('../middleware/authenticateJWT');

const router = express.Router();

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'name', 'email', 'is_admin')
      .where({ id: req.userId })
      .first();

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ user });
  } catch (err) {
    console.error('Error in /me:', err);
    res.sendStatus(500);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  try {
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({
      email,
      password_hash: hashed,
      name,
      is_admin: false, // default to false unless you want to support admin creation here
    });

    const token = jwt.sign(
      { userId, email, is_admin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: userId, email, name, is_admin: false } });
  } catch (err) {
    console.error('Error in /register:', err.stack);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
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

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error('Error in /login:', err.stack);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;