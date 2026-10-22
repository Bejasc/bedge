// Discord-style preview renderer. Pure string functions so the API tests can import it.
// Every piece of user text is HTML-escaped before any markup is added.

const V2_TYPES = new Set([9, 10, 11, 12, 13, 14, 17]);
const IS_COMPONENTS_V2 = 1 << 15;

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function colourHex(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `#${Math.max(0, Math.min(0xffffff, Math.trunc(value))).toString(16).padStart(6, '0')}`;
}

function formatTimestamp(unix, style) {
  const date = new Date(Number(unix) * 1000);
  if (Number.isNaN(date.getTime())) return null;
  const opts = {
    t: { timeStyle: 'short' },
    T: { timeStyle: 'medium' },
    d: { dateStyle: 'short' },
    D: { dateStyle: 'long' },
    f: { dateStyle: 'long', timeStyle: 'short' },
    F: { dateStyle: 'full', timeStyle: 'short' },
  }[style ?? 'f'];
  if (style === 'R') {
    const diff = Math.round((date.getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(diff, 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  }
  return new Intl.DateTimeFormat('en-GB', opts ?? { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

/** Inline markdown on already-escaped text. */
function inline(escaped) {
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      const href = safeUrl(url.replaceAll('&amp;', '&'));
      return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    })
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (_, pre, url) => {
      const href = safeUrl(url.replaceAll('&amp;', '&'));
      return href ? `${pre}<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${url}</a>` : `${pre}${url}`;
    })
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>')
    .replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@user</span>')
    .replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@role</span>')
    .replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#channel</span>')
    .replace(/@(everyone|here)\b/g, '<span class="mention">@$1</span>')
    .replace(/&lt;a?:(\w+):(\d+)&gt;/g, (_, name, id) => `<img class="emoji" alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.webp?size=48">`)
    .replace(/&lt;t:(-?\d+)(?::([tTdDfFR]))?&gt;/g, (match, unix, style) => {
      const text = formatTimestamp(unix, style);
      return text ? `<span class="timestamp">${escapeHtml(text)}</span>` : match;
    });
}

export function renderMarkdown(text) {
  const blocks = [];
  const stash = (html) => `\u0000${blocks.push(html) - 1}\u0000`;
  const src = escapeHtml(String(text ?? '').replaceAll('\u0000', ''))
    .replace(/```(?:[\w-]+\n)?([\s\S]*?)```/g, (_, code) => stash(`<pre><code>${code.replace(/^\n|\n$/g, '')}</code></pre>`))
    .replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${code}</code>`));

  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of src.split('\n')) {
    let m;
    if ((m = line.match(/^(#{1,3}) (.+)$/))) {
      closeList();
      out.push(`<h${m[1].length + 2} class="md-h">${inline(m[2])}</h${m[1].length + 2}>`);
    } else if ((m = line.match(/^-# (.+)$/))) {
      closeList();
      out.push(`<div class="subtext">${inline(m[1])}</div>`);
    } else if ((m = line.match(/^&gt; ?(.*)$/))) {
      closeList();
      out.push(`<blockquote>${inline(m[1]) || '&nbsp;'}</blockquote>`);
    } else if ((m = line.match(/^\s*[-*] (.+)$/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\. (.+)$/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      out.push(`<div class="line">${inline(line) || '<br>'}</div>`);
    }
  }
  closeList();
  return out.join('').replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

function img(url, cls) {
  const href = safeUrl(url);
  return href ? `<img class="${cls}" src="${escapeHtml(href)}" alt="">` : '';
}

function renderEmbed(embed) {
  const colour = colourHex(embed.color) ?? '#1e1f22';
  const parts = [];
  if (embed.author?.name) {
    const name = escapeHtml(embed.author.name);
    const url = safeUrl(embed.author.url);
    parts.push(`<div class="embed-author">${img(embed.author.icon_url, 'embed-author-icon')}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name}</div>`);
  }
  if (embed.title) {
    const url = safeUrl(embed.url);
    const title = inline(escapeHtml(embed.title));
    parts.push(`<div class="embed-title">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}</div>`);
  }
  if (embed.description) parts.push(`<div class="embed-description">${renderMarkdown(embed.description)}</div>`);
  if (Array.isArray(embed.fields) && embed.fields.length) {
    const fields = embed.fields
      .map((f) => `<div class="embed-field${f.inline ? ' inline' : ''}"><div class="embed-field-name">${inline(escapeHtml(f.name))}</div><div class="embed-field-value">${renderMarkdown(f.value)}</div></div>`)
      .join('');
    parts.push(`<div class="embed-fields">${fields}</div>`);
  }
  if (embed.image?.url) parts.push(img(embed.image.url, 'embed-image'));
  const footerBits = [];
  if (embed.footer?.text) footerBits.push(escapeHtml(embed.footer.text));
  if (embed.timestamp) {
    const when = new Date(embed.timestamp);
    if (!Number.isNaN(when.getTime())) footerBits.push(escapeHtml(when.toLocaleString('en-GB')));
  }
  if (footerBits.length) parts.push(`<div class="embed-footer">${img(embed.footer?.icon_url, 'embed-footer-icon')}${footerBits.join(' • ')}</div>`);
  const thumb = embed.thumbnail?.url ? img(embed.thumbnail.url, 'embed-thumbnail') : '';
  return `<div class="embed" style="border-left-color:${colour}"><div class="embed-body">${parts.join('')}</div>${thumb}</div>`;
}

const BUTTON_STYLES = { 1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'link', 6: 'premium' };

function renderButton(b) {
  const style = BUTTON_STYLES[b.style] ?? 'secondary';
  const emoji = b.emoji?.name && !b.emoji.id ? `${escapeHtml(b.emoji.name)} ` : '';
  const label = `${emoji}${escapeHtml(b.label ?? '')}`;
  const href = b.style === 5 ? safeUrl(b.url) : null;
  const icon = b.style === 5 ? ' <span class="external">↗</span>' : '';
  return href
    ? `<a class="button ${style}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}${icon}</a>`
    : `<span class="button ${style}${b.disabled ? ' disabled' : ''}">${label}${icon}</span>`;
}

function renderComponent(c) {
  if (!c || typeof c !== 'object') return '';
  switch (c.type) {
    case 1:
      return `<div class="action-row">${(c.components ?? []).map(renderComponent).join('')}</div>`;
    case 2:
      return renderButton(c);
    case 3: case 5: case 6: case 7: case 8:
      return `<div class="select">${escapeHtml(c.placeholder ?? 'Make a selection')}<span class="chevron">⌄</span></div>`;
    case 9: {
      const text = (c.components ?? []).map(renderComponent).join('');
      const acc = c.accessory?.type === 11 ? img(c.accessory.media?.url, 'thumbnail') : c.accessory?.type === 2 ? renderButton(c.accessory) : '';
      return `<div class="section"><div class="section-text">${text}</div>${acc ? `<div class="section-accessory">${acc}</div>` : ''}</div>`;
    }
    case 10:
      return `<div class="text-display">${renderMarkdown(c.content)}</div>`;
    case 11:
      return img(c.media?.url, 'thumbnail');
    case 12: {
      const items = (c.items ?? []).slice(0, 10);
      return `<div class="gallery n${Math.min(items.length, 4)}">${items.map((i) => img(i.media?.url, 'gallery-item')).join('')}</div>`;
    }
    case 13:
      return `<div class="file">📄 ${escapeHtml(c.file?.url ?? 'attachment')}</div>`;
    case 14:
      return `<div class="separator${c.divider === false ? '' : ' divider'}${c.spacing === 2 ? ' large' : ''}"></div>`;
    case 17: {
      const accent = colourHex(c.accent_color);
      return `<div class="container${c.spoiler ? ' spoiler-box' : ''}"${accent ? ` style="border-left-color:${accent}"` : ''}>${(c.components ?? []).map(renderComponent).join('')}</div>`;
    }
    default:
      return `<div class="unknown">Unsupported component type ${escapeHtml(c.type)}</div>`;
  }
}

/** Mirrors the bot's checks so problems show up before `/post` rejects the draft. */
export function validatePayload(payload) {
  const problems = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['The payload must be a JSON object.'];
  const components = Array.isArray(payload.components) ? payload.components : [];
  const v2 = Boolean((payload.flags ?? 0) & IS_COMPONENTS_V2) || hasV2(components);
  if (v2 && (payload.content || payload.embeds?.length)) problems.push('Components V2 messages can’t also have content or embeds.');
  if (!payload.content && !payload.embeds?.length && !components.length) problems.push('Add content, embeds or components.');
  if (typeof payload.content === 'string' && payload.content.length > 2000) problems.push(`Content is ${payload.content.length}/2000 characters.`);
  if (Array.isArray(payload.embeds) && payload.embeds.length > 10) problems.push('At most 10 embeds.');
  return problems;
}

export function hasV2(components) {
  return Array.isArray(components) && components.some((c) => c && (V2_TYPES.has(c.type) || hasV2(c.components) || (c.accessory && hasV2([c.accessory]))));
}

export function renderMessage(payload, author = {}) {
  const name = escapeHtml(author.name || 'BedgeBot');
  const avatar = safeUrl(author.avatarUrl) ?? author.defaultAvatar ?? '';
  const content = payload?.content ? `<div class="content">${renderMarkdown(payload.content)}</div>` : '';
  const embeds = Array.isArray(payload?.embeds) ? payload.embeds.map(renderEmbed).join('') : '';
  const components = Array.isArray(payload?.components) ? payload.components.map(renderComponent).join('') : '';
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `<article class="message">
  <img class="avatar" src="${escapeHtml(avatar)}" alt="">
  <div class="message-body">
    <header><span class="username">${name}</span><span class="app-badge">APP</span><time>Today at ${now}</time></header>
    ${content}${embeds}<div class="components">${components}</div>
  </div>
</article>`;
}
