import puppeteer from 'puppeteer';
import { HighlightedFileResult } from './highlight.service.js';

export interface TaskData {
  title: string;
  description?: string;
  highlightedFiles: HighlightedFileResult[];
  outputLogs?: string;
}

export interface LabReportData {
  labTitle: string;
  tasks: TaskData[];
}

export class PdfService {
  /** Builds the complete HTML document for a lab report (exposed for testing). */
  public static renderHtml(data: LabReportData, htmlTemplate: string): string {
    const tasks = data.tasks ?? [];

    const generatedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Single-pass rendering: values containing "{{...}}" are never re-expanded.
    return this.renderTemplate(htmlTemplate, {
      LAB_TITLE: this.escapeHtml(data.labTitle || 'Lab Report'),
      TASK_COUNT: String(tasks.length),
      GENERATED_AT: this.escapeHtml(generatedAt),
      TASK_INDEX: this.renderTaskIndex(tasks),
      TASK_SECTIONS: tasks.map((task, index) => this.renderTask(task, index + 1)).join('\n')
    });
  }

  public static async generateReport(data: LabReportData, htmlTemplate: string): Promise<Buffer> {
    const html = this.renderHtml(data, htmlTemplate);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Large code listings legitimately take longer than Puppeteer's 30s default.
        timeout: 180000,
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

  private static renderTaskIndex(tasks: TaskData[]): string {
    if (tasks.length === 0) return '';

    const items = tasks
      .map(
        (task, index) => `
          <li>
            <span class="toc-number">Task ${index + 1}</span>
            <span class="toc-title">${this.escapeHtml(task.title)}</span>
          </li>`
      )
      .join('');

    return `
      <div class="task-index">
        <h2>Task Index</h2>
        <ol>${items}</ol>
      </div>`;
  }

  private static renderTask(task: TaskData, number: number): string {
    const codeBlocks =
      task.highlightedFiles && task.highlightedFiles.length > 0
        ? task.highlightedFiles
            .map(
              (file) => `
                <div class="code-section">
                  <h4>
                    ${this.escapeHtml(file.fileName)}
                    <span class="lang-tag">${this.escapeHtml(file.language)}</span>
                  </h4>
                  ${file.htmlContent}
                </div>`
            )
            .join('')
        : '<p class="empty-note">No source files provided.</p>';

    return `
      <section class="task-section">
        <div class="task-header">
          <span class="task-badge">Task ${number}</span>
          <h2>${this.escapeHtml(task.title)}</h2>
        </div>

        <h3>Objective &amp; Context Summary</h3>
        <div class="description-box">${this.escapeHtml(task.description || 'No description provided.')}</div>

        <h3>Implementation Source Code Artifacts</h3>
        ${codeBlocks}

        <h3>Execution Outputs &amp; Operational Logs</h3>
        <pre class="terminal-box">${this.escapeHtml(task.outputLogs || 'No logs provided.')}</pre>
      </section>`;
  }

  private static renderTemplate(template: string, values: Record<string, string>): string {
    return template.replace(/{{([A-Z_]+)}}/g, (match, key: string) => values[key] ?? match);
  }

  private static escapeHtml(text: string): string {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[<>&"']/g, (char) => entities[char]);
  }
}
