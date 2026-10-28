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

/** 이름이 같은지 (앞뒤 공백, 대소문자, 중간 공백 개수는 무시) */
export const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

export const useSettings = () => useContext(SettingsContext);
