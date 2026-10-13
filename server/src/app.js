import express from 'express';
import { upload } from './config/multer.js';
import * as reportController from './controllers/reportController.js';
import path from 'node:path';

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use('/download', express.static('outputs'));

app.post('/api/upload', upload.array('files'), reportController.uploadFiles);
app.post('/api/generate-report', reportController.generateReport);
app.get('/download/:filename', reportController.downloadPDF);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;