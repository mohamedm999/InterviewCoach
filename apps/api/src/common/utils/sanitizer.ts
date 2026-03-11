import { filterXSS, IFilterXSSOptions } from 'xss';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The raw user input string
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  const options: IFilterXSSOptions = {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
    css: false,
  };

  return filterXSS(input, options);
}

/**
 * Sanitizes HTML content while allowing safe formatting tags
 * Use this for rich text editors or formatted content
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML with only safe tags
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  const options: IFilterXSSOptions = {
    whiteList: {
      b: [],
      i: [],
      u: [],
      em: [],
      strong: [],
      p: [],
      br: [],
      ul: [],
      ol: [],
      li: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      blockquote: [],
      code: [],
      pre: [],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'frame',
    ],
    css: {
      whiteList: {
        color: true,
        'background-color': true,
        'font-weight': true,
        'font-style': true,
        'text-align': true,
      },
    },
  };

  return filterXSS(html, options);
}

/**
 * Escapes HTML entities for safe display
 * @param text - The text to escape
 * @returns Escaped text safe for HTML display
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}
