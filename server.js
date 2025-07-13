import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import alumniRoutes from './routes/alumni.js';
import adminRoutes from './routes/admin.js';
import qrRoutes from './routes/qr.js';
import http from 'http';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/alumni', alumniRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);

// ✅ Serve Express app
const server = http.createServer(app);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
