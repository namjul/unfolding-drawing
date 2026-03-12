import { String1000 } from '@evolu/common';
import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import type {
  AxisId,
  BendingCircularFieldId,
  CircularFieldId,
  CircularRepeaterId,
  LineSegmentEndId,
  LineSegmentId,
  PlaceId,
} from '../lib/evolu-db';
import {
  allAxesQuery,
  allBendingCircularFieldsQuery,
  allCircularFieldsQuery,
  allCircularRepeatersQuery,
  allLineSegmentEndsQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
  useEvolu,
} from '../lib/evolu-db';
import { lineSegmentEndDisplayName } from '../lib/lineSegmentEndName';
import { useQuery } from '../lib/useQuery';
import { classes, listIndentClasses } from '../styles/tokens';

type PlaceWithAxis = {
  id: PlaceId;
  parentId: PlaceId | null;
  parentAxisId?: AxisId | null;
  parentCircularFieldId?: CircularFieldId | null;
  angleOnCircle?: number | null;
  name: string | null;
  x: number;
  y: number;
  angle: number | null;
  isScaffolding: number | null;
};

function AxisTreeNode(props: {
  axis: {
    id: AxisId;
    placeId: PlaceId;
    angle: number;
    isBidirectional?: number | null;
  };
  axisLabel?: string;
  placesOnAxis: ReadonlyArray<PlaceWithAxis>;
  places: ReadonlyArray<PlaceWithAxis>;
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
    isScaffolding: number | null;
  }>;
  circularFields: ReadonlyArray<{
    id: CircularFieldId;
    placeId: PlaceId;
    radius: number;
  }>;
  bendingCircularFields: ReadonlyArray<{
    id: BendingCircularFieldId;
    lineSegmentEndId: LineSegmentEndId;
    radius: number;
  }>;
  depth: number;
  onSelectAxis?: ((id: AxisId) => void) | undefined;
  selectedAxisId?: AxisId | null | undefined;
}) {
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  const isSelected = () => props.selectedAxisId === props.axis.id;
  const label = () =>
    props.axisLabel ??
    `Axis ${props.axis.isBidirectional === 0 ? '→' : '↔'}`;
  return (
    <>
      <li
        class={`${classes.listRowWithIndicator} ${classes.listItem} ${isSelected() ? 'ring-1 ring-green-400 rounded' : ''}`}
        title={props.axis.id}
      >
        <span class={classes.listScaffoldingIndicator}>#</span>
        <span class={`${indentClass} flex-1 min-w-0`}>
          <button
            type="button"
            class={classes.listItemPlaceButton}
            onClick={() => props.onSelectAxis?.(props.axis.id)}
          >
            {label()}
          </button>
        </span>
      </li>
      {props.placesOnAxis.map((place) => (
        <PlaceTreeNode
          place={place}
          places={props.places}
          ends={props.ends}
          segments={props.segments}
          circularFields={props.circularFields}
          bendingCircularFields={props.bendingCircularFields}
          axes={
            [] as ReadonlyArray<{
              id: AxisId;
              placeId: PlaceId;
              angle: number;
              isBidirectional?: number | null;
            }>
          }
          circularRepeaters={[]}
          depth={props.depth + 1}
          onSelectAxis={props.onSelectAxis}
          selectedAxisId={props.selectedAxisId}
        />
      ))}
    </>
  );
}

function CircularFieldTreeNode(props: {
  field: {
    id: CircularFieldId;
    placeId: PlaceId;
    radius: number;
  };
  placesOnCircularField: ReadonlyArray<PlaceWithAxis>;
  places: ReadonlyArray<PlaceWithAxis>;
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
    isScaffolding: number | null;
  }>;
  circularFields: ReadonlyArray<{
    id: CircularFieldId;
    placeId: PlaceId;
    radius: number;
  }>;
  bendingCircularFields: ReadonlyArray<{
    id: BendingCircularFieldId;
    lineSegmentEndId: LineSegmentEndId;
    radius: number;
  }>;
  axes: ReadonlyArray<{
    id: AxisId;
    placeId: PlaceId;
    angle: number;
    isBidirectional?: number | null;
  }>;
  circularRepeaters?: ReadonlyArray<{
    id: CircularRepeaterId;
    placeId: PlaceId;
    count: number;
    name: string | null;
  }>;
  depth: number;
  onSelectAxis?: ((id: AxisId) => void) | undefined;
  selectedAxisId?: AxisId | null | undefined;
  onSelectRepeater?: ((id: CircularRepeaterId) => void) | undefined;
  selectedCircularRepeaterId?: CircularRepeaterId | null | undefined;
}) {
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  const displayLabel = () =>
    `Circular field (r: ${Number(props.field.radius)})`;
  return (
    <>
      <li
        class={`${classes.listRowWithIndicator} ${classes.listItem}`}
        title={props.field.id}
      >
        <span class={classes.listScaffoldingIndicator}>#</span>
        <span class={`${indentClass} flex-1 min-w-0`}>{displayLabel()}</span>
      </li>
      {props.placesOnCircularField.map((place) => (
        <PlaceTreeNode
          place={place}
          places={props.places}
          ends={props.ends}
          segments={props.segments}
          circularFields={props.circularFields}
          bendingCircularFields={props.bendingCircularFields}
          axes={props.axes}
          circularRepeaters={props.circularRepeaters ?? []}
          depth={props.depth + 1}
          onSelectAxis={props.onSelectAxis}
          selectedAxisId={props.selectedAxisId}
          onSelectRepeater={props.onSelectRepeater}
          selectedCircularRepeaterId={props.selectedCircularRepeaterId}
        />
      ))}
    </>
  );
}

