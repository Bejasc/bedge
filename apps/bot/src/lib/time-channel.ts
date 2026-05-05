import spacetime from 'spacetime';
import { OverwriteType, PermissionFlagsBits, type CategoryChannel, type OverwriteData } from 'discord.js';

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

// Inherits the category's permission overwrites but ensures @everyone cannot connect.
// Visibility (view channel) follows whatever the category has set.
export function buildChannelPermissions(category: CategoryChannel, everyoneRoleId: string): OverwriteData[] {
  const hasEveryone = category.permissionOverwrites.cache.has(everyoneRoleId);

  const overwrites: OverwriteData[] = [...category.permissionOverwrites.cache.values()].map((ow) => {
    if (ow.id === everyoneRoleId) {
      return {
        id: ow.id,
        type: ow.type,
        // Remove Connect from allow (if granted), then explicitly deny it
        allow: ow.allow.bitfield & ~PermissionFlagsBits.Connect,
        deny: ow.deny.bitfield | PermissionFlagsBits.Connect,
      };
    }
    return { id: ow.id, type: ow.type, allow: ow.allow.bitfield, deny: ow.deny.bitfield };
  });

  if (!hasEveryone) {
    overwrites.push({ id: everyoneRoleId, type: OverwriteType.Role, deny: [PermissionFlagsBits.Connect] });
  }

  return overwrites;
}
