import type { Component } from 'solid-js';
import { createMemo } from 'solid-js';
import type { LineSegmentId, PlaceId } from '../lib/evolu-db';
import {
  allAxesQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
  allTransformationsQuery,
} from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';
import { classes } from '../styles/tokens';

const TransformationsList: Component = () => {
  const { rows } = useQuery(allTransformationsQuery);
  const { rows: places } = useQuery(allPlacesQuery);
  const { rows: segments } = useQuery(allLineSegmentsQuery);
  const { rows: axes } = useQuery(allAxesQuery);

  const placeNameById = createMemo(() => {
    const map = new Map<PlaceId, string>();
    for (const p of places()) {
      map.set(p.id, p.name?.trim() || 'Place');
    }
    return map;
  });

  const segmentNameById = createMemo(() => {
    const map = new Map<LineSegmentId, string>();
    for (const s of segments()) {
      map.set(s.id, s.name?.trim() || 'Line segment');
    }
    return map;
  });

  const axisPlaceIdById = createMemo(() => {
    const map = new Map<string, PlaceId>();
    for (const a of axes()) {
      if (a.placeId != null) map.set(a.id, a.placeId);
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
            const segmentName =
              t.lineSegmentId != null
                ? (segmentNameById().get(t.lineSegmentId) ?? 'Line segment')
                : 'Line segment';
            const axisOwnerPlaceId =
              t.axisId != null ? axisPlaceIdById().get(t.axisId) : undefined;
            const axisOwnerName =
              axisOwnerPlaceId != null
                ? (placeNameById().get(axisOwnerPlaceId) ?? 'Place')
                : 'Place';
            return (
              <li class={classes.listItem} title={t.id}>
                {t.kind === 'add' &&
                  `Add ${placeName} at (${t.x ?? '?'}, ${t.y ?? '?'})`}
                {t.kind === 'addRelated' &&
                  `Add related place ${placeName} at (${t.x ?? '?'}, ${t.y ?? '?'})`}
                {t.kind === 'move' &&
                  `Move ${placeName} to (${t.x ?? '?'}, ${t.y ?? '?'})`}
                {t.kind === 'delete' && `Delete ${placeName}`}
                {t.kind === 'rotate' &&
                  `Rotate ${placeName} (angle: ${t.angle ?? '?'})`}
                {t.kind === 'addLine' && `Add line ${segmentName}`}
                {t.kind === 'deleteLine' && `Delete line ${segmentName}`}
                {t.kind === 'addCircularField' &&
                  `Add circular field at ${placeName} (radius: ${t.radius ?? '?'})`}
                {t.kind === 'modifyCircularField' &&
                  `Modify circular field at ${placeName} (radius: ${t.radius ?? '?'})`}
                {t.kind === 'deleteCircularField' &&
                  `Delete circular field at ${placeName}`}
                {t.kind === 'addBendingCircularField' &&
                  `Add bending field on ${segmentName}`}
                {t.kind === 'modifyBendingCircularField' &&
                  `Modify bending field on ${segmentName}`}
                {t.kind === 'deleteBendingCircularField' &&
                  `Delete bending field on ${segmentName}`}
                {t.kind === 'splitLine' &&
                  `Split line ${segmentName} into two segments`}
                {t.kind === 'addAxis' && `Add axis at ${placeName}`}
                {t.kind === 'modifyAxis' &&
                  `Modify axis at ${placeName} (angle: ${t.angle ?? '?'})`}
                {t.kind === 'deleteAxis' && `Delete axis at ${placeName}`}
                {t.kind === 'addPlaceOnAxis' &&
                  `Add ${placeName} on axis at ${axisOwnerName}`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TransformationsList;
