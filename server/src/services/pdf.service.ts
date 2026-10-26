import puppeteer from 'puppeteer';
import { HighlightedFileResult } from './highlight.service.js';

export interface ReportData {
  title: string;
  description: string;
  highlightedFiles: HighlightedFileResult[];
  outputLogs?: string;
}

export class PdfService {
  public static async generateReport(data: ReportData, htmlTemplate: string): Promise<Buffer> {
    // Inject data into template
    let html = htmlTemplate;
    const title = this.escapeHtml(data.title || 'Lab Report');
    html = html.replaceAll('{{TITLE}}', title);
    html = html.replaceAll('{{DESCRIPTION}}', this.escapeHtml(data.description || ''));
    
    // Generate code blocks
    let codeBlocksHtml = '';
    if (data.highlightedFiles && data.highlightedFiles.length > 0) {
      for (const file of data.highlightedFiles) {
        codeBlocksHtml += `
          <div class="code-section">
            <h3>${this.escapeHtml(file.fileName)} (${file.language})</h3>
            ${file.htmlContent}
          </div>
        `;
      }
    } else {
      codeBlocksHtml = '<p style="color: var(--text-muted);">No source files provided.</p>';
    }
    html = html.replaceAll('{{CODE_BLOCKS}}', codeBlocksHtml);
    
    // Inject output logs
    html = html.replaceAll('{{OUTPUT_LOGS}}', this.escapeHtml(data.outputLogs || 'No logs provided.'));
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
  
  private static escapeHtml(text: string): string {
    const div = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[<>&"']/g, (m) => div[m as keyof typeof div]);
  }
}
