import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain browser ES module without type declarations
import { escapeHtml, renderMarkdown, renderMessage, safeUrl, validatePayload } from '../public/builder/render.js';

describe('escaping and URLs', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`<img src=x onerror="a">'&`)).toBe('&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;');
  });

  it('only allows http(s) URLs', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
  });
});

describe('renderMarkdown', () => {
  it('never lets raw HTML through', () => {
    const html = renderMarkdown('<script>alert(1)</script> **<b>x</b>**');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops javascript: links but keeps their label', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('href');
    expect(html).toContain('click');
  });

  it('renders the common Discord markdown', () => {
    const html = renderMarkdown('# Title\n**b** *i* __u__ ~~s~~ `c`\n-# small\n> quote\n- item\n[link](https://example.com)');
    expect(html).toContain('<h3 class="md-h">Title</h3>');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<em>i</em>');
    expect(html).toContain('<u>u</u>');
    expect(html).toContain('<s>s</s>');
    expect(html).toContain('<code>c</code>');
    expect(html).toContain('<div class="subtext">small</div>');
    expect(html).toContain('<blockquote>quote</blockquote>');
    expect(html).toContain('<li>item</li>');
    expect(html).toContain('href="https://example.com/"');
  });

  it('keeps code blocks verbatim', () => {
    expect(renderMarkdown('```\n**not bold**\n```')).toContain('<pre><code>**not bold**</code></pre>');
  });

  it('renders mentions as pills', () => {
    expect(renderMarkdown('<@123> <@&456> <#789>')).toBe(
      '<div class="line"><span class="mention">@user</span> <span class="mention">@role</span> <span class="mention">#channel</span></div>',
    );
  });
});

describe('renderMessage', () => {
  it('renders embeds with colour, fields and safe images', () => {
    const html = renderMessage({
      embeds: [{ title: 'T', color: 0xff0000, fields: [{ name: 'F', value: 'V', inline: true }], image: { url: 'javascript:x' } }],
    });
    expect(html).toContain('border-left-color:#ff0000');
    expect(html).toContain('embed-field inline');
    expect(html).not.toContain('javascript:');
  });

  it('renders Components V2 containers, sections and separators', () => {
    const html = renderMessage({
      components: [
        {
          type: 17,
          accent_color: 0x5865f2,
          components: [
            { type: 9, components: [{ type: 10, content: 'hi' }], accessory: { type: 11, media: { url: 'https://cdn.example/a.png' } } },
            { type: 14, divider: true },
            { type: 1, components: [{ type: 2, style: 5, label: 'Go', url: 'https://example.com' }] },
          ],
        },
      ],
    });
    expect(html).toContain('class="container"');
    expect(html).toContain('border-left-color:#5865f2');
    expect(html).toContain('class="thumbnail"');
    expect(html).toContain('separator divider');
    expect(html).toContain('class="button link"');
  });

  it('escapes the persona name', () => {
    expect(renderMessage({ content: 'x' }, { name: '<b>evil</b>' })).toContain('&lt;b&gt;evil&lt;/b&gt;');
  });
});

describe('validatePayload', () => {
  it('flags V2 mixed with content, empty payloads and long content', () => {
    expect(validatePayload({ content: 'x', components: [{ type: 17, components: [] }] })[0]).toMatch(/V2/);
    expect(validatePayload({})[0]).toMatch(/Add content/);
    expect(validatePayload({ content: 'x'.repeat(2001) })[0]).toMatch(/2001\/2000/);
    expect(validatePayload({ content: 'ok' })).toEqual([]);
  });
});
