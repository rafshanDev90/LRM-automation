import fs from 'node:fs';
import path from 'node:path';
import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-asm6502.js';

const LANG_MAP = {
  '.js': 'javascript',
  '.py': 'python',
  '.c': 'c',
  '.cpp': 'cpp',
  '.asm': 'nasm',
  '.s': 'nasm',
  '.txt': 'text',
  '.out': 'text',
  '.log': 'text',
  '.json': 'json',
  '.md': 'markdown'
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];

function detectLanguage(filename) {
  if (!filename) return 'text';
  const ext = path.extname(filename).toLowerCase();
  return LANG_MAP[ext] || 'text';
}

function highlightCode(code, language) {
  try {
    const lang = Prism.languages[language] ? language : 'text';
    return Prism.highlight(code, Prism.languages[lang], lang);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

function fileToBase64(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.pdf') mimeType = 'application/pdf';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Build an output entry from an uploaded file (image -> base64, text -> highlighted).
 */
function buildOutput(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    return { type: 'image', name: file.originalname, dataUrl: fileToBase64(file.path) };
  }
  const content = fs.readFileSync(file.path, 'utf-8');
  return {
    type: 'text',
    name: file.originalname,
    content,
    highlighted: highlightCode(content, detectLanguage(file.originalname))
  };
}

/**
 * Build a code file entry with line count for the page-break rule:
 * - < 50 lines  -> single page (break-inside: avoid)
 * - >= 50 lines -> may flow across 2 pages (break allowed)
 */
function buildCodeFile(file) {
  const content = fs.readFileSync(file.path, 'utf-8');
  const lineCount = content.split('\n').length;
  return {
    name: file.originalname,
    lang: detectLanguage(file.originalname),
    content,
    highlighted: highlightCode(content, detectLanguage(file.originalname)),
    lineCount,
    allowBreak: lineCount >= 50
  };
}

export function processUploadedFiles(files, taskPairs) {
  const fileMap = new Map(files.map(f => [f.filename, f]));

  return taskPairs.map((task) => {
    // Support multiple code files (codeFiles) with fallback to single codeFileId
    const codeFileIds = task.codeFiles?.length ? task.codeFiles : (task.codeFileId ? [task.codeFileId] : []);
    if (codeFileIds.length === 0) throw new Error('Task has no code file');

    const codeFiles = codeFileIds.map((id) => {
      const f = fileMap.get(id);
      if (!f) throw new Error(`Code file not found: ${id}`);
      return buildCodeFile(f);
    });

    // Support multiple output files with fallback to single outputFileId
    const outputFileIds = task.outputFiles?.length
      ? task.outputFiles
      : (task.outputFileId ? [task.outputFileId] : []);

    const outputs = outputFileIds
      .map((id) => fileMap.get(id))
      .filter(Boolean)
      .map(buildOutput);

    const firstCode = codeFiles[0];

    return {
      title: task.taskName || path.parse(firstCode.name).name,
      problemDescription: task.problemDescription || '',
      codeFiles,
      // legacy fields (kept for template backward compat)
      codeLang: firstCode.lang,
      codeHighlighted: firstCode.highlighted,
      outputs,
      outputHighlighted: outputs.find(o => o.type === 'text')?.highlighted || ''
    };
  });
}