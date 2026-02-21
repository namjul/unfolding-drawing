import type { Component } from 'solid-js';
import { allTransformationsQuery } from '../lib/evolu-db';
import { useQuery } from '../lib/useQuery';

const TransformationsList: Component = () => {
  const rows = useQuery(allTransformationsQuery);

  return (
    <div class="flex flex-col gap-2">
      <h4 class="font-medium text-slate-600 text-sm">Transformations</h4>
      {rows().length === 0 ? (
        <p class="text-xs text-slate-500">No transformations yet.</p>
      ) : (
        <ul class="list-none text-xs space-y-1">
          {rows().map((t) => (
            <li class="px-2 py-1 bg-slate-100 rounded truncate" title={t.id}>
              {t.kind === 'add' &&
                `Add Place at (${t.x ?? '?'}, ${t.y ?? '?'})`}
              {t.kind === 'move' &&
                `Move Place to (${t.x ?? '?'}, ${t.y ?? '?'})`}
              {t.kind === 'delete' && 'Delete Place'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransformationsList;
