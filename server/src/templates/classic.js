import { BaseTemplate } from './base.js';

export class ClassicTemplate extends BaseTemplate {
  constructor() {
    super(
      'Classic Academic',
      'Clean, formal layout with serif fonts - ideal for traditional lab reports'
    );
    this.options = {
      ...this.options,
      fontFamily: '"Times New Roman", Georgia, "Liberation Serif", serif',
      accentColor: '#1e3a8a',
      pageNumbers: true
    };
  }

  renderTemplate({ tasks, labTitle, meta }) {
    const css = this.getCSS();
    const date = new Date(meta.generatedAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tasksHTML = tasks.map((task, idx) => this.renderTask(task, idx + 1)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(labTitle)}</title>
  <style>
${css}
${this.getTaskCSS()}
  </style>
</head>
<body>
  <header class="report-header">
    <h1 class="lab-title">${this.escapeHtml(labTitle)}</h1>
    <div class="report-meta">
      <span>Generated: ${date}</span>
      <span>Total Tasks: ${tasks.length}</span>
    </div>
  </header>

  <main class="content">
    ${tasksHTML}
  </main>

  ${this.options.pageNumbers ? `<script>window.onload = function() { window.print(); }</script>` : ''}
</body>
</html>`;
  }

  renderTask(task, taskNum) {
    const probHTML = task.problemDescription
      ? `<div class="section">
           <div class="section-title">2. Problem Description</div>
           <div class="section-content">${this.convertMarkdown(task.problemDescription)}</div>
         </div>`
      : '';

    const codeHTML = `<div class="section">
                        <div class="section-title">3. Source Code</div>
                        <div class="code-wrapper">
                          <pre class="code-block"><code>${task.codeHighlighted}</code></pre>
                        </div>
                      </div>`;

    const outputHTML = task.outputs && task.outputs.length > 0
      ? `<div class="section">
           <div class="section-title">4. Output</div>
           ${task.outputs.map(out => {
             if (out.type === 'image') {
               return `<div class="image-wrapper">
                         <img src="${out.dataUrl}" alt="${this.escapeHtml(out.name)}" />
                       </div>`;
             }
             return `<div class="output-wrapper">
                       <pre class="output-block"><code>${out.highlighted || this.escapeHtml(out.content)}</code></pre>
                     </div>`;
           }).join('')}
         </div>`
      : (task.outputHighlighted
          ? `<div class="section">
               <div class="section-title">4. Output</div>
               <div class="output-wrapper">
                 <pre class="output-block"><code>${task.outputHighlighted}</code></pre>
               </div>
             </div>`
          : '');

    return `<section class="task-card">
      <div class="task-header">
        <h2 class="task-title">Task ${taskNum}: ${this.escapeHtml(task.title)}</h2>
      </div>

      <div class="section">
        <div class="section-title">1. Title</div>
        <div class="section-content">${this.escapeHtml(task.title)}</div>
      </div>

      ${probHTML}
      ${codeHTML}
      ${outputHTML}
    </section>`;
  }

  getTaskCSS() {
    return `.report-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--accent);
}

.lab-title {
  font-size: 24pt;
  font-weight: bold;
  color: var(--text);
  margin: 0 0 0.75rem 0;
  font-family: ${this.options.fontFamily};
}

.report-meta {
  font-size: 10pt;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.task-card {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.task-card:last-child {
  border-bottom: none;
}

.task-header {
  margin-bottom: 1.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(to right, rgba(30, 58, 138, 0.08), transparent);
  border-left: 4px solid var(--accent);
  border-radius: 0 4px 4px 0;
}

.task-title {
  font-size: 16pt;
  font-weight: bold;
  color: var(--text);
  margin: 0;
  font-family: ${this.options.fontFamily};
}

.section {
  margin-bottom: 1.75rem;
}

.section-title {
  font-size: 13pt;
  font-weight: bold;
  color: var(--text);
  margin: 0 0 0.75rem 0;
  font-family: ${this.options.fontFamily};
  text-decoration: underline;
  text-underline-offset: 4px;
}

.section-content {
  font-size: 11pt;
  line-height: 1.7;
  color: var(--text);
}

.section-content p {
  margin: 0 0 0.75rem 0;
}

.section-content ul,
.section-content ol {
  margin: 0.5rem 0;
  padding-left: 2rem;
}

.section-content li {
  margin-bottom: 0.375rem;
}

.code-wrapper {
  background: var(--code-bg);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
}

.code-block {
  background: transparent !important;
  color: #e2e8f0;
  margin: 0;
  padding: 1.25rem;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
  font-size: 9pt;
  line-height: 1.6;
  background: transparent !important;
  white-space: pre;
}

.output-wrapper {
  background: var(--output-bg);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.4);
}

.output-block {
  background: transparent !important;
  color: #d4d4d4;
  margin: 0;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.output-block code {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
  font-size: 9pt;
  line-height: 1.6;
  background: transparent !important;
  white-space: pre;
}

.image-wrapper {
  margin: 1rem 0;
  text-align: center;
  page-break-inside: avoid;
}

.image-wrapper img {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }
}