const purging = new Set<string>();

/** Marks a channel as mid-purge so the bulk-delete listener leaves logging to `/purge`. */
export function suppressBulkDeleteLog(channelId: string, ms = 5000): void {
  purging.add(channelId);
  setTimeout(() => purging.delete(channelId), ms);
}

export function isBulkDeleteSuppressed(channelId: string): boolean {
  return purging.has(channelId);
}
