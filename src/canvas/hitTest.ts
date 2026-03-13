import type { SyntheticScene } from './spikeScene';

export const hitTestPlace = (
  scene: SyntheticScene,
  worldX: number,
  worldY: number,
  radius: number,
): string | null => {
  const radiusSquared = radius * radius;
  let closestId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const place of scene.places) {
    const dx = place.x - worldX;
    const dy = place.y - worldY;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > radiusSquared || distanceSquared >= closestDistance) {
      continue;
    }

    closestDistance = distanceSquared;
    closestId = place.id;
  }

  return closestId;
};
