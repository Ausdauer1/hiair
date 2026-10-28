import type { Company } from './types';

const env = import.meta.env;

const DEFAULT_COMPANIES: Company[] = [
  { name: '하이에어코리아', password: '0000' },
  { name: '협력업체 A', password: '1111' },
  { name: '협력업체 B', password: '2222' },
  { name: '협력업체 C', password: '3333' },
];

function parseCompanies(): Company[] {
  try {
    const v = JSON.parse(env.VITE_COMPANIES || '[]');
    if (Array.isArray(v)) {
      const list = v
        .filter((c) => c && typeof c.name === 'string' && typeof c.password === 'string' && c.name.trim() !== '')
        .map((c) => ({ name: c.name.trim(), password: c.password }));
      if (list.length > 0) return list;
    }
  } catch {
    // 형식이 잘못되면 기본값을 써요
  }
  return DEFAULT_COMPANIES;
}

/** 업체 목록과 비밀번호 (프로토타입이라 빌드된 코드에 포함돼요) */
export const companies: Company[] = parseCompanies();

export const repo: string = env.VITE_GH_REPO || 'Ausdauer1/hiair';
export const branch: string = env.VITE_DATA_BRANCH || 'data';
export const token: string = env.VITE_GH_TOKEN || '';

export const MAX_FILE_MB = 20;
export const MAX_FILES = 5;
export const PAGE_SIZE = 10;

export function checkPassword(company: string, password: string): boolean {
  const c = companies.find((x) => x.name === company);
  return !!c && password !== '' && c.password === password;
}
