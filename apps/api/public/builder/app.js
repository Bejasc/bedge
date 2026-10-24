import { hasV2, renderMessage, validatePayload } from './render.js';

const $ = (id) => document.getElementById(id);
const editor = $('json');
const preview = $('preview');
const status = $('status');
const banner = $('banner');
const snippetButtons = [...document.querySelectorAll('[data-snippet]')];

const STORAGE_KEY = 'bedge-builder-draft';
const DEFAULT_PAYLOAD = {
  embeds: [
    {
      title: 'Hello from BedgeBot',
      description: 'Edit the JSON on the left. **Markdown** works, as do <t:1767225600:R> timestamps.',
      color: 0x5865f2,
      fields: [
        { name: 'Inline field', value: 'One', inline: true },
        { name: 'Inline field', value: 'Two', inline: true },
      ],
      footer: { text: 'BedgeBot' },
    },
  ],
};

const SNIPPETS = {
  text: () => ({ content: 'Hello **world**!' }),
  embed: () => ({ embeds: [{ title: 'Title', description: 'Description', color: 0x5865f2 }] }),
  card: () => ({
    components: [
      {
        type: 17,
        accent_color: 0x5865f2,
        components: [
          { type: 10, content: '### Card title\nCards are Components V2 containers.' },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: '-# BedgeBot' },
        ],
      },
    ],
  }),
};

let source; // set when the draft came from *Open in builder*, so the save keeps the link to the original message
let current = null;

function showBanner(html, kind = 'info') {
  banner.innerHTML = html;
  banner.className = `banner${kind === 'error' ? ' error' : ''}`;
  banner.hidden = false;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, editor.value);
  } catch {
    // Storage can be unavailable (private mode); the editor still works.
  }
}

function update() {
  persist();
  let payload;
  try {
    payload = JSON.parse(editor.value);
  } catch (error) {
    current = null;
    status.className = 'status bad';
    status.textContent = `JSON error: ${error.message}`;
    snippetButtons.forEach((b) => (b.disabled = true));
    return;
  }
  current = payload;
  snippetButtons.forEach((b) => (b.disabled = false));
  const problems = validatePayload(payload);
  status.className = `status ${problems.length ? 'bad' : 'ok'}`;
  status.textContent = problems.length ? problems.join('\n') : `✓ Looks good${hasV2(payload.components) ? ' — Components V2' : ''}`;
  preview.innerHTML = renderMessage(payload, {
    name: $('persona-name').value.trim(),
    avatarUrl: $('persona-avatar').value.trim(),
    defaultAvatar: 'bedgebot.png',
  });
}

function setPayload(payload) {
  editor.value = JSON.stringify(payload, null, 2);
  update();
}

function applySnippet(kind) {
  if (!current) return;
  const next = structuredClone(current);
  if (kind === 'field' || kind === 'link') {
    if (kind === 'field') {
      const embed = next.embeds?.[next.embeds.length - 1];
      if (!embed) return showBanner('Add an embed first, then fields go on the last one.', 'error');
      embed.fields = [...(embed.fields ?? []), { name: 'Field', value: 'Value', inline: true }];
    } else {
      const button = { type: 2, style: 5, label: 'Open link', url: 'https://example.com' };
      const container = next.components?.find((c) => c.type === 17);
      const target = container ? container.components : (next.components ??= []);
      const row = target.findLast?.((c) => c.type === 1 && c.components.length < 5);
      if (row) row.components.push(button);
      else target.push({ type: 1, components: [button] });
    }
    return setPayload(next);
  }
  setPayload(SNIPPETS[kind]());
}

async function loadDraft(code) {
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  try {
    const res = await fetch(`/api/drafts/${encodeURIComponent(clean)}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
    source = body.source;
    setPayload(body.payload);
    showBanner(
      source
        ? `Loaded draft <strong>${clean}</strong>, opened from an existing message. Save, then run <code>/post code:NEWCODE</code> and choose <em>Update original</em>.`
        : `Loaded draft <strong>${clean}</strong>.`,
    );
    history.replaceState(null, '', `?code=${clean}`);
  } catch (error) {
    showBanner(`Couldn’t load <strong>${clean.replace(/[^A-Z0-9]/g, '')}</strong>: ${String(error.message).replace(/[<>&]/g, '')}`, 'error');
  }
}

async function saveDraft() {
  if (!current) return showBanner('Fix the JSON before saving.', 'error');
  const problems = validatePayload(current);
  if (problems.length) return showBanner(`Fix these first: ${problems.join(' ')}`, 'error');
  const button = $('save');
  button.disabled = true;
  try {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: current, source }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error([body.message, ...(body.issues ?? [])].filter(Boolean).join(' — '));
    $('saved-code').textContent = body.code;
    $('saved-hint').innerHTML = source
      ? `Run <code>/post code:${body.code}</code> in Discord and choose <strong>Update original</strong>.`
      : `Run <code>/post code:${body.code}</code> in Discord to post it.`;
    $('saved').showModal();
    history.replaceState(null, '', `?code=${body.code}`);
  } catch (error) {
    showBanner(`Save failed: ${String(error.message).replace(/[<>&]/g, '')}`, 'error');
  } finally {
    button.disabled = false;
  }
}

editor.addEventListener('input', update);
editor.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
  update();
});
$('persona-name').addEventListener('input', update);
$('persona-avatar').addEventListener('input', update);
snippetButtons.forEach((b) => b.addEventListener('click', () => applySnippet(b.dataset.snippet)));
$('save').addEventListener('click', saveDraft);
$('load-form').addEventListener('submit', (e) => {
  e.preventDefault();
  loadDraft($('load-code').value);
});
$('copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('saved-code').textContent);
  $('copy').textContent = 'Copied';
  setTimeout(() => ($('copy').textContent = 'Copy'), 1500);
});

const params = new URLSearchParams(location.search);
let saved = null;
try {
  saved = localStorage.getItem(STORAGE_KEY);
} catch {
  saved = null;
}
if (params.get('code')) {
  setPayload(DEFAULT_PAYLOAD);
  loadDraft(params.get('code'));
} else if (saved) {
  editor.value = saved;
  update();
} else {
  setPayload(DEFAULT_PAYLOAD);
}
