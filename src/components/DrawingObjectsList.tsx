import type { Component } from 'solid-js';
import { allPlacesQuery } from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';

const DrawingObjectsList: Component = () => {
  const rows = useQuery(allPlacesQuery);

  return (
    <div class="flex flex-col gap-2">
      <h4 class="font-medium text-slate-600 text-sm">Drawing Objects</h4>
      {rows().length === 0 ? (
        <p class="text-xs text-slate-500">No places yet.</p>
      ) : (
        <ul class="list-none text-xs space-y-1">
          {rows().map((place) => (
            <li
              class="px-2 py-1 bg-slate-100 rounded truncate"
              title={`${place.id} (${place.x}, ${place.y})`}
            >
              Place @ ({place.x}, {place.y})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DrawingObjectsList;
