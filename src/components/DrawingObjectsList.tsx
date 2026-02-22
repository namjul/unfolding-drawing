import type { Component } from 'solid-js';
import type { PlaceId } from '../lib/evolu-db';
import { allPlacesQuery } from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';

const INDENT_CLASSES = ['pl-0', 'pl-4', 'pl-8', 'pl-12'] as const;

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
  depth: number;
}) {
  const children = () =>
    props.places.filter((p) => p.parentId === props.place.id);
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
      {children().map((c) => (
        <PlaceTreeNode
          place={c}
          places={props.places}
          depth={props.depth + 1}
        />
      ))}
    </>
  );
}

const DrawingObjectsList: Component = () => {
  const rows = useQuery(allPlacesQuery);
  const roots = () => rows().filter((p) => p.parentId === null);

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
            <PlaceTreeNode place={place} places={rows()} depth={1} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default DrawingObjectsList;
