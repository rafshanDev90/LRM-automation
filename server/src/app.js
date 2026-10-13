import express from 'express';
import cors from 'cors';
import { upload } from './config/multer.js';
import * as reportController from './controllers/reportController.js';
import path from 'node:path';
import fs from 'node:fs';

const app = express();

app.use(cors({ origin: 'http://localhost:3002' }));
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use('/download', express.static('outputs'));

app.post('/api/upload', upload.array('files'), reportController.uploadFiles);
app.post('/api/preview-html', reportController.previewHTML);
app.post('/api/generate-pdf-from-html', reportController.generateFromHTML);
app.post('/api/generate-report', reportController.generateReport);
app.get('/api/templates', reportController.getTemplates);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/download/:filename', reportController.downloadPDF);
app.get('/pdf-config', (req, res) => {
  const pdfPath = path.join(path.dirname('.'), 'public', 'pdf-config.html');
  res.sendFile(pdfPath, { root: process.cwd() });
});

export default app;