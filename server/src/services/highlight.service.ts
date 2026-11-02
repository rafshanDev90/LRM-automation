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
      const resolvedLanguage = hljs.getLanguage(extension);
      const targetLanguage = resolvedLanguage ? extension : 'plaintext';

      const highlighted = hljs.highlight(file.rawContent, {
        language: targetLanguage,
        ignoreIllegals: true
      });

      // highlight.js reports short aliases ("js", "py"); show canonical names instead.
      const displayLanguage =
        hljs.getLanguage(highlighted.language)?.name ?? (resolvedLanguage ? extension : 'Plain text');

      return {
        fileName: file.originalName,
        language: displayLanguage,
        htmlContent: `<pre class="hljs"><code class="language-${highlighted.language}">${highlighted.value}</code></pre>`
      };
    });
  }
}
