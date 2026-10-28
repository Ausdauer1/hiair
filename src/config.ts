import type { Company } from './types';

const env = import.meta.env;

const DEFAULT_COMPANIES: Company[] = [{ name: '하이에어코리아' }, { name: '협력업체 A' }, { name: '협력업체 B' }, { name: '협력업체 C' }];

function parseCompanies(): Company[] {
  try {
    const v = JSON.parse(env.VITE_COMPANIES || '[]');
    if (Array.isArray(v)) {
      const list = v
        .map((c) => (typeof c === 'string' ? c : c && typeof c.name === 'string' ? c.name : ''))
        .map((n: string) => n.trim())
        .filter((n: string) => n !== '')
        .map((name: string) => ({ name }));
      if (list.length > 0) return list;
    }
  } catch {
    // 형식이 잘못되면 기본값을 써요
  }
  return DEFAULT_COMPANIES;
}

/** 업체 목록 (이름만. 비밀번호는 글마다 따로 정해요) */
export const companies: Company[] = parseCompanies();

export const repo: string = env.VITE_GH_REPO || 'Ausdauer1/hiair';
export const branch: string = env.VITE_DATA_BRANCH || 'data';
export const token: string = env.VITE_GH_TOKEN || '';

export const MAX_FILE_MB = 20;
export const MAX_FILES = 5;
export const PAGE_SIZE = 10;

/** 세팅값 불러오기로 채워지는 제목 행 */
export const SETTING_HEADERS = ['납기일', '장비종류', '야드', '호선넘버', '시리즈', '세팅값'];
