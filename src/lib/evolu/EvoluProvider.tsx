import type { Evolu } from '@evolu/common/evolu';
import type { Component, JSX } from 'solid-js';
import { EvoluContext } from './EvoluContext';

export const EvoluProvider: Component<{
  children?: JSX.Element | undefined;
  value: Evolu<any>;
}> = (props): JSX.Element => {
  return (
    <div>
      <EvoluContext.Provider value={props.value}>
        {props.children}
      </EvoluContext.Provider>
    </div>
  );
};
