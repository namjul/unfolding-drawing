import type { Component } from 'solid-js';
import { createMemo } from 'solid-js';
import type { PlaceId } from '../lib/evolu-db';
import { allPlacesQuery, allTransformationsQuery } from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';
import { classes } from '../styles/tokens';

const TransformationsList: Component = () => {
  const rows = useQuery(allTransformationsQuery);
  const places = useQuery(allPlacesQuery);

  const placeNameById = createMemo(() => {
    const map = new Map<PlaceId, string>();
    for (const p of places()) {
      map.set(p.id, p.name?.trim() || 'Place');
    }
    return map;
  });

  return (
    <div class={classes.listRoot}>
      {rows().length === 0 ? (
        <p class={classes.listEmpty}>No transformations yet.</p>
      ) : (
        <ul class="list-none text-xs space-y-1">
          {rows().map((t) => {
            const placeName =
              t.placeId != null
                ? (placeNameById().get(t.placeId) ?? 'Place')
                : 'Place';
            return (
              <li class={classes.listItem} title={t.id}>
                {t.kind === 'add' &&
                  `Add ${placeName} at (${t.x ?? '?'}, ${t.y ?? '?'})`}
                {t.kind === 'move' &&
                  `Move ${placeName} to (${t.x ?? '?'}, ${t.y ?? '?'})`}
                {t.kind === 'delete' && `Delete ${placeName}`}
                {t.kind === 'rotate' &&
                  `Rotate ${placeName} (angle: ${t.angle ?? '?'})`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TransformationsList;
