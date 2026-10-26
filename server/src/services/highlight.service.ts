import hljs from 'highlight.js';
import path from 'path';

export interface CodeFilePayload {
  originalName: string;
  rawContent: string;
}

export interface HighlightedFileResult {
  fileName: string;
  language: string;
  htmlContent: string;
}

export class HighlightService {
  /**
   * Processes raw text strings or files into safe, marked-up HTML blocks.
   */
  public static highlightFiles(files: CodeFilePayload[]): HighlightedFileResult[] {
    return files.map(file => {
      const extension = path.extname(file.originalName).slice(1);
      let targetLanguage = hljs.getLanguage(extension) ? extension : 'plaintext';
      
      const highlighted = hljs.highlight(file.rawContent, {
        language: targetLanguage,
        ignoreIllegals: true
      });

      return {
        fileName: file.originalName,
        language: highlighted.language || targetLanguage,
        htmlContent: `<pre class="hljs"><code class="language-${highlighted.language}">${highlighted.value}</code></pre>`
      };
    });
  }
}
