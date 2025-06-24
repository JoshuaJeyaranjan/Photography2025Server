// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();


router.get('/me', authenticateToken, (req, res) => {
    // authenticateToken puts `req.user = { userId, email }`
    db('users').where({ id: req.user.userId }).first()
      .then(u => res.json({ user: { id: u.id, name: u.name, email: u.email } }))
      .catch(() => res.sendStatus(500));
  });
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const hashed = await bcrypt.hash(password, 10);
  const [userId] = await db('users').insert({ email, password: hashed, name });
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: userId, email, name } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await db('users').where({ email }).first();
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email, name: user.name } });
});

module.exports = router;


