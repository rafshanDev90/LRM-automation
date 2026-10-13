import * as reportService from '../services/reportService.js';
import { renderReportHTML, renderPDF } from '../services/templateEngine.js';
import { getAllTemplates } from '../templates/index.js';
import fs from 'node:fs';
import path from 'node:path';

const UPLOAD_DIR = 'uploads';
const META_FILE  = path.join(UPLOAD_DIR, '.meta.json');

const STALE_MS = 60 * 60 * 1000; // 1 hour

// ─── Metadata helpers ─────────────────────────────────────────────────────────
// We persist { serverFilename -> originalname } so that file labels in the
// generated report show the real filename, not the UUID-based server name.

function readMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function writeMeta(meta) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  } catch {}
}

// ─── Stale upload cleanup ─────────────────────────────────────────────────────
function cleanupStaleUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) return;
  const cutoff = Date.now() - STALE_MS;
  const meta   = readMeta();
  let changed  = false;

  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f === '.meta.json') continue;
    const p = path.join(UPLOAD_DIR, f);
    try {
      if (fs.statSync(p).mtimeMs < cutoff) {
        fs.unlinkSync(p);
        delete meta[f];
        changed = true;
      }
    } catch {}
  }

  if (changed) writeMeta(meta);
}

// ─── Upload files ─────────────────────────────────────────────────────────────
export const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  cleanupStaleUploads();

  // Persist originalname for each uploaded file
  const meta = readMeta();
  for (const f of req.files) {
    meta[f.filename] = f.originalname;
  }
  writeMeta(meta);

  const files = req.files.map(f => ({
    filename:     f.filename,
    originalname: f.originalname,
    path:         f.path,
    mimetype:     f.mimetype,
    size:         f.size
  }));

  res.json({ success: true, files });
};

// ─── Read uploads (with original names restored) ───────────────────────────
function readUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) return [];
  const meta = readMeta();
  return fs.readdirSync(UPLOAD_DIR)
    .filter(f => f !== '.meta.json')
    .map(f => ({
      filename:     f,
      originalname: meta[f] || f,   // fall back to server name if meta missing
      path:         path.join(UPLOAD_DIR, f)
    }));
}

// ─── Build report (shared by preview & generate) ───────────────────────────
function buildReport(reqBody) {
  const { taskPairs, labTitle, templateId = 'classic' } = reqBody;
  if (!taskPairs || !Array.isArray(taskPairs) || taskPairs.length === 0) {
    throw Object.assign(new Error('No task pairs provided.'), { status: 400 });
  }
  const files  = readUploads();
  const tasks  = reportService.processUploadedFiles(files, taskPairs);
  const html   = renderReportHTML(tasks, labTitle || 'Lab Report', templateId);
  return { tasks, html, files };
}

// ─── Preview HTML ─────────────────────────────────────────────────────────────
export const previewHTML = (req, res) => {
  try {
    const result = buildReport(req.body);
    res.json({
      success:   true,
      html:      result.html,
      taskCount: result.tasks.length,
      template:  req.body.templateId || 'classic'
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

// ─── Generate PDF from HTML ───────────────────────────────────────────────────
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
      pdfUrl:  `/download/${path.basename(pdfPath)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Legacy: generate report directly to PDF ─────────────────────────────────
export const generateReport = async (req, res) => {
  try {
    const result  = buildReport(req.body);
    const pdfPath = await renderPDF(result.html);
    res.json({
      success:   true,
      message:   'PDF generated successfully',
      pdfUrl:    `/download/${path.basename(pdfPath)}`,
      taskCount: result.tasks.length,
      template:  req.body.templateId || 'classic'
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

// ─── Download PDF ─────────────────────────────────────────────────────────────
export const downloadPDF = (req, res) => {
  // Sanitize filename to prevent path traversal
  const filename = path.basename(req.params.filename);
  if (!filename.endsWith('.pdf')) {
    return res.status(400).json({ success: false, error: 'Invalid file type.' });
  }
  const filePath = path.join('outputs', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
  res.download(filePath);
};

// ─── List templates ───────────────────────────────────────────────────────────
export const getTemplates = (req, res) => {
  res.json({ success: true, templates: getAllTemplates() });
};
