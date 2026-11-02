// Defence in depth for CMS rich text rendered with dangerouslySetInnerHTML. The backend
// sanitises on write, but nested/localised values can bypass its key-based rules, so the
// output here is rebuilt from an allowlist: only these tags survive, with no attributes
// except an https/relative href on links, and every other "<" is escaped as text.
const ALLOWED = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a']);
const VOID = new Set(['br']);

const escapeText = (value) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16) || 0))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number(dec) || 0))
    .replace(/&colon;/gi, ':').replace(/&tab;/gi, '\t').replace(/&newline;/gi, '\n').replace(/&amp;/gi, '&');
}

function safeHref(raw) {
  const value = decodeEntities(raw).replace(/[\u0000- ]/g, '');
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  return null;
}

export function sanitizeHtml(input) {
  if (typeof input !== 'string' || !input) return '';
  const source = input.replace(/<(script|style|iframe|object|embed|template|noscript|textarea|title|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  let output = '';
  let last = 0;
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (let match = tag.exec(source); match; match = tag.exec(source)) {
    output += escapeText(source.slice(last, match.index));
    last = tag.lastIndex;
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    if (closing) { if (!VOID.has(name)) output += `</${name}>`; continue; }
    if (name === 'a') {
      const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(match[3]);
      const safe = href ? safeHref(href[1] ?? href[2] ?? href[3] ?? '') : null;
      output += safe ? `<a href="${escapeAttribute(safe)}"${/^https:/i.test(safe) ? ' rel="noopener noreferrer nofollow"' : ''}>` : '<a>';
      continue;
    }
    output += `<${name}>`;
  }
  return output + escapeText(source.slice(last));
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

// Plain-text view of backend-sanitised HTML (tags dropped, common entities decoded).
export function htmlToText(input) {
  return String(input || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => entities[name]);
}
