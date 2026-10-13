import * as reportService from '../services/reportService.js';
import { renderReportHTML, renderPDF } from '../services/templateEngine.js';
import { getAllTemplates } from '../templates/index.js';
import fs from 'node:fs';
import path from 'node:path';

const UPLOAD_DIR = 'uploads';

/**
 * Upload files (code + outputs). Returns uploaded metadata.
 */
const STALE_MS = 60 * 60 * 1000; // 1 hour

/** Delete uploads older than 1 hour (prevents disk fill). */
function cleanupStaleUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) return;
  const cutoff = Date.now() - STALE_MS;
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    const p = path.join(UPLOAD_DIR, f);
    try {
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    } catch {}
  }
}

export const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  cleanupStaleUploads();

  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    path: f.path,
    mimetype: f.mimetype,
    size: f.size
  }));

  res.json({ success: true, files });
};

function readUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) return [];
  return fs.readdirSync(UPLOAD_DIR).map(f => ({
    filename: f,
    originalname: f,
    path: path.join(UPLOAD_DIR, f)
  }));
}

/**
 * Build tasks + HTML from taskPairs (shared by preview & generate).
 * Returns { tasks, html } or throws.
 */
function buildReport(reqBody) {
  const { taskPairs, labTitle, templateId = 'classic' } = reqBody;
  if (!taskPairs || !Array.isArray(taskPairs) || taskPairs.length === 0) {
    throw Object.assign(new Error('No task pairs provided.'), { status: 400 });
  }
  const files = readUploads();
  const tasks = reportService.processUploadedFiles(files, taskPairs);
  const html = renderReportHTML(tasks, labTitle || 'Lab Report', templateId);
  return { tasks, html, files };
}

/**
 * Step 1 (NEW): generate HTML preview instead of PDF.
 * User can then edit the HTML before downloading.
 */
export const previewHTML = (req, res) => {
  try {
    const result = buildReport(req.body);
    res.json({
      success: true,
      html: result.html,
      taskCount: result.tasks.length,
      template: req.body.templateId || 'classic'
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

/**
 * Step 2 (NEW): accept final (possibly user-edited) HTML -> render PDF.
 */
export const generateFromHTML = async (req, res) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ success: false, error: 'No HTML provided.' });
  }
  try {
    const pdfPath = await renderPDF(html);
    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfUrl: `/download/${path.basename(pdfPath)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Legacy direct path: taskPairs -> PDF in one call.
 */
export const generateReport = async (req, res) => {
  try {
    const result = buildReport(req.body);
    const pdfPath = await renderPDF(result.html);
    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfUrl: `/download/${path.basename(pdfPath)}`,
      taskCount: result.tasks.length,
      template: req.body.templateId || 'classic'
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
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