import type { Query, QueryRows, Row } from '@evolu/common';
import { createEffect, createSignal } from 'solid-js';
import { useEvolu } from './evolu-db';

/**
 * Solid hook to subscribe to an Evolu query.
 * Returns { rows, refresh }. refresh() re-loads the query and updates the signal.
 */
export function useQuery<R extends Row>(query: Query<R>) {
  const evolu = useEvolu();
  const [rows, setRows] = createSignal<QueryRows<R>>([] as QueryRows<R>);

  const refresh = (): Promise<void> =>
    evolu
      .loadQuery(query)
      .then((loaded) => {
        setRows(loaded);
      })
      .catch(() => {});

  createEffect(() => {
    let unsub: (() => void) | undefined;
    evolu
      .loadQuery(query)
      .then((loaded) => {
        setRows(loaded);
        unsub = evolu.subscribeQuery(query)(() => {
          setRows(evolu.getQueryRows(query) as QueryRows<R>);
        });
      })
      .catch(() => {});
    return () => {
      unsub?.();
    };
  });

  return { rows, refresh };
}
