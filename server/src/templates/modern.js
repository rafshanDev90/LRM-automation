import { BaseTemplate } from './base.js';

export class ModernTemplate extends BaseTemplate {
  constructor() {
    super(
      'Modern Clean',
      'Contemporary card-based design with sans-serif fonts'
    );
    this.options = {
      ...this.options,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      accentColor: '#2563eb',
      pageNumbers: true
    };
  }

  renderTemplate({ tasks, labTitle, meta }) {
    const css = this.getCSS();
    const date = new Date(meta.generatedAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
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
  <header class="modern-header">
    <div class="header-accent"></div>
    <h1 class="modern-title">${this.escapeHtml(labTitle)}</h1>
    <div class="modern-meta">
      <span class="meta-item">📅 ${date}</span>
      <span class="meta-item">📋 ${tasks.length} Task${tasks.length > 1 ? 's' : ''}</span>
    </div>
  </header>

  <main class="modern-main">
    ${tasksHTML}
  </main>
</body>
</html>`;
  }

  renderTask(task, taskNum) {
    const probHTML = task.problemDescription
      ? `<div class="card-section keep-together">
           <div class="section-label">Problem Description</div>
           <div class="section-body">${this.convertMarkdown(task.problemDescription)}</div>
         </div>`
      : '';

    const codeFiles = task.codeFiles?.length
      ? task.codeFiles
      : [{ name: 'source', lang: task.codeLang, highlighted: task.codeHighlighted, allowBreak: false }];

    const codeBlocks = codeFiles.map(cf => `
        <div class="code-file ${cf.allowBreak ? 'code-long' : 'code-short'}">
          ${codeFiles.length > 1 ? `<div class="file-label">${this.escapeHtml(cf.name)}</div>` : ''}
          <div class="modern-code-wrap"><pre class="modern-code"><code>${cf.highlighted}</code></pre></div>
        </div>`).join('');

    const codeHTML = `<div class="card-section">
                        <div class="section-label">Source Code</div>
                        ${codeBlocks}
                      </div>`;

    const outputHTML = this.renderOutputs(task);

    return `<article class="task-card-modern">
      <div class="task-card-header keep-together">
        <span class="task-badge">Task ${taskNum}</span>
        <h2 class="task-name">${this.escapeHtml(task.title)}</h2>
      </div>
      <div class="task-card-body">
        ${probHTML}
        ${codeHTML}
        ${outputHTML}
      </div>
    </article>`;
  }

  renderOutputs(task) {
    if (task.outputs && task.outputs.length > 0) {
      const items = task.outputs.map(out => {
        if (out.type === 'image') {
          return `<div class="modern-image-wrap keep-together">
                    <img src="${out.dataUrl}" alt="${this.escapeHtml(out.name)}" />
                  </div>`;
        }
        return `<div class="modern-output-wrap">
                  <pre class="modern-output"><code>${out.highlighted || this.escapeHtml(out.content)}</code></pre>
                </div>`;
      }).join('');
      return `<div class="card-section">
                <div class="section-label">Output</div>
                ${items}
              </div>`;
    }

    if (task.outputHighlighted) {
      return `<div class="card-section">
                <div class="section-label">Output</div>
                <div class="modern-output-wrap">
                  <pre class="modern-output"><code>${task.outputHighlighted}</code></pre>
                </div>
              </div>`;
    }
    return '';
  }

  getTaskCSS() {
    return `/* ===== Page-break rules =====
       keep-together    -> never split (headers, description, images)
       code-short (<50) -> 1 page (avoid break)
       code-long (>=50) -> may flow to next page */
.keep-together {
  page-break-inside: avoid;
  break-inside: avoid;
  orphans: 3;
  widows: 3;
}

.code-short .modern-code-wrap {
  page-break-inside: avoid;
  break-inside: avoid;
}

.code-long .modern-code-wrap {
  page-break-inside: auto;
  break-inside: auto;
}

.modern-code, .modern-output {
  page-break-inside: auto;
  break-inside: auto;
}

.modern-code code, .modern-output code {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

.modern-header {
  margin-bottom: 2.5rem;
}

.header-accent {
  height: 5px;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: 3px;
  margin-bottom: 1.5rem;
}

.modern-title {
  font-size: 26pt;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 1rem 0;
  font-family: ${this.options.fontFamily};
  letter-spacing: -0.02em;
}

.modern-meta {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 10pt;
  color: var(--text-muted);
  font-weight: 500;
}

.modern-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.task-card-modern {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.task-card-header {
  padding: 1.25rem 1.75rem;
  background: var(--bg-alt);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-badge {
  display: inline-block;
  width: fit-content;
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: rgba(37, 99, 235, 0.1);
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
}

.task-name {
  font-size: 15pt;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  font-family: ${this.options.fontFamily};
  letter-spacing: -0.01em;
}

.task-card-body {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.section-label {
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.section-body {
  font-size: 10.5pt;
  line-height: 1.8;
  color: var(--text);
}

.section-body p {
  margin: 0 0 0.875rem 0;
}

.section-body ul,
.section-body ol {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.section-body li {
  margin-bottom: 0.5rem;
}

.code-file {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.code-file .file-label {
  font-family: 'JetBrains Mono', Menlo, monospace;
  font-size: 9pt;
  font-weight: 700;
  color: var(--accent);
  background: rgba(37, 99, 235, 0.08);
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
}

.modern-code-wrap {
  background: var(--code-bg);
  border-radius: 8px;
  overflow: hidden;
}

.code-short .modern-code,
.code-long .modern-code {
  color: #e2e8f0;
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
  line-height: 1.7;
}

.code-short .modern-code {
  max-height: none;
}

.code-long .modern-code {
  max-height: 640px;
  overflow-y: auto;
}

.modern-code code,
.modern-output code {
  font-family: 'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace;
  font-size: 9pt;
  background: transparent !important;
}

.modern-output-wrap {
  background: #0c1021;
  border-radius: 8px;
  overflow: hidden;
}

.modern-output {
  color: #a5b4fc;
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
  line-height: 1.7;
}

.modern-image-wrap img {
  width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
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