function LineSegmentTreeNode(props: {
  segment: {
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    name: string | null;
    isScaffolding: number | null;
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
    isScaffolding: number | null;
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
  const showScaffolding = () => props.segment.isScaffolding === 1;

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
    <li
      class={`${classes.listRowWithIndicator} ${classes.listItem}`}
      title={props.segment.id}
    >
      <span class={classes.listScaffoldingIndicator}>
        {showScaffolding() ? '#' : '\u00A0'}
      </span>
      <span class={`${indentClass} flex-1 min-w-0`}>
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
      </span>
    </li>
  );
}

function BendingCircularFieldTreeNode(props: {
  field: { id: BendingCircularFieldId; radius: number };
  depth: number;
}) {
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  return (
    <li
      class={`${classes.listRowWithIndicator} ${classes.listItem}`}
      title={props.field.id}
    >
      <span class={classes.listScaffoldingIndicator}>#</span>
      <span class={`${indentClass} flex-1 min-w-0`}>
        Bending circle (r: {Number(props.field.radius)})
      </span>
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
    isScaffolding: number | null;
  }>;
  places: ReadonlyArray<{ id: PlaceId; name: string | null }>;
  bendingCircularFields: ReadonlyArray<{
    id: BendingCircularFieldId;
    lineSegmentEndId: LineSegmentEndId;
    radius: number;
  }>;
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
  const bendingFieldsForThisEnd = () =>
    props.bendingCircularFields.filter(
      (b) => b.lineSegmentEndId === props.endId,
    );
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  return (
    <>
      <li
        class={`${classes.listRowWithIndicator} ${classes.listItem}`}
        title={props.endId}
      >
        <span class={classes.listScaffoldingIndicator}>#</span>
        <span class={`${indentClass} flex-1 min-w-0`}>{displayName()}</span>
      </li>
      {bendingFieldsForThisEnd().map((field) => (
        <BendingCircularFieldTreeNode
          field={{ id: field.id, radius: field.radius }}
          depth={props.depth + 1}
        />
      ))}
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
    isScaffolding: number | null;
  };
  places: ReadonlyArray<{
    id: PlaceId;
    parentId: PlaceId | null;
    x: number | null;
    y: number | null;
    name: string | null;
    isScaffolding: number | null;
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
    isScaffolding: number | null;
  }>;
  circularFields: ReadonlyArray<{
    id: CircularFieldId;
    placeId: PlaceId;
    radius: number;
  }>;
  bendingCircularFields: ReadonlyArray<{
    id: BendingCircularFieldId;
    lineSegmentEndId: LineSegmentEndId;
    radius: number;
  }>;
  axes?: ReadonlyArray<{
    id: AxisId;
    placeId: PlaceId;
    angle: number;
    isBidirectional?: number | null;
    circularRepeaterId?: unknown;
  }>;
  circularRepeaters?: ReadonlyArray<{
    id: CircularRepeaterId;
    placeId: PlaceId;
    count: number;
    name: string | null;
  }>;
  onSelectAxis?: ((id: AxisId) => void) | undefined;
  selectedAxisId?: AxisId | null | undefined;
  onSelectRepeater?: ((id: CircularRepeaterId) => void) | undefined;
  selectedCircularRepeaterId?: CircularRepeaterId | null | undefined;
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
  const circularFieldsForThisPlace = () =>
    props.circularFields.filter((f) => f.placeId === props.place.id);
  const axesForThisPlace = () =>
    (props.axes ?? []).filter(
      (a) =>
        a.placeId === props.place.id &&
        (a as { circularRepeaterId?: unknown }).circularRepeaterId == null,
    );
  const circularRepeatersForThisPlace = () =>
    (props.circularRepeaters ?? []).filter((r) => r.placeId === props.place.id);
  const axesForRepeater = (repeaterId: CircularRepeaterId) =>
    [...(props.axes ?? [])]
      .filter(
        (a) =>
          a.placeId === props.place.id &&
          (a as { circularRepeaterId?: CircularRepeaterId }).circularRepeaterId ===
            repeaterId,
      )
      .sort((a, b) => Number(a.angle) - Number(b.angle));
  const placesOnAxis = (axisId: AxisId) =>
    props.places.filter(
      (p) => (p as PlaceWithAxis).parentAxisId === axisId,
    ) as PlaceWithAxis[];
  const placesOnCircularField = (cfId: CircularFieldId) =>
    props.places.filter(
      (p) => (p as PlaceWithAxis).parentCircularFieldId === cfId,
    ) as PlaceWithAxis[];
  const indentClass =
    listIndentClasses[Math.min(props.depth, listIndentClasses.length - 1)];
  const displayName = () => props.place.name?.trim() || 'Place';
  const showScaffolding = () => props.place.isScaffolding !== 0;

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

  const hasChildren =
    circularFieldsForThisPlace().length > 0 ||
    circularRepeatersForThisPlace().length > 0 ||
    axesForThisPlace().length > 0 ||
    endsForThisPlace().length > 0 ||
    childPlaces().length > 0;

  return (
    <li
      title={`${props.place.id} (${props.place.x}, ${props.place.y})${
        props.place.parentId ? ' relative to parent' : ''
      }`}
    >
      <div
        class={`${classes.listRowWithIndicator} ${classes.listItem}`}
        role="treeitem"
        aria-expanded={hasChildren ? true : undefined}
      >
        <span class={classes.listScaffoldingIndicator}>
          {showScaffolding() ? '#' : '\u00A0'}
        </span>
        <span class={`${indentClass} flex-1 min-w-0`}>
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
        </span>
      </div>
      {hasChildren && (
        <ul class="list-none text-xs space-y-1 border-l border-slate-200 ml-2 pl-2">
          {circularFieldsForThisPlace().map((field) => (
            <CircularFieldTreeNode
              field={field}
              placesOnCircularField={placesOnCircularField(field.id)}
              places={props.places as PlaceWithAxis[]}
              ends={props.ends}
              segments={props.segments}
              circularFields={props.circularFields}
              bendingCircularFields={props.bendingCircularFields}
              axes={props.axes ?? []}
              circularRepeaters={props.circularRepeaters ?? []}
              depth={props.depth + 1}
              onSelectAxis={props.onSelectAxis}
              selectedAxisId={props.selectedAxisId}
              onSelectRepeater={props.onSelectRepeater}
              selectedCircularRepeaterId={props.selectedCircularRepeaterId}
            />
          ))}
          {circularRepeatersForThisPlace().map((repeater) => (
            <>
              <li
                class={`${classes.listRowWithIndicator} ${classes.listItem} ${props.selectedCircularRepeaterId === repeater.id ? 'ring-1 ring-green-400 rounded' : ''}`}
                title={repeater.id}
              >
                <span class={classes.listScaffoldingIndicator}>#</span>
                <span class={`${indentClass} flex-1 min-w-0`}>
                  <button
                    type="button"
                    class={classes.listItemPlaceButton}
                    onClick={() => props.onSelectRepeater?.(repeater.id)}
                  >
                    {repeater.name?.trim() ||
                      `Repeater (${Number(repeater.count)} axes)`}
                  </button>
                </span>
              </li>
              {axesForRepeater(repeater.id).map((axis, i) => (
                <AxisTreeNode
                  axis={{
                    id: axis.id,
                    placeId: axis.placeId,
                    angle: Number(axis.angle),
                    isBidirectional: axis.isBidirectional ?? null,
                  }}
                  axisLabel={`Axis ${i + 1}`}
                  placesOnAxis={placesOnAxis(axis.id)}
                  places={props.places as PlaceWithAxis[]}
                  ends={props.ends}
                  segments={props.segments}
                  circularFields={props.circularFields}
                  bendingCircularFields={props.bendingCircularFields}
                  depth={props.depth + 1}
                  onSelectAxis={props.onSelectAxis}
                  selectedAxisId={props.selectedAxisId}
                />
              ))}
            </>
          ))}
          {axesForThisPlace().map((axis) => (
            <AxisTreeNode
              axis={{
                id: axis.id,
                placeId: axis.placeId,
                angle: Number(axis.angle),
                isBidirectional: axis.isBidirectional ?? null,
              }}
              placesOnAxis={placesOnAxis(axis.id)}
              places={props.places as PlaceWithAxis[]}
              ends={props.ends}
              segments={props.segments}
              circularFields={props.circularFields}
              bendingCircularFields={props.bendingCircularFields}
              depth={props.depth + 1}
              onSelectAxis={props.onSelectAxis}
              selectedAxisId={props.selectedAxisId}
            />
          ))}
          {endsForThisPlace().map((end) => (
            <LineSegmentEndTreeNode
              endId={end.id}
              ends={props.ends}
              segments={props.segments}
              places={props.places}
              bendingCircularFields={props.bendingCircularFields}
              depth={props.depth + 1}
            />
          ))}
          {childPlaces().map((c) => (
            <PlaceTreeNode
              place={c}
              places={props.places}
              ends={props.ends}
              segments={props.segments}
              circularFields={props.circularFields}
              bendingCircularFields={props.bendingCircularFields}
              axes={props.axes ?? []}
              circularRepeaters={props.circularRepeaters ?? []}
              onSelectAxis={props.onSelectAxis}
              selectedAxisId={props.selectedAxisId}
              onSelectRepeater={props.onSelectRepeater}
              selectedCircularRepeaterId={props.selectedCircularRepeaterId}
              depth={props.depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const DrawingObjectsList: Component<{
  selectedAxisId?: AxisId | null | undefined;
  onSelectAxis?: ((id: AxisId) => void) | undefined;
  selectedCircularRepeaterId?: CircularRepeaterId | null | undefined;
  onSelectRepeater?: ((id: CircularRepeaterId) => void) | undefined;
}> = (props) => {
  const { rows } = useQuery(allPlacesQuery);
  const { rows: endsRows } = useQuery(allLineSegmentEndsQuery);
  const { rows: segmentsRows } = useQuery(allLineSegmentsQuery);
  const { rows: circularFieldsRows } = useQuery(allCircularFieldsQuery);
  const { rows: bendingCircularFieldsRows } = useQuery(
    allBendingCircularFieldsQuery,
  );
  const { rows: axesRows } = useQuery(allAxesQuery);
  const { rows: circularRepeatersRows } = useQuery(allCircularRepeatersQuery);
  const roots = () =>
    rows().filter(
      (p) =>
        p.parentId === null &&
        (p as PlaceWithAxis).parentAxisId == null &&
        (p as PlaceWithAxis).parentCircularFieldId == null,
    );
  const axes = () =>
    axesRows().filter(
      (a): a is typeof a & { placeId: PlaceId } => a.placeId != null,
    );
  const circularFields = () =>
    circularFieldsRows()
      .filter((f): f is typeof f & { placeId: PlaceId } => f.placeId != null)
      .map((f) => ({
        id: f.id,
        placeId: f.placeId,
        radius: Number(f.radius),
      }));
  const circularRepeaters = () =>
    circularRepeatersRows()
      .filter((r): r is typeof r & { placeId: PlaceId } => r.placeId != null)
      .map((r) => ({
        id: r.id,
        placeId: r.placeId,
        count: Number(r.count),
        name: r.name ?? null,
      }));
  const bendingCircularFields = () =>
    bendingCircularFieldsRows()
      .filter(
        (f): f is typeof f & { lineSegmentEndId: LineSegmentEndId } =>
          f.lineSegmentEndId != null,
      )
      .map((f) => ({
        id: f.id,
        lineSegmentEndId: f.lineSegmentEndId,
        radius: Number(f.radius),
      }));
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
          <li
            class={`${classes.listRowWithIndicator} ${classes.listHeaderRow}`}
          >
            <span class={classes.listScaffoldingIndicator}>{'\u00A0'}</span>
            <span class={`${classes.listIndent0} flex-1 min-w-0`}>
              Drawing Pane (root)
            </span>
          </li>
          {roots().map((place) => (
            <PlaceTreeNode
              place={place}
              places={rows()}
              ends={ends()}
              segments={segments()}
              circularFields={circularFields()}
              bendingCircularFields={bendingCircularFields()}
              axes={axes().map((a) => ({
                id: a.id,
                placeId: a.placeId,
                angle: Number(a.angle),
                isBidirectional: a.isBidirectional,
                circularRepeaterId: (a as { circularRepeaterId?: CircularRepeaterId })
                  .circularRepeaterId,
              }))}
              circularRepeaters={circularRepeaters()}
              onSelectAxis={props.onSelectAxis ?? undefined}
              selectedAxisId={props.selectedAxisId ?? undefined}
              onSelectRepeater={props.onSelectRepeater ?? undefined}
              selectedCircularRepeaterId={
                props.selectedCircularRepeaterId ?? undefined
              }
              depth={1}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default DrawingObjectsList;
