import { createContext, useContext } from 'react';
import type { SettingTable, TableData } from './types';

export interface SettingsApi {
  settings: SettingTable[];
  canWrite: boolean;
  save: (name: string, table: TableData) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
}

export const SettingsContext = createContext<SettingsApi>({
  settings: [],
  canWrite: false,
  save: async () => false,
  remove: async () => false,
});

export const useSettings = () => useContext(SettingsContext);
