export interface ScenePlace {
  id: string;
  label: string;
  x: number;
  y: number;
  ring: number;
}

export interface SceneConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SyntheticScene {
  places: ScenePlace[];
  connections: SceneConnection[];
  placeIndex: Map<string, ScenePlace>;
  labels: string[];
  bounds: SceneBounds;
}

const PLACE_COUNT = 2000;
const RING_SPACING = 88;
const LABEL_STRIDE = 125;
const CONNECTION_STEPS = [1, 2, 5, 13, 21, 34, 55, 89, 144, 233];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const createPlace = (index: number): ScenePlace => {
  const ring = Math.floor(Math.sqrt(index));
  const ringStart = ring * ring;
  const ringLength = Math.max(1, (ring + 1) * (ring + 1) - ringStart);
  const ringIndex = index - ringStart;
  const angle = (ringIndex / ringLength) * Math.PI * 2 + ring * 0.22;
  const radialNoise = ((index % 7) - 3) * 6;
  const radius = 90 + ring * RING_SPACING + radialNoise;

  return {
    id: `place-${index}`,
    label: `P${index}`,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    ring,
  };
};

const computeBounds = (places: ScenePlace[]): SceneBounds => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const place of places) {
    minX = Math.min(minX, place.x);
    minY = Math.min(minY, place.y);
    maxX = Math.max(maxX, place.x);
    maxY = Math.max(maxY, place.y);
  }

  return { minX, minY, maxX, maxY };
};

export const createSyntheticScene = (): SyntheticScene => {
  const places = Array.from({ length: PLACE_COUNT }, (_, index) =>
    createPlace(index),
  );
  const connections: SceneConnection[] = [];

  for (let fromIndex = 0; fromIndex < places.length; fromIndex += 1) {
    for (const step of CONNECTION_STEPS) {
      const toIndex = (fromIndex + step) % places.length;

      connections.push({
        id: `connection-${fromIndex}-${toIndex}`,
        fromId: places[fromIndex]?.id ?? `place-${fromIndex}`,
        toId: places[toIndex]?.id ?? `place-${toIndex}`,
      });
    }
  }

  const labels = places
    .filter((_, index) => index % LABEL_STRIDE === 0)
    .map((place) => place.id);

  return {
    places,
    connections,
    placeIndex: new Map(places.map((place) => [place.id, place])),
    labels,
    bounds: computeBounds(places),
  };
};

export const getVisibleLabelIds = (
  scene: SyntheticScene,
  viewportScale: number,
): string[] => {
  const density = clamp(Math.round(viewportScale * 6), 2, scene.labels.length);

  return scene.labels.filter((_, index) => index % density === 0);
};
