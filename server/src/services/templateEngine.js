import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTemplate } from '../templates/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../../outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export async function generateLabReport(tasks, labTitle = 'Lab Report', templateId = 'classic') {
  const template = getTemplate(templateId);
  const html = template.renderTemplate({
    tasks,
    labTitle,
    meta: {
      generatedAt: new Date().toISOString()
    }
  });

  const pdfPath = path.join(OUTPUT_DIR, `lab-report-${Date.now()}.pdf`);

  const { default: puppeteer } = await import('puppeteer');
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