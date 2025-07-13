

// controllers/alumniController.js
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { initDB } from '../db/database.js';
import { minioClient } from '../utils/minioClient.js';

const LOCAL_SELFIE_DIR = path.resolve('uploads/selfies');   // adjust if you want another folder

export const registerAlumni = async (req, res, next) => {
  try {
    /* ------------------------------------------------------- *
     * 1.  Basic field + file validation (unchanged)           *
     * ------------------------------------------------------- */
    const { name, email, phone, graduationYear, department, job } = req.body;
    const { originalname, path: tmpPath } = req.file;

    /* ------------------------------------------------------- *
     * 2.  Duplicate‑email check                               *
     * ------------------------------------------------------- */
    const db = await initDB();
    const existing = await db.get('SELECT id FROM alumni WHERE email = ?', email);
    if (existing) {
      await fs.unlink(tmpPath);                    // clean temp file
      return res.status(409).json({ error: 'Email already registered' });
    }

    /* ------------------------------------------------------- *
     * 3.  Prepare local storage                               *
     * ------------------------------------------------------- */
    await fs.mkdir(LOCAL_SELFIE_DIR, { recursive: true });   // create folder if missing

    const selfieName       = `${uuidv4()}_${originalname}`;
    const localSelfiePath  = path.join(LOCAL_SELFIE_DIR, selfieName);

    // Move the temp file → permanent local folder (cheap on the same FS)
    await fs.rename(tmpPath, localSelfiePath);

    /* ------------------------------------------------------- *
     * 4.  Upload to MinIO                                     *
     * ------------------------------------------------------- */
    await minioClient.putObject('selfies', selfieName, await fs.readFile(localSelfiePath));

    const selfieUrl = `${process.env.MINIO_PUBLIC_URL}/selfies/${selfieName}`;

    /* ------------------------------------------------------- *
     * 5.  Insert new row                                      *
     * ------------------------------------------------------- */
    await db.run(
      `INSERT INTO alumni (name, email, phone, graduationYear, department, job, selfieUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      name, email, phone, graduationYear, department, job, selfieUrl
    );

    const inserted = await db.get(
      'SELECT last_insert_rowid() AS id, createdAt FROM alumni WHERE id = last_insert_rowid()'
    );

    return res.json({
      message  : 'Registration successful',
      selfieUrl,
      id       : inserted.id,
      createdAt: inserted.createdAt,
      // You still compute submittedAt on the client; keep it if you need it
    });
  } catch (err) {
    /* ------------------------------------------------------- *
     * 6.  Graceful error handling                             *
     * ------------------------------------------------------- */
    if (err?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // If something failed after we moved the file, avoid orphaning it
    if (req.file?.path) {                    // Multer temp still there
      fs.unlink(req.file.path).catch(() => {});
    }

    next(err);
  }
};



export const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    const alumni = await db.get('SELECT * FROM alumni WHERE id = ?', id);
    
    if (!alumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    // Convert SQLite timestamp to ISO UTC string
    const createdAt = alumni.createdAt
  ? new Date(alumni.createdAt + 'Z').toISOString()
  : new Date().toISOString();  // Ensures it's treated as UTC

    const responseData = {
      ...alumni,
      submittedAt: alumni.createdAt,
      createdAt: createdAt,
    };
    console.log("Fetched createdAt (ISO):", responseData.createdAt); // Debug ISO value
    res.json(responseData);
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE PROFILE                               */
/* -------------------------------------------------------------------------- */
export const updateProfile = async (req, res, next) => {
  const { id } = req.params;

  try {
    const db = await initDB();
    const existing = await db.get('SELECT * FROM alumni WHERE id = ?', id);
    if (!existing) return res.status(404).json({ error: 'Alumni not found' });

    const allowedFields = ['name', 'email', 'phone', 'graduationYear', 'department', 'job'];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body?.[f]) updates[f] = req.body[f];
    });

    if (req.file) {
      const selfieName = `${uuidv4()}_${req.file.originalname}`;
      await minioClient.putObject('selfies', selfieName, await fs.readFile(req.file.path));
      await fs.unlink(req.file.path);

      updates.selfieUrl = `${process.env.MINIO_PUBLIC_URL}/selfies/${selfieName}`;

      if (existing.selfieUrl) {
        const oldKey = existing.selfieUrl.split('/').pop();
        if (oldKey) {
          minioClient.removeObject('selfies', oldKey).catch(() => {});
        }
      }
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No valid fields provided for update' });

    const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
    const values = Object.values(updates);

    await db.run(`UPDATE alumni SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, ...values, id);

    const updated = await db.get('SELECT * FROM alumni WHERE id = ?', id);
    res.json({ message: 'Profile updated', profile: { ...updated, submittedAt: updated.createdAt } });
  } catch (err) {
    next(err);
  }
};