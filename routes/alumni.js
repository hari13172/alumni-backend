import express from 'express';
import multer from 'multer';
import { getProfile, registerAlumni, updateProfile } from '../controllers/alumniController.js';
import { minioClient } from '../utils/minioClient.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.single('selfie'), registerAlumni);


router.get('/profile/:id', getProfile)

// 🔸 Allow partial or full update
router.put('/profile/:id',upload.single('selfie'),updateProfile);


// routes/alumni.js  (add at the very end, after the other routes)


router.get('/selfie/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    const stream = await minioClient.getObject('selfies', filename);

    // Optional: you can detect content type from extension
    res.setHeader('Content-Type', 'image/jpeg');
    stream.pipe(res);
  } catch (err) {
    console.error("❌ Failed to retrieve selfie from MinIO:", err);
    res.status(404).send('Image not found');
  }
});

export default router;

