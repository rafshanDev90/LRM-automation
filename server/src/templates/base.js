export class BaseTemplate {
  constructor(name, description, options = {}) {
    this.name = name;
    this.description = description;
    this.options = {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      accentColor: '#1e3a8a',
      showLineNumbers: false,
      pageNumbers: true,
      ...options
    };
  }

  getCSS() {
    return `@page {
  margin: 2cm;
  size: A4;
}

* {
  box-sizing: border-box;
}

body {
  font-family: ${this.options.fontFamily};
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a2e;
  margin: 0;
  padding: 0;
}

:root {
  --accent: ${this.options.accentColor};
  --accent-light: ${this.shadeColor(this.options.accentColor, 20)};
  --text: #1a1a2e;
  --text-muted: #64748b;
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --border: #e2e8f0;
  --code-bg: #0f172a;
  --output-bg: #1e1e1e;
}

@media print {
  .task-card {
    page-break-inside: avoid;
  }
}`;
  }

  shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) & 255;
    const G = (num >> 8) & 255;
    const B = num & 255;
    const r = Math.max(0, Math.min(255, R + amt));
    const g = Math.max(0, Math.min(255, G + amt));
    const b = Math.max(0, Math.min(255, B + amt));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  render(problemDescHTML, codeHTML, outputs) {
    return this.renderTemplate(problemDescHTML, codeHTML, outputs);
  }

  renderTemplate() {
    throw new Error('renderTemplate must be implemented by subclass');
  }

  // Simple markdown-lite converter (basic)
  convertMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Escape HTML
    html = html.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));

    // Code blocks ```lang\n...```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Simple approach - wrap consecutive li in ol if they came from numbers
    html = html.replace(/(<li>.*<\/li>)/gs, (m, p) => {
      if (m.includes('<ul>')) return m;
      return '<ol>' + m + '</ol>';
    });

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}