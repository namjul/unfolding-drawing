import type { Evolu } from '@evolu/common';
import { createContext } from 'solid-js';
import type { Schema } from '../evolu-db';

export const EvoluContext = createContext<Evolu<typeof Schema>>();
