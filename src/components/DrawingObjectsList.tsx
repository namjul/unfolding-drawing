import type { Component } from 'solid-js';
import type { LineSegmentEndId, LineSegmentId, PlaceId } from '../lib/evolu-db';
import {
  allLineSegmentEndsQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
} from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';

const INDENT_CLASSES = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16'] as const;

function LineSegmentTreeNode(props: {
  lineSegmentId: LineSegmentId;
  depth: number;
}) {
  const indentClass =
    INDENT_CLASSES[Math.min(props.depth, INDENT_CLASSES.length - 1)];
  return (
    <li
      class={`px-2 py-1 bg-slate-100 rounded truncate ${indentClass}`}
      title={props.lineSegmentId}
    >
      Line segment
    </li>
  );
}

function LineSegmentEndTreeNode(props: {
  endId: LineSegmentEndId;
  ends: ReadonlyArray<{ id: LineSegmentEndId; placeId: PlaceId }>;
  segments: ReadonlyArray<{
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
  }>;
  depth: number;
}) {
  const lineSegmentsForThisEnd = () =>
    props.segments.filter(
      (s) => s.endAId === props.endId || s.endBId === props.endId,
    );
  const indentClass =
    INDENT_CLASSES[Math.min(props.depth, INDENT_CLASSES.length - 1)];
  return (
    <>
      <li
        class={`px-2 py-1 bg-slate-100 rounded truncate ${indentClass}`}
        title={props.endId}
      >
        Line segment end
      </li>
      {lineSegmentsForThisEnd().map((seg) => (
        <LineSegmentTreeNode lineSegmentId={seg.id} depth={props.depth + 1} />
      ))}
    </>
  );
}

function PlaceTreeNode(props: {
  place: {
    id: PlaceId;
    parentId: PlaceId | null;
    x: number | null;
    y: number | null;
  };
  places: ReadonlyArray<{
    id: PlaceId;
    parentId: PlaceId | null;
    x: number | null;
    y: number | null;
  }>;
  ends: ReadonlyArray<{ id: LineSegmentEndId; placeId: PlaceId }>;
  segments: ReadonlyArray<{
    id: LineSegmentId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
  }>;
  depth: number;
}) {
  const childPlaces = () =>
    props.places.filter((p) => p.parentId === props.place.id);
  const endsForThisPlace = () =>
    props.ends.filter((e) => e.placeId === props.place.id);
  const indentClass =
    INDENT_CLASSES[Math.min(props.depth, INDENT_CLASSES.length - 1)];
  return (
    <>
      <li
        class={`px-2 py-1 bg-slate-100 rounded truncate ${indentClass}`}
        title={`${props.place.id} (${props.place.x}, ${props.place.y})${
          props.place.parentId ? ' relative to parent' : ''
        }`}
      >
        Place @ ({props.place.parentId ? 'rel ' : ''}
        {props.place.x ?? 0}, {props.place.y ?? 0})
      </li>
      {endsForThisPlace().map((end) => (
        <LineSegmentEndTreeNode
          endId={end.id}
          ends={props.ends}
          segments={props.segments}
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
    <div class="flex flex-col gap-2">
      <h4 class="font-medium text-slate-600 text-sm">Drawing Objects</h4>
      {rows().length === 0 ? (
        <p class="text-xs text-slate-500">No places yet.</p>
      ) : (
        <ul class="list-none text-xs space-y-1">
          <li class="px-2 py-1 bg-slate-200 rounded font-medium">
            Drawing Pane (root)
          </li>
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
