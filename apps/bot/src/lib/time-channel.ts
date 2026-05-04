import spacetime from 'spacetime';

export function roundTo15(totalMinutes: number): number {
  return (Math.round(totalMinutes / 15) * 15) % (24 * 60);
}

export function formatHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function currentTimeIn(ianaZone: string): string {
  const s = spacetime.now(ianaZone);
  const total = roundTo15(s.hour() * 60 + s.minute());
  return formatHHmm(total);
}

export function buildChannelName(alias: string, timeStr: string, dot?: string): string {
  const dotPart = dot ? ` ${dot}` : '';
  return `${alias} approx time: ${timeStr}${dotPart}`;
}
