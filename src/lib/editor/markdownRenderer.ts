import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FileNode } from '../../types/vault';
import { checkNoteExists } from './wikilinkPlugin';
import { transformCalloutsHtml } from './calloutHelper';

// Custom Marked Renderer to enrich code blocks with Header & Copy button, and foldable headings
const renderer = {
  heading({ tokens, depth }: { tokens: any[]; depth: number }) {
    const text = this.parser.parseInline(tokens);
    const tag = `h${depth}`;
    return `
      <${tag} class="markdown-heading group/heading relative flex items-center select-text cursor-pointer transition-colors hover:text-text-secondary" data-heading-depth="${depth}" title="Click to fold/unfold">
        <span class="heading-fold-indicator absolute -left-5 w-4 h-4 flex items-center justify-center opacity-0 transition-all duration-200 text-text-muted">
          <svg class="heading-fold-icon w-3.5 h-3.5 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span class="heading-title-text flex-1">${text}</span>
      </${tag}>
    `;
  },
  code({ text, lang }: { text: string; lang?: string }) {
    const language = (lang || 'text').toLowerCase().trim();
    const displayLang = language === 'text' || !language ? 'Code' : language.toUpperCase();

    // Encode text for safe data attribute storage
    const encodedCode = encodeURIComponent(text);

    return `
      <div class="code-block-wrapper my-4 rounded-xl overflow-hidden border border-border-default bg-bg-hover shadow-xs">
        <div class="code-block-header flex items-center justify-between px-3.5 py-1.5 bg-bg-surface/80 border-b border-border-subtle text-xs font-mono text-text-muted select-none">
          <span class="font-semibold text-text-secondary">${displayLang}</span>
          <button
            type="button"
            class="copy-code-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-bg-hover hover:text-text-primary text-text-muted transition-colors cursor-pointer"
            data-code="${encodedCode}"
            title="Copy to clipboard"
          >
            <svg class="copy-icon w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <svg class="check-icon w-3.5 h-3.5 text-green-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="copy-text text-[11px] font-sans">Copy</span>
          </button>
        </div>
        <pre class="code-block-content p-3.5 m-0 text-sm font-mono text-text-primary leading-relaxed"><code>${DOMPurify.sanitize(text)}</code></pre>
      </div>
    `;
  }
};

marked.use({ renderer, gfm: true, breaks: true });

export const renderMarkdown = async (markdown: string, nodes?: Record<string, FileNode>): Promise<string> => {
  try {
    const rawHtml = await marked.parse(markdown);
    
    // Post-process checkbox lists
    let processedHtml = rawHtml.replace(
      /<li><input disabled="" type="checkbox">/g,
      '<li class="task-list-item" style="list-style: none; margin-left: -1.5rem;"><input type="checkbox" class="task-list-item-checkbox w-4 h-4 text-accent-primary bg-bg-surface border-border-default rounded focus:ring-accent-primary cursor-pointer mr-2">'
    );
    processedHtml = processedHtml.replace(
      /<li><input checked="" disabled="" type="checkbox">/g,
      '<li class="task-list-item" style="list-style: none; margin-left: -1.5rem;"><input type="checkbox" checked class="task-list-item-checkbox w-4 h-4 text-accent-primary bg-bg-surface border-border-default rounded focus:ring-accent-primary cursor-pointer mr-2">'
    );

    // Post-process Highlight ==text==
    processedHtml = processedHtml.replace(/==([^=\n]+)==/g, (_match, text) => {
      return `<mark class="markdown-highlight bg-amber-300/35 dark:bg-amber-400/25 text-inherit px-1 py-0.5 rounded font-normal">${text}</mark>`;
    });

    // Post-process Callout / Admonition Boxes (> [!NOTE])
    processedHtml = transformCalloutsHtml(processedHtml);

    // Post-process Wikilinks [[target]]
    processedHtml = processedHtml.replace(/\[\[(.*?)\]\]/g, (match, target) => {
      const targetName = target.trim();
      if (!targetName) return match;
      const exists = nodes ? checkNoteExists(targetName, nodes) : true;

      const styleClass = exists
        ? 'wikilink-item resolved text-accent-primary font-medium hover:underline cursor-pointer transition-colors'
        : 'wikilink-item ghost text-text-muted hover:text-text-primary font-medium underline decoration-dashed cursor-pointer transition-colors';

      const titleText = exists ? `Open note: "${targetName}"` : `Create and open new note: "${targetName}"`;

      return `<span class="${styleClass}" data-wikilink="${DOMPurify.sanitize(targetName)}" title="${titleText}">${DOMPurify.sanitize(targetName)}</span>`;
    });

    const cleanHtml = DOMPurify.sanitize(processedHtml, {
      ADD_TAGS: ['svg', 'path', 'rect', 'polyline', 'button', 'span', 'mark', 'details', 'summary', 'circle', 'line'],
      ADD_ATTR: [
        'class',
        'style',
        'type',
        'checked',
        'open',
        'data-code',
        'data-wikilink',
        'viewBox',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'xmlns',
        'd',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
        'cx',
        'cy',
        'r',
        'width',
        'height',
        'rx',
        'ry',
        'points',
        'title'
      ]
    });
    return cleanHtml;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return '<p>Error rendering content</p>';
  }
};
