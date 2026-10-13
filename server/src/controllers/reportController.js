import * as reportService from '../services/reportService.js';
import { generateLabReport } from '../services/templateEngine.js';
import { getAllTemplates } from '../templates/index.js';
import fs from 'node:fs';
import path from 'node:path';

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
  const { taskPairs, labTitle, templateId = 'classic' } = req.body;

  if (!taskPairs || !Array.isArray(taskPairs) || taskPairs.length === 0) {
    return res.status(400).json({ success: false, error: 'No task pairs provided.' });
  }

  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    return res.status(500).json({ success: false, error: 'Upload directory missing' });
  }

  const files = fs.readdirSync(uploadDir).map(f => ({
    filename: f,
    originalname: f,
    path: path.join(uploadDir, f)
  }));

  try {
    const tasks = reportService.processUploadedFiles(files, taskPairs);
    const pdfPath = await generateLabReport(tasks, labTitle || 'Lab Report', templateId);

    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfUrl: `/download/${path.basename(pdfPath)}`,
      taskCount: tasks.length,
      template: templateId
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

export const getTemplates = (req, res) => {
  res.json({ success: true, templates: getAllTemplates() });
};