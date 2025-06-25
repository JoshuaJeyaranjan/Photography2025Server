const db = require('../db');



const checkAdmin = async (req, res, next) => {
    console.log('--- checkAdmin middleware ---');
    console.log('req.userId:', req.userId); // Log the user ID from the token
    if (!req.userId) {
      // This case should ideally be caught by authenticateJWT first
      return res.status(401).json({ error: 'Authentication required.' });
    }
    try {
      const user = await db('users').where({ id: req.userId }).select('is_admin').first();
      if (user && user.is_admin) {
      console.log('User from DB:', user); // Log the user object retrieved
      console.log('user.is_admin value:', user ? user.is_admin : 'N/A'); // Log the specific property
  
      if (user && (user.is_admin === true || user.is_admin === 1)) { // Explicitly check for boolean true or integer 1
        return next(); // User is an admin, proceed
      };
      }
      return res.status(403).json({ error: 'Forbidden. Admin access required. (is_admin check failed)' });
    } catch (error) {
      console.error('Admin check failed:', error);
      return res.status(500).json({ error: 'Internal server error during authorization.' });
    }
  };

  checkAdmin();

module.exports = checkAdmin;