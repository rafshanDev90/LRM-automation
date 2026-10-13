import * as reportService from '../services/reportService.js';
import fs from 'node:fs';

export const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    path: f.path,
    mimetype: f.mimetype,
    size: f.size
  }));

  res.json({ success: true, files });
};

export const generateReport = async (req, res) => {
  const { taskPairs, labTitle } = req.body;

  if (!taskPairs || !Array.isArray(taskPairs) || taskPairs.length === 0) {
    return res.status(400).json({ success: false, error: 'No task pairs provided.' });
  }

  const uploadDir = 'uploads';
  const files = fs.readdirSync(uploadDir).map(f => ({
    filename: f,
    originalname: f,
    path: path.join(uploadDir, f)
  }));

  try {
    const tasks = reportService.processUploadedFiles(files, taskPairs);
    const pdfPath = await reportService.generateLabReport(tasks, labTitle || 'Lab Report');

    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfUrl: `/download/${path.basename(pdfPath)}`,
      taskCount: tasks.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // Cleanup uploaded files
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch {}
    }
  }
};

export const downloadPDF = (req, res) => {
  const filePath = path.join('outputs', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
  res.download(filePath);
};

import path from 'node:path';