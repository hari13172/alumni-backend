// controllers/alumniController.js
import { initDB } from '../db/database.js';
import { minioClient } from '../utils/minioClient.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

export const registerAlumni = async (req, res, next) => {
  try {
    /* --------- field + file validation (unchanged) --------- */

    const { name, email, phone, graduationYear, department, job } = req.body;
    const { originalname, path: tmpPath } = req.file;

    /* --------- duplicate‑email check --------- */
    const db = await initDB();
    const existing = await db.get('SELECT id FROM alumni WHERE email = ?', email);
    if (existing) {
      await fs.unlink(tmpPath);          // clean up uploaded file
      return res.status(409).json({ error: 'Email already registered' });
    }

    /* --------- upload selfie (unchanged) --------- */
    const selfieName = `${uuidv4()}_${originalname}`;
    await minioClient.putObject('selfies', selfieName, await fs.readFile(tmpPath));
    await fs.unlink(tmpPath);
    const selfieUrl = `${process.env.MINIO_PUBLIC_URL}/selfies/${selfieName}`;

    /* --------- insert row --------- */
    await db.run(
      `INSERT INTO alumni (name, email, phone, graduationYear, department, job, selfieUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      name, email, phone, graduationYear, department, job, selfieUrl
    );

    const inserted = await db.get(
      'SELECT last_insert_rowid() AS id, createdAt FROM alumni WHERE id = last_insert_rowid()'
    );
    res.json({
      message: 'Registration successful',
      selfieUrl,
      id: inserted.id,
      createdAt: inserted.createdAt,
    });
  } catch (err) {
    /* fallback if UNIQUE constraint still triggers (race condition) */
    if (err?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Email already registered' });
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