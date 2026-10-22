export const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

export function discordTime(at: Date | number, style: 'f' | 'R' | 'D' | 't' = 'f'): string {
  return `<t:${Math.floor(Number(at) / 1000)}:${style}>`;
}

const UNITS: [string, number][] = [
  ['y', 365 * 24 * 3600_000],
  ['d', 24 * 3600_000],
  ['h', 3600_000],
  ['m', 60_000],
  ['s', 1000],
];

/** The largest unit plus the one below it, e.g. `2y 14d` or `5m 3s`; a zero second unit is dropped. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms);
  const index = UNITS.findIndex(([, size]) => total >= size);
  if (index === -1) return '0s';
  const [label, size] = UNITS[index];
  const major = Math.floor(total / size);
  const next = UNITS[index + 1];
  const minor = next ? Math.floor((total - major * size) / next[1]) : 0;
  return minor > 0 ? `${major}${label} ${minor}${next[0]}` : `${major}${label}`;
}

export function quote(text: string, max: number): string {
  const clipped = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return clipped
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}
