import { repo, branch, token } from '../config';
import type { FileMeta, Post } from '../types';

/**
 * data 브랜치를 저장소로 쓰는 계층이에요.
 *  - data/posts.json        : 모든 글(요청사항, 결과물, 댓글)
 *  - data/files/<글id>/...  : 첨부 파일
 * 브라우저가 GitHub Contents API 로 바로 읽고 써요.
 */

const API = `https://api.github.com/repos/${repo}`;
const POSTS_PATH = 'data/posts.json';

/** 화면에 그대로 보여줘도 되는 오류 */
export class UserError extends Error {}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errMsg(e: unknown): string {
  if (e instanceof UserError) return e.message;
  if (e instanceof ApiError) {
    if (e.status === 401) return '토큰이 올바르지 않거나 만료됐어요';
    if (e.status === 403) return '요청이 너무 많거나 권한이 없어요. 잠시 후 다시 시도해 주세요';
    if (e.status === 404) return 'data 브랜치를 찾을 수 없어요. 레포지토리에 data 브랜치가 있는지 확인해 주세요';
    return `저장소 오류(${e.status}): ${e.message}`;
  }
  return e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function toError(res: Response): Promise<ApiError> {
  let msg = res.statusText;
  try {
    const j = await res.json();
    if (j && j.message) msg = j.message;
  } catch {
    // 본문이 없으면 상태 문구를 써요
  }
  return new ApiError(res.status, msg);
}

async function readPosts(): Promise<{ posts: Post[]; sha?: string }> {
  const url = `${API}/contents/${enc(POSTS_PATH)}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`;
  const res = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (res.status === 404) return { posts: [] };
  if (!res.ok) throw await toError(res);
  const j = await res.json();
  let text = '[]';
  if (j.content) {
    text = new TextDecoder().decode(fromBase64(j.content));
  } else if (j.sha) {
    // 1MB 를 넘는 파일은 blob API 로 읽어요
    const b = await fetch(`${API}/git/blobs/${j.sha}`, {
      headers: headers({ Accept: 'application/vnd.github.raw+json' }),
      cache: 'no-store',
    });
    if (!b.ok) throw await toError(b);
    text = await b.text();
  }
  const parsed = JSON.parse(text || '[]');
  return { posts: Array.isArray(parsed) ? (parsed as Post[]) : [], sha: j.sha as string };
}

async function writePosts(posts: Post[], sha: string | undefined, message: string): Promise<void> {
  const content = toBase64(new TextEncoder().encode(JSON.stringify(posts, null, 2)));
  const body: Record<string, unknown> = { message, content, branch };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/contents/${enc(POSTS_PATH)}`, {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
}

export async function loadPosts(): Promise<Post[]> {
  return (await readPosts()).posts;
}

/**
 * 최신 글 목록을 읽어 변경하고 저장해요.
 * 다른 사람이 동시에 저장해서 충돌하면 최신본을 다시 읽어 같은 변경을 다시 적용해요.
 */
export async function mutatePosts(fn: (posts: Post[]) => Post[], message: string): Promise<Post[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { posts, sha } = await readPosts();
    const next = fn(JSON.parse(JSON.stringify(posts)) as Post[]);
    try {
      await writePosts(next, sha, message);
      return next;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 422) && attempt < 3) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw new UserError('동시에 저장하는 사람이 많아 저장하지 못했어요. 다시 시도해 주세요');
}

export async function uploadFile(postId: number, file: File): Promise<FileMeta> {
  const m = file.name.match(/\.[A-Za-z0-9]{1,8}$/);
  const ext = m ? m[0].toLowerCase() : '';
  const path = `data/files/${postId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const res = await fetch(`${API}/contents/${enc(path)}`, {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message: `파일 업로드: ${file.name}`, content: toBase64(bytes), branch }),
  });
  if (!res.ok) throw await toError(res);
  return { name: file.name, size: file.size, path };
}

export async function fetchFileBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API}/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: headers({ Accept: 'application/vnd.github.raw+json' }),
    cache: 'no-store',
  });
  if (!res.ok) throw await toError(res);
  return res.blob();
}

/** 파일 삭제는 실패해도 글 저장에는 영향이 없도록 조용히 시도해요 */
export async function deleteFiles(paths: string[]): Promise<void> {
  for (const path of paths) {
    try {
      const r = await fetch(`${API}/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`, {
        headers: headers(),
        cache: 'no-store',
      });
      if (!r.ok) continue;
      const j = await r.json();
      await fetch(`${API}/contents/${enc(path)}`, {
        method: 'DELETE',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: `파일 삭제: ${path}`, sha: j.sha, branch }),
      });
    } catch {
      // 무시
    }
  }
}
