import { initDB } from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  if (username !== 'hari' || password !== 'Hari@123') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
}

const createAdmin = async () => {
  const db = await initDB();

  const username = 'hari';
  const plainPassword = 'Hari@123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.run(
    `INSERT INTO admins (username, password) VALUES (?, ?)`,
    username,
    hashedPassword
  );
  const created = await db.get(`SELECT id, username, createdAt, updatedAt FROM admins WHERE username = ?`, username);
  await db.close();
};

createAdmin();
