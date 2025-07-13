import express from 'express';
import multer from 'multer';
import { getProfile, registerAlumni, updateProfile } from '../controllers/alumniController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.single('selfie'), registerAlumni);


router.get('/profile/:id', getProfile)

// 🔸 Allow partial or full update
router.put('/profile/:id',upload.single('selfie'),updateProfile);



export default router;

