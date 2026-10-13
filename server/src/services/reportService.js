import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-asm6502.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export function processUploadedFiles(files, taskPairs) {
  const fileMap = new Map(files.map(f => [f.filename, f]));

  return taskPairs.map(({ codeFileId, outputFileId, outputFiles = [], taskName, problemDescription = '' }) => {
    const codeFile = fileMap.get(codeFileId);
    if (!codeFile) throw new Error(`Code file not found: ${codeFileId}`);

    const codeContent = fs.readFileSync(codeFile.path, 'utf-8');
    const codeLang = detectLanguage(codeFile.originalname);
    const codeHighlighted = highlightCode(codeContent, codeLang);

    const outputs = [];

    // Handle multiple output image files
    if (outputFiles.length > 0) {
      for (const outFileId of outputFiles) {
        const outFile = fileMap.get(outFileId);
        if (outFile) {
          const ext = path.extname(outFile.originalname).toLowerCase();
          const imgExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
          if (imgExts.includes(ext)) {
            outputs.push({
              type: 'image',
              name: outFile.originalname,
              dataUrl: fileToBase64(outFile.path)
            });
          } else {
            const outContent = fs.readFileSync(outFile.path, 'utf-8');
            outputs.push({
              type: 'text',
              name: outFile.originalname,
              content: outContent,
              highlighted: highlightCode(outContent, detectLanguage(outFile.originalname))
            });
          }
        }
      }
    }

    // Handle single output file (legacy support)
    if (outputs.length === 0 && outputFileId) {
      const outputFile = fileMap.get(outputFileId);
      if (outputFile) {
        const ext = path.extname(outputFile.originalname).toLowerCase();
        const imgExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
        if (imgExts.includes(ext)) {
          outputs.push({
            type: 'image',
            name: outputFile.originalname,
            dataUrl: fileToBase64(outputFile.path)
          });
        } else {
          const outContent = fs.readFileSync(outputFile.path, 'utf-8');
          outputs.push({
            type: 'text',
            name: outputFile.originalname,
            content: outContent,
            highlighted: highlightCode(outContent, detectLanguage(outputFile.originalname))
          });
        }
      }
    }

    return {
      title: taskName || path.parse(codeFile.originalname).name,
      problemDescription,
      codeLang,
      codeHighlighted,
      outputs,
      outputHighlighted: outputs.find(o => o.type === 'text')?.highlighted || ''
    };
  });
}