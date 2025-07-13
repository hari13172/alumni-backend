import express from 'express';
import { loginAdmin } from '../controllers/adminController.js';
import { verifyAdmin } from '../middlewares/authMiddleware.js';
import { initDB } from '../db/database.js';

const router = express.Router();
router.post('/login', loginAdmin);

// Example: protected route
router.get('/dashboard', verifyAdmin, (req, res) => {
  res.json({ message: 'Admin authenticated' });
});

// Get all alumni data
router.get('/alumni', verifyAdmin, async (req, res) => {
  try {
    const db = await initDB();
    const alumni = await db.all('SELECT * FROM alumni');
    res.json(alumni);
  } catch (error) {
    console.error('❌ DB init error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
