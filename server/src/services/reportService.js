import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-asm6502.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../../outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const LANG_MAP = {
  '.js': 'javascript', '.py': 'python', '.c': 'c', '.cpp': 'cpp',
  '.asm': 'nasm', '.s': 'nasm', '.txt': 'text', '.out': 'text', '.log': 'text'
};

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return LANG_MAP[ext] || 'text';
}

function highlightCode(code, language) {
  try {
    const lang = Prism.languages[language] ? language : 'text';
    return Prism.highlight(code, Prism.languages[lang], lang);
  } catch {
    return Prism.util.escape(code);
  }
}

function generateHTML(tasks, labTitle) {
  const prismCSS = fs.readFileSync(
    path.join(__dirname, '../../node_modules/prismjs/themes/prism-tomorrow.css'),
    'utf-8'
  );

  const taskCards = tasks.map((task, i) => `
    <div class="task-card">
      <div class="task-header">
        <span class="task-number">Task ${i + 1}</span>
        <span class="task-name">${task.name}</span>
      </div>
      <div class="task-content">
        <div class="code-block">
          <div class="block-label">Source Code</div>
          <pre class="language-${task.codeLang}"><code>${task.codeHighlighted}</code></pre>
        </div>
        ${task.output ? `
        <div class="output-block">
          <div class="block-label">Output</div>
          <pre class="language-text"><code>${task.outputHighlighted}</code></pre>
        </div>` : ''}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${labTitle}</title>
  <style>
    ${prismCSS}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 2cm; size: A4; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a2e; }
    .header { text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid #2563eb; }
    .header h1 { font-size: 28pt; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; }
    .header .meta { color: #64748b; font-size: 11pt; }
    .task-card { break-inside: avoid; margin-bottom: 2rem; page-break-inside: avoid; }
    .task-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border-radius: 8px 8px 0 0; }
    .task-number { font-weight: 700; font-size: 12pt; text-transform: uppercase; letter-spacing: 0.5px; }
    .task-name { font-size: 11pt; opacity: 0.9; }
    .task-content { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; background: #f8fafc; }
    .block-label { padding: 0.5rem 1rem; background: #e2e8f0; font-weight: 600; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 1px solid #cbd5e1; }
    pre { margin: 0; padding: 1rem; overflow-x: auto; background: transparent !important; }
    code { font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; font-size: 9.5pt; line-height: 1.6; }
    .code-block pre { background: #0f172a !important; }
    .output-block pre { background: #1e1e1e !important; color: #d4d4d4; border-top: 1px solid #333; }
    .token.comment { color: #6a9955; }
    .token.keyword { color: #c586c0; }
    .token.string { color: #ce9178; }
    .token.function { color: #dcdcaa; }
    .token.number { color: #b5cea8; }
    .token.operator { color: #d4d4d4; }
    .token.punctuation { color: #d4d4d4; }
    .token.class-name { color: #4ec9b0; }
    .token.constant { color: #4fc1ff; }
    @media print { .task-card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${labTitle}</h1>
    <div class="meta">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • ${tasks.length} Task${tasks.length > 1 ? 's' : ''}</div>
  </div>
  <div class="tasks">${taskCards}</div>
</body>
</html>`;
}

export async function generateLabReport(tasks, labTitle = 'Lab Report') {
  const html = generateHTML(tasks, labTitle);
  const pdfPath = path.join(OUTPUT_DIR, `lab-report-${Date.now()}.pdf`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      preferCSSPageSize: true
    });
    return pdfPath;
  } finally {
    await browser.close();
  }
}

export function processUploadedFiles(files, taskPairs) {
  // taskPairs: [{ codeFileId, outputFileId, taskName }, ...]
  const fileMap = new Map(files.map(f => [f.filename, f]));

  return taskPairs.map(({ codeFileId, outputFileId, taskName }) => {
    const codeFile = fileMap.get(codeFileId);
    const outputFile = fileMap.get(outputFileId);

    if (!codeFile) throw new Error(`Code file not found: ${codeFileId}`);

    const codeContent = fs.readFileSync(codeFile.path, 'utf-8');
    const codeLang = detectLanguage(codeFile.originalname);
    const codeHighlighted = highlightCode(codeContent, codeLang);

    let outputHighlighted = '';
    let outputLang = 'text';
    if (outputFile) {
      const outputContent = fs.readFileSync(outputFile.path, 'utf-8');
      outputLang = detectLanguage(outputFile.originalname);
      outputHighlighted = highlightCode(outputContent, outputLang);
    }

    return {
      name: taskName || path.parse(codeFile.originalname).name,
      codeLang,
      codeHighlighted,
      outputHighlighted,
      output: !!outputFile
    };
  });
}