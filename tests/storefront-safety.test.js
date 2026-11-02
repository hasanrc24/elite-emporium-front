import { describe, expect, it } from 'vitest';
import { isBangladeshiPhone, safeContentHref, safeReturnPath } from '@/lib/utils';
import { htmlToText, sanitizeHtml } from '@/lib/safe-html';

describe('safeReturnPath', () => {
  it('keeps same-origin locale paths with query and hash', () => {
    expect(safeReturnPath('/en/account/orders?page=2#top', '/en')).toBe('/en/account/orders?page=2#top');
    expect(safeReturnPath('/bn', '/en')).toBe('/bn');
  });

  it('rejects open-redirect and non-allowlisted inputs', () => {
    for (const value of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', 'javascript:alert(1)', '/admin', '/english', '/en/../../evil', '/en\tx', null, undefined, '']) {
      expect(safeReturnPath(value, '/en/account')).toBe('/en/account');
    }
  });
});

describe('isBangladeshiPhone', () => {
  it('accepts the formats the backend normaliser accepts', () => {
    for (const value of ['01712345678', '+8801712345678', '8801712345678', '017-1234-5678']) expect(isBangladeshiPhone(value)).toBe(true);
  });

  it('rejects invalid operators and lengths', () => {
    for (const value of ['', '0171234567', '01212345678', '+441712345678']) expect(isBangladeshiPhone(value)).toBe(false);
  });
});

describe('safeContentHref', () => {
  it('localizes relative CMS links and keeps https links', () => {
    expect(safeContentHref('/shop', 'bn')).toBe('/bn/shop');
    expect(safeContentHref('/en/shop', 'bn')).toBe('/en/shop');
    expect(safeContentHref('https://example.com/a', 'en')).toBe('https://example.com/a');
  });

  it('drops unsafe schemes and protocol-relative links', () => {
    for (const value of ['javascript:alert(1)', 'http://example.com', '//evil.com', 'data:text/html,x', {}]) expect(safeContentHref(value, 'en')).toBeNull();
  });
});

describe('sanitizeHtml', () => {
  it('keeps allowlisted formatting and safe links', () => {
    expect(sanitizeHtml('<p class="x">Hi <strong>there</strong><br/></p><a href="https://example.com" onclick="x()">go</a>'))
      .toBe('<p>Hi <strong>there</strong><br></p><a href="https://example.com" rel="noopener noreferrer nofollow">go</a>');
  });

  it('removes scripts, handlers and dangerous URLs', () => {
    const output = sanitizeHtml('<img src=x onerror=alert(1)><script>alert(2)</script><a href="jav&#x61;script:alert(3)">x</a><svg onload=alert(4)></svg><p onmouseover="alert(5)">t</p>');
    expect(output).toBe('<a>x</a><p>t</p>');
  });

  it('escapes stray markup so it renders as text', () => {
    expect(sanitizeHtml('1 < 2 <scr<script>ipt>alert(1)</script>')).toBe('1 &lt; 2 &lt;scr');
    expect(sanitizeHtml('<p title="a>b">ok</p>')).toBe('<p>ok</p>');
  });
});

describe('htmlToText', () => {
  it('decodes sanitised entities and drops tags for plain-text display', () => {
    expect(htmlToText('<p>Silk &amp; cotton &lt;new&gt;</p>')).toBe('Silk & cotton <new>');
    expect(htmlToText(null)).toBe('');
  });
});
