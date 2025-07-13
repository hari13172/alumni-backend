import { Client } from 'minio';
import dotenv from 'dotenv';
dotenv.config();

export const minioClient = new Client({
  endPoint  : process.env.MINIO_ENDPOINT  ?? 'localhost',
  port      : parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL    : false,
  // ➡️  pass the SAME credentials the server was started with
  accessKey : process.env.MINIO_ACCESS_KEY,
  secretKey : process.env.MINIO_SECRET_KEY
});
// Function to create bucket
async function createBucket(bucketName, region = 'us-east-1') {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, region);
      console.log(`✅ Bucket "${bucketName}" created successfully.`);
    } else {
      console.log(`ℹ️ Bucket "${bucketName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Error creating bucket:', err);
  }
}

// Example usage
createBucket('selfies');
