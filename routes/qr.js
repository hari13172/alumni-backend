// routes/qr.js
import QRCode from 'qrcode';
import express from 'express';

const router = express.Router();

router.get('/generate-qr', async (req, res) => {
  try {
    const url = process.env.APP_URL || 'http://localhost:3000'; // Use environment variable for production URL
    const qrCodeDataUrl = await QRCode.toDataURL(url); // Generate QR code as a data URL
    res.json({ qrCode: qrCodeDataUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;