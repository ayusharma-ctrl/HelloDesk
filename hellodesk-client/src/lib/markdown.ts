import { marked } from 'marked';

marked.use({
    gfm: true,
    breaks: true,
});

/**
 * Parses raw markdown into clean semantic HTML for rendering in articles and previews.
 */
export function parseMarkdownToHtml(markdown?: string | null): string {
    if (!markdown || !markdown.trim()) return '';
    try {
        const parsed = marked.parse(markdown);
        if (typeof parsed === 'string') {
            return parsed;
        }
        return String(parsed);
    } catch (e) {
        console.warn('Markdown parsing error:', e);
        return markdown || '';
    }
}
