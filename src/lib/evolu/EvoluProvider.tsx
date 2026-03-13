import type { Evolu } from '@evolu/common';
import type { Component, JSX } from 'solid-js';
import type { Schema } from '../evolu-db';
import { EvoluContext } from './EvoluContext';

export const EvoluProvider: Component<{
  children?: JSX.Element | undefined;
  value: Evolu<typeof Schema>;
}> = (props): JSX.Element => {
  return (
    <EvoluContext.Provider value={props.value}>
      {props.children}
    </EvoluContext.Provider>
  );
};
