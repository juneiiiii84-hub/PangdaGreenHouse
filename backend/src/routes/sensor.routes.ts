import { Router } from 'express';
import { sensorController } from '../controllers/sensor.controller.js';

export const sensorRoutes = Router();

sensorRoutes.get('/stream', (req, res) => sensorController.stream(req, res));
sensorRoutes.post('/report', (req, res) => sensorController.reportData(req, res));
sensorRoutes.get('/latest', (req, res) => sensorController.getLatest(req, res));
sensorRoutes.get('/logs', (req, res) => sensorController.getLogs(req, res));
sensorRoutes.get('/history', (req, res) => sensorController.getHistory(req, res));
sensorRoutes.get('/diagnostics', (req, res) => sensorController.getDiagnostics(req, res));
