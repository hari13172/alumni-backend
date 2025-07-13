

// controllers/alumniController.js
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { initDB } from '../db/database.js';
import { minioClient } from '../utils/minioClient.js';
// adjust if you want another folder

/* -------------------------------- REGISTER -------------------------------- */
export const registerAlumni = async (req, res, next) => {
  try {
    const { name, email, phone, graduationYear, department, job } = req.body;
    const { originalname, path: tmpPath, mimetype } = req.file;

    const db = await initDB();
    if (await db.get("SELECT id FROM alumni WHERE email = ?", email)) {
      await fs.unlink(tmpPath);
      return res.status(409).json({ error: "Email already registered" });
    }

    const selfieKey   = `${uuidv4()}_${originalname}`;
    const selfieBuf   = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);

    await minioClient.putObject("selfies", selfieKey, selfieBuf);

    const selfieUrl      = `/api/alumni/selfie/${selfieKey}`;
    const selfieDataUrl  = `data:${mimetype};base64,${selfieBuf.toString("base64")}`;

    const newId = uuidv4();
    await db.run(
      `INSERT INTO alumni
         (id, name, email, phone, graduationYear, department, job, selfieKey, selfieUrl)
       VALUES
         (? , ?,    ?,     ?,    ?,             ?,          ?,   ?,         ?)`,
      newId, name, email, phone, graduationYear, department, job, selfieKey, selfieUrl
    );

    res.json({
      message: "Registration successful",
      id: newId,
      selfieKey,
      selfieUrl,
      selfieDataUrl
    });
  } catch (err) {
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

      // Replace DB field with backend URL
      updates.selfieUrl = `/api/alumni/selfie/${selfieName}`;

      // Delete old object in MinIO (optional but neat)
      if (existing.selfieUrl) {
        const oldKey = existing.selfieUrl.split('/').pop();
        minioClient.removeObject('selfies', oldKey).catch(() => { });
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