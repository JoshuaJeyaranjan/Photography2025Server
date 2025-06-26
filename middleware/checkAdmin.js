const db = require('../db');

const checkAdmin = async (req, res, next) => {
    if (!req.userId) {
      // This case should ideally be caught by authenticateJWT first
      return res.status(401).json({ error: 'Authentication required.' });
    }
    try {
      const user = await db('users').where({ id: req.userId }).select('is_admin').first();

      // Check if a user was found and if their `is_admin` flag is truthy (e.g., true or 1).
      if (user && user.is_admin) {
        return next(); // User is an admin, proceed to the next handler.
      }

      // If the user is not found or is not an admin, deny access.
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    } catch (error) {
      console.error('Admin check failed:', error);
      return res.status(500).json({ error: 'Internal server error during authorization.' });
    }
  };
module.exports = checkAdmin;