interface HitTestablePlace {
  id: string;
  x: number;
  y: number;
}

export const hitTestPlace = (
  places: ReadonlyArray<HitTestablePlace>,
  worldX: number,
  worldY: number,
  radius: number,
): string | null => {
  const radiusSquared = radius * radius;
  let closestId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const place of places) {
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
