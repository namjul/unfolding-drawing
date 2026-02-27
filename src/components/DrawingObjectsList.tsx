import { String1000 } from '@evolu/common';
import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import type { LineSegmentEndId, LineSegmentId, PlaceId } from '../lib/evolu-db';
import {
  allLineSegmentEndsQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
  useEvolu,
} from '../lib/evolu-db';
import { lineSegmentEndDisplayName } from '../lib/lineSegmentEndName';
import { useQuery } from '../lib/useQuery';
import { classes, listIndentClasses } from '../styles/tokens';

function LineSegmentTreeNode(props: {
  segment: {
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    name: string | null;
  };
  places: ReadonlyArray<{ id: PlaceId; name: string | null }>;
  ends: ReadonlyArray<{
    id: LineSegmentEndId;
    placeId: PlaceId;
    name: string | null;
  }>;
  segments: ReadonlyArray<{
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    name: string | null;
  }>;
  depth: number;
}) {
  const evolu = useEvolu();
  const [isEditing, setIsEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const displayName = () => props.segment.name?.trim() || 'Line segment';
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];

  const startEditing = () => {
    setEditValue(displayName());
    setErrorMessage('');
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue().trim();
    if (!trimmed) {
      setErrorMessage('');
      setIsEditing(false);
      return;
    }
    const usedByOther = props.segments.some(
      (s) =>
        s.id !== props.segment.id &&
        s.name != null &&
        s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (usedByOther) {
      const proposed = proposeUniqueSegmentName(
        trimmed,
        props.segments,
        props.segment.id,
      );
      setErrorMessage(`Name already used. Try: ${proposed}`);
      setEditValue(proposed);
      return;
    }
    const nameResult = String1000.from(trimmed);
    if (!nameResult.ok) {
      setErrorMessage('Name too long or invalid');
      return;
    }
    evolu.update('lineSegment', {
      id: props.segment.id,
      name: nameResult.value,
    });
    const endA = props.ends.find((e) => e.id === props.segment.endAId);
    const endB = props.ends.find((e) => e.id === props.segment.endBId);
    const placeNameFor = (end: { placeId: PlaceId } | undefined) =>
      end
        ? props.places.find((p) => p.id === end.placeId)?.name?.trim() ||
          'Place'
        : 'Place';
    const nameA = String1000.from(
      lineSegmentEndDisplayName(trimmed, placeNameFor(endA)),
    );
    const nameB = String1000.from(
      lineSegmentEndDisplayName(trimmed, placeNameFor(endB)),
    );
    if (endA && nameA.ok)
      evolu.update('lineSegmentEnd', { id: endA.id, name: nameA.value });
    if (endB && nameB.ok)
      evolu.update('lineSegmentEnd', { id: endB.id, name: nameB.value });
    setErrorMessage('');
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setErrorMessage('');
    setIsEditing(false);
  };

  return (
    <li class={`${classes.listItem} ${indentClass}`} title={props.segment.id}>
      {!isEditing() ? (
        <button
          type="button"
          class={classes.listItemPlaceButton}
          onClick={startEditing}
        >
          {displayName()}
        </button>
      ) : (
        <div class="flex flex-col gap-0.5">
          <input
            type="text"
            value={editValue()}
            onInput={(e) => setEditValue(e.currentTarget.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') cancelEditing();
            }}
            class={classes.inputRename}
            ref={(el) => isEditing() && el?.focus()}
          />
          {errorMessage() && (
            <span class={classes.inputRenameError}>{errorMessage()}</span>
          )}
        </div>
      )}
    </li>
  );
}

function LineSegmentEndTreeNode(props: {
  endId: LineSegmentEndId;
  ends: ReadonlyArray<{
    id: LineSegmentEndId;
    placeId: PlaceId;
    name: string | null;
  }>;
  segments: ReadonlyArray<{
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    name: string | null;
  }>;
  places: ReadonlyArray<{ id: PlaceId; name: string | null }>;
  depth: number;
}) {
  const end = () => props.ends.find((e) => e.id === props.endId);
  const displayName = () => {
    const e = end();
    if (e?.name?.trim()) return e.name.trim();
    const seg = props.segments.find(
      (s) => s.endAId === props.endId || s.endBId === props.endId,
    );
    const place = e ? props.places.find((p) => p.id === e.placeId) : null;
    return lineSegmentEndDisplayName(
      seg?.name ?? 'Line segment',
      place?.name ?? 'Place',
    );
  };
  const lineSegmentsForThisEnd = () =>
    props.segments.filter(
      (s) => s.endAId === props.endId || s.endBId === props.endId,
    );
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  return (
    <>
      <li class={`${classes.listItem} ${indentClass}`} title={props.endId}>
        {displayName()}
      </li>
      {lineSegmentsForThisEnd().map((seg) => (
        <LineSegmentTreeNode
          segment={seg}
          places={props.places}
          ends={props.ends}
          segments={props.segments}
          depth={props.depth + 1}
        />
      ))}
    </>
  );
}

function proposeUniqueName(
  baseName: string,
  existingNames: ReadonlyArray<{ id: PlaceId; name: string | null }>,
  excludeId: PlaceId,
): string {
  const used = new Set(
    existingNames
      .filter(
        (p): p is typeof p & { name: string } =>
          p.id !== excludeId && p.name != null && p.name.trim() !== '',
      )
      .map((p) => p.name.trim().toLowerCase()),
  );
  const base = baseName.trim();
  if (!base) return 'Place 1';
  if (!used.has(base.toLowerCase())) return base;
  let n = 2;
  while (used.has(`${base} (${n})`.toLowerCase())) n += 1;
  return `${base} (${n})`;
}

function proposeUniqueSegmentName(
  baseName: string,
  segments: ReadonlyArray<{ id: LineSegmentId; name: string | null }>,
  excludeSegmentId: LineSegmentId,
): string {
  const used = new Set(
    segments
      .filter(
        (s): s is typeof s & { name: string } =>
          s.id !== excludeSegmentId && s.name != null && s.name.trim() !== '',
      )
      .map((s) => s.name.trim().toLowerCase()),
  );
  const base = baseName.trim();
  if (!base) return 'Line 1';
  if (!used.has(base.toLowerCase())) return base;
  let n = 2;
  while (used.has(`${base} (${n})`.toLowerCase())) n += 1;
  return `${base} (${n})`;
}

function PlaceTreeNode(props: {
  place: {
    id: PlaceId;
    parentId: PlaceId | null;
    x: number | null;
    y: number | null;
    name: string | null;
  };
  places: ReadonlyArray<{
    id: PlaceId;
    parentId: PlaceId | null;
    x: number | null;
    y: number | null;
    name: string | null;
  }>;
  ends: ReadonlyArray<{
    id: LineSegmentEndId;
    placeId: PlaceId;
    name: string | null;
  }>;
  segments: ReadonlyArray<{
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    name: string | null;
  }>;
  depth: number;
}) {
  const evolu = useEvolu();
  const [isEditing, setIsEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const childPlaces = () =>
    props.places.filter((p) => p.parentId === props.place.id);
  const endsForThisPlace = () =>
    props.ends.filter((e) => e.placeId === props.place.id);
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  const displayName = () => props.place.name?.trim() || 'Place';

  const startEditing = () => {
    setEditValue(displayName());
    setErrorMessage('');
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue().trim();
    if (trimmed) {
      const usedByOther = props.places.some(
        (p) =>
          p.id !== props.place.id &&
          p.name != null &&
          p.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (usedByOther) {
        const proposed = proposeUniqueName(
          trimmed,
          props.places,
          props.place.id,
        );
        setErrorMessage(`Name already used. Try: ${proposed}`);
        setEditValue(proposed);
        return;
      }
      const nameResult = String1000.from(trimmed);
      if (!nameResult.ok) {
        setErrorMessage('Name too long or invalid');
        return;
      }
      evolu.update('place', { id: props.place.id, name: nameResult.value });
      const placeNameForEnds = trimmed;
      const endsAtThisPlace = props.ends.filter(
        (e) => e.placeId === props.place.id,
      );
      for (const end of endsAtThisPlace) {
        const seg = props.segments.find(
          (s) => s.endAId === end.id || s.endBId === end.id,
        );
        const segmentName = seg?.name?.trim() || 'Line segment';
        const endName = String1000.from(
          lineSegmentEndDisplayName(segmentName, placeNameForEnds),
        );
        if (endName.ok)
          evolu.update('lineSegmentEnd', { id: end.id, name: endName.value });
      }
    } else {
      evolu.update('place', { id: props.place.id, name: null });
      const endsAtThisPlace = props.ends.filter(
        (e) => e.placeId === props.place.id,
      );
      for (const end of endsAtThisPlace) {
        const seg = props.segments.find(
          (s) => s.endAId === end.id || s.endBId === end.id,
        );
        const segmentName = seg?.name?.trim() || 'Line segment';
        const endName = String1000.from(
          lineSegmentEndDisplayName(segmentName, 'Place'),
        );
        if (endName.ok)
          evolu.update('lineSegmentEnd', { id: end.id, name: endName.value });
      }
    }
    setErrorMessage('');
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setErrorMessage('');
    setIsEditing(false);
  };

  return (
    <>
      <li
        class={`${classes.listItem} ${indentClass}`}
        title={`${props.place.id} (${props.place.x}, ${props.place.y})${
          props.place.parentId ? ' relative to parent' : ''
        }`}
      >
        {!isEditing() ? (
          <button
            type="button"
            class={classes.listItemPlaceButton}
            onClick={startEditing}
          >
            {displayName()}
          </button>
        ) : (
          <div class="flex flex-col gap-0.5">
            <input
              type="text"
              value={editValue()}
              onInput={(e) => setEditValue(e.currentTarget.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelEditing();
              }}
              class={classes.inputRename}
              ref={(el) => isEditing() && el?.focus()}
            />
            {errorMessage() && (
              <span class={classes.inputRenameError}>{errorMessage()}</span>
            )}
          </div>
        )}
      </li>
      {endsForThisPlace().map((end) => (
        <LineSegmentEndTreeNode
          endId={end.id}
          ends={props.ends}
          segments={props.segments}
          places={props.places}
          depth={props.depth + 1}
        />
      ))}
      {childPlaces().map((c) => (
        <PlaceTreeNode
          place={c}
          places={props.places}
          ends={props.ends}
          segments={props.segments}
          depth={props.depth + 1}
        />
      ))}
    </>
  );
}

const DrawingObjectsList: Component = () => {
  const rows = useQuery(allPlacesQuery);
  const endsRows = useQuery(allLineSegmentEndsQuery);
  const segmentsRows = useQuery(allLineSegmentsQuery);
  const roots = () => rows().filter((p) => p.parentId === null);
  const ends = () =>
    endsRows().filter(
      (e): e is typeof e & { placeId: PlaceId } => e.placeId != null,
    );
  const segments = () =>
    segmentsRows().filter(
      (
        s,
      ): s is typeof s & {
        endAId: LineSegmentEndId;
        endBId: LineSegmentEndId;
      } => s.endAId != null && s.endBId != null,
    );

  return (
    <div class={classes.listRoot}>
      {rows().length === 0 ? (
        <p class={classes.listEmpty}>No places yet.</p>
      ) : (
        <ul class="list-none text-xs space-y-1">
          <li class={classes.listHeaderRow}>Drawing Pane (root)</li>
          {roots().map((place) => (
            <PlaceTreeNode
              place={place}
              places={rows()}
              ends={ends()}
              segments={segments()}
              depth={1}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default DrawingObjectsList;
