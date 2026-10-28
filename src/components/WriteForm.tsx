import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kind, Post } from '../types';
import { MAX_FILES, MAX_FILE_MB, checkPassword, companies } from '../config';
import { fileSize, reqLabel, requestsOf } from '../lib/util';

export interface NewPostInput {
  kind: Kind;
  company: string;
  title: string;
  body: string;
  due: string;
  link?: number;
  files: File[];
}

export default function WriteForm(props: {
  posts: Post[];
  canWrite: boolean;
  focusKey: number;
  prefill: { link: number; key: number } | null;
  onPrefillUsed: () => void;
  onSubmit: (input: NewPostInput) => Promise<boolean>;
  notify: (msg: string) => void;
}) {
  const { posts, canWrite, focusKey, prefill, onPrefillUsed, onSubmit, notify } = props;
  const [kind, setKind] = useState<Kind>('요청사항');
  const [company, setCompany] = useState(companies[0].name);
  const [pw, setPw] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [due, setDue] = useState('');
  const [link, setLink] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function focusForm() {
    setTimeout(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleRef.current?.focus({ preventScroll: true });
    }, 120);
  }

  // 상단 "글쓰기" 버튼
  useEffect(() => {
    if (focusKey > 0) focusForm();
  }, [focusKey]);

  // "이 요청사항에 결과물 올리기"
  useEffect(() => {
    if (!prefill) return;
    setKind('결과물');
    setLink(prefill.link);
    setQ('');
    focusForm();
    onPrefillUsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.key]);

  const selected = link != null ? posts.find((p) => p.id === link && p.kind === '요청사항') : undefined;
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^#/, '');
    if (!t) return [];
    return requestsOf(posts).filter((p) => String(p.no) === t || p.title.toLowerCase().includes(t) || p.author.toLowerCase().includes(t));
  }, [q, posts]);

  const pwOk = checkPassword(company, pw);
  const pwBad = pw !== '' && !pwOk;
  const linkOk = kind === '요청사항' || !!selected;
  const ok = canWrite && pwOk && linkOk && title.trim() !== '' && !busy;
  const msg = !canWrite
    ? '쓰기 토큰이 설정되지 않아 글을 등록할 수 없어요'
    : pw === ''
      ? '업체 비밀번호를 입력하세요'
      : pwBad
        ? '비밀번호가 맞지 않아요'
        : !linkOk
          ? '관련 요청사항을 선택하세요'
          : title.trim() === ''
            ? '제목을 입력하세요'
            : busy
              ? '등록 중…'
              : '확인됐어요';

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        notify(`${f.name}: ${MAX_FILE_MB}MB 이하만 올릴 수 있어요`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        notify(`첨부 파일은 최대 ${MAX_FILES}개까지예요`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit() {
    if (!ok) return;
    setBusy(true);
    const done = await onSubmit({ kind, company, title: title.trim(), body, due: kind === '요청사항' ? due : '', link: selected?.id, files });
    setBusy(false);
    if (done) {
      setPw('');
      setTitle('');
      setBody('');
      setDue('');
      setLink(null);
      setQ('');
      setFiles([]);
    }
  }

  return (
    <section className="panel" id="write" ref={boxRef}>
      <h2>새 글 작성</h2>
      <div className="row-fields">
        <div className="field">
          <label htmlFor="w-kind">구분</label>
          <select id="w-kind" value={kind} onChange={(e) => { setKind(e.target.value as Kind); setLink(null); setQ(''); }}>
            <option value="요청사항">요청사항</option>
            <option value="결과물">결과물</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="w-company">업체</label>
          <select id="w-company" value={company} onChange={(e) => { setCompany(e.target.value); setPw(''); }}>
            {companies.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="w-pw">업체 비밀번호</label>
          <input id="w-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: 180 }} />
        </div>
        <div className="field grow">
          <label htmlFor="w-title">제목</label>
          <input id="w-title" type="text" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      {kind === '결과물' && (
        <div className="field">
          <span className="label">관련 요청사항 (필수)</span>
          {selected ? (
            <div className="selected-box">
              <span>{reqLabel(selected)}</span>
              <button className="btn btn-small btn-ghost" onClick={() => { setLink(null); setQ(''); }}>
                변경
              </button>
            </div>
          ) : (
            <div className="combo">
              <label htmlFor="w-q" className="sr-only">
                요청사항 검색
              </label>
              <input id="w-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="요청사항 번호, 제목 또는 업체로 검색 (입력하면 목록이 나타나요)" autoComplete="off" />
              {q.trim() !== '' && (
                <div className="combo-list">
                  {matches.slice(0, 6).map((p) => (
                    <button key={p.id} className="combo-item" onClick={() => { setLink(p.id); setQ(''); }}>
                      <span>{reqLabel(p)}</span>
                      <span className="muted small-text">{p.author}</span>
                    </button>
                  ))}
                  {matches.length === 0 && <div className="combo-note">검색 결과가 없어요</div>}
                  {matches.length > 6 && <div className="combo-note">결과가 {matches.length}건이에요. 검색어를 더 입력하면 좁혀져요.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {kind === '요청사항' && (
        <div className="field">
          <label htmlFor="w-due">마감일 (선택)</label>
          <input id="w-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 200 }} />
        </div>
      )}

      <div className="field">
        <label htmlFor="w-body">내용</label>
        <textarea id="w-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <div className="field">
        <div>
          <input id="w-files" type="file" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <label htmlFor="w-files" className="btn btn-outline">
            파일 첨부
          </label>
        </div>
        {files.map((f, i) => (
          <div key={i} className="file-line">
            <span>
              {f.name} · {fileSize(f.size)}
            </span>
            <button className="btn btn-small btn-link-danger" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
              제거
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <span className={`msg ${pwBad ? 'msg-bad' : ''}`} aria-live="polite">
          {msg}
        </span>
        <button className="btn" disabled={!ok} onClick={submit}>
          등록
        </button>
      </div>
    </section>
  );
}
