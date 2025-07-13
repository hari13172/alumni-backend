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

router.delete('/alumni/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await initDB();
    const result = await db.run('DELETE FROM alumni WHERE id = ?', id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    res.json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    console.error('❌ DB delete error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
