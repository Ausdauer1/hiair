import type { Post } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ymdhm(iso: string): string {
  const d = new Date(iso);
  return `${ymd(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fileSize(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export type DueTone = 'none' | 'normal' | 'soon' | 'late';

/** 마감일 표시 문구와 강조 단계. 결과물이 이미 올라온 요청사항은 강조하지 않아요. */
export function dueInfo(due: string | undefined, done: boolean): { text: string; tone: DueTone } {
  if (!due) return { text: '-', tone: 'none' };
  const [y, m, d] = due.split('-').map(Number);
  const label = `마감 ${m}/${d}`;
  if (done) return { text: label, tone: 'normal' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `${label} · ${-days}일 지남`, tone: 'late' };
  if (days === 0) return { text: `${label} · 오늘`, tone: 'soon' };
  if (days <= 3) return { text: `${label} · D-${days}`, tone: 'soon' };
  return { text: `${label} · D-${days}`, tone: 'normal' };
}

/** 요청사항: 번호가 큰(최신) 순서 */
export function requestsOf(posts: Post[]): Post[] {
  return posts.filter((p) => p.kind === '요청사항').sort((a, b) => (b.no ?? 0) - (a.no ?? 0) || b.id - a.id);
}

/** 한 요청사항에 달린 결과물: 오래된 것부터 */
export function resultsOf(posts: Post[], requestId: number): Post[] {
  return posts.filter((p) => p.kind === '결과물' && p.link === requestId).sort((a, b) => a.id - b.id);
}

export function reqLabel(p: Post): string {
  return `#${p.no ?? '-'} ${p.title}`;
}

/** 카카오톡 등 인앱 브라우저는 blob 다운로드를 지원하지 않는다 */
export function isKakaoInApp(): boolean {
  return /KAKAOTALK/i.test(navigator.userAgent);
}

/** 카카오톡 인앱 브라우저에서 현재 페이지를 기본 브라우저로 여는 주소 */
export function kakaoExternalUrl(): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}
