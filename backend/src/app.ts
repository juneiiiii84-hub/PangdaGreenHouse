import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { sensorRoutes } from './routes/sensor.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/sensors', sensorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../frontend/dist');

app.use(express.static(distPath));

// For SPA routing, redirect all non-api requests to index.html
app.use((req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send('Not Found');
  }
});
