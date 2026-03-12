const MAX_LENGTH = 1000;

/**
 * Builds the display name for a line-segment-end: "<segment name> ends at <place name>".
 * Uses fallbacks when names are empty. Truncates to MAX_LENGTH for DB compatibility.
 */
export function lineSegmentEndDisplayName(
  segmentName: string,
  placeName: string,
): string {
  const seg = (segmentName ?? '').trim() || 'Line segment';
  const place = (placeName ?? '').trim() || 'Place';
  const raw = `${seg} ends at ${place}`;
  return raw.length > MAX_LENGTH ? raw.slice(0, MAX_LENGTH) : raw;
}
