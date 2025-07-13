import { Client } from 'minio';
import dotenv from 'dotenv';
dotenv.config();

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
});
