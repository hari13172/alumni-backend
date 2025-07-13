import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const initDB = async () => {
  const db = await open({
    filename: './db/alumni.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS alumni (
      id TEXT PRIMARY KEY, -- UUID
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      graduationYear TEXT,
      department TEXT,
      job TEXT,
      selfieUrl TEXT,
      selfieKey TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY, -- UUID
      username TEXT,
      password TEXT,
      createdAt TIMESTAMP DEFAULT (datetime('now', 'localtime')),
      updatedAt TIMESTAMP DEFAULT (datetime('now', 'localtime'))
    );
  `);

  return db;
};
