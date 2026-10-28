import { useState } from 'react';
import type { FileMeta, Post } from '../types';
import { MAX_FILES, MAX_FILE_MB, checkPassword, companies } from '../config';
import { errMsg, fetchFileBlob } from '../lib/github';
import { dueInfo, fileSize, isKakaoInApp, kakaoExternalUrl, reqLabel, resultsOf, ymdhm } from '../lib/util';
import { DownloadIcon, KindChip, PasswordDialog } from './ui';

export interface DetailActions {
  updatePost: (id: number, patch: { title: string; body: string; due: string }, add: File[], removePaths: string[]) => Promise<boolean>;
  deletePost: (id: number) => Promise<boolean>;
  addComment: (id: number, author: string, text: string) => Promise<boolean>;
  notify: (msg: string) => void;
}

export default function DetailView(props: {
  post: Post;
  posts: Post[];
  canWrite: boolean;
  actions: DetailActions;
  onBack: () => void;
  onOpen: (id: number) => void;
  onReply: (requestId: number) => void;
}) {
  const { post, posts, canWrite, actions } = props;
  const isReq = post.kind === '요청사항';
  const results = isReq ? resultsOf(posts, post.id) : [];
  const parent = !isReq && post.link != null ? posts.find((p) => p.id === post.link) : undefined;
  const due = isReq ? dueInfo(post.due, results.length > 0) : null;

  const [auth, setAuth] = useState<null | 'edit' | 'delete'>(null);
  const [editing, setEditing] = useState(false);

  async function download(f: FileMeta) {
    if (isKakaoInApp()) {
      actions.notify('기본 브라우저에서 다운로드할 수 있어요. 브라우저로 이동합니다');
      window.location.href = kakaoExternalUrl();
      return;
    }
    try {
      const blob = await fetchFileBlob(f.path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      actions.notify('다운로드했어요');
    } catch (e) {
      actions.notify(errMsg(e));
    }
  }

  return (
    <div className="detail">
      <a
        href="#/"
        className="back"
        onClick={(e) => {
          e.preventDefault();
          props.onBack();
        }}
      >
        ← 목록으로
      </a>

      <section className="panel">
        <div className="detail-head">
          <KindChip kind={post.kind} />
          {due && <span className={`due due-${due.tone}`}>{due.text}</span>}
          <span className="muted small-text">
            {isReq ? `#${post.no} · ` : ''}
            {post.author} · {ymdhm(post.createdAt)}
            {post.editedAt ? ' · 수정됨' : ''}
          </span>
          {!editing && (
            <span className="head-actions">
              <button className="btn btn-small btn-ghost" onClick={() => setAuth('edit')}>
                수정
              </button>
              <button className="btn btn-small btn-ghost danger-text" onClick={() => setAuth('delete')}>
                삭제
              </button>
            </span>
          )}
        </div>

        {editing ? (
          <EditForm post={post} canWrite={canWrite} actions={actions} onDone={() => setEditing(false)} />
        ) : (
          <>
            <h1>{post.title}</h1>
            <p className="body">{post.body}</p>
          </>
        )}

        {parent && (
          <div className="link-box">
            <span className="muted small-text">연결된 요청사항</span>
            <a
              href={`#/post/${parent.id}`}
              onClick={(e) => {
                e.preventDefault();
                props.onOpen(parent.id);
              }}
            >
              ↳ 요청사항 {reqLabel(parent)}
            </a>
          </div>
        )}

        {!editing && post.files.length > 0 && (
          <div className="files">
            <span className="muted small-text">첨부 파일</span>
            {post.files.map((f) => (
              <div key={f.path}>
                <button className="file-btn" onClick={() => download(f)} aria-label={`${f.name} 다운로드`}>
                  <DownloadIcon />
                  <span>
                    {f.name} · {fileSize(f.size)}
                  </span>
                  <span className="muted small-text">다운로드</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {isReq && (
          <div className="results">
            <h2 className="sub-title">연결된 결과물 {results.length}건</h2>
            {results.map((r) => (
              <div key={r.id} className="result-line">
                <a
                  href={`#/post/${r.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    props.onOpen(r.id);
                  }}
                >
                  {r.title}
                </a>
                <span className="muted small-text"> · {r.author}</span>
              </div>
            ))}
            {!editing && (
              <div>
                <button className="btn btn-outline" onClick={() => props.onReply(post.id)}>
                  이 요청사항에 결과물 올리기
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <Comments post={post} canWrite={canWrite} actions={actions} />

      {auth && (
        <PasswordDialog
          title={auth === 'edit' ? '글 수정' : '글 삭제'}
          company={post.author}
          confirmLabel={auth === 'edit' ? '수정하기' : '삭제하기'}
          danger={auth === 'delete'}
          blockedMessage={auth === 'delete' && results.length > 0 ? '결과물이 연결된 요청사항은 삭제할 수 없어요' : !canWrite ? '쓰기 토큰이 설정되지 않았어요' : undefined}
          onCancel={() => setAuth(null)}
          onConfirm={async () => {
            if (auth === 'edit') {
              setAuth(null);
              setEditing(true);
            } else {
              const ok = await actions.deletePost(post.id);
              if (ok) props.onBack();
              else setAuth(null);
            }
          }}
        />
      )}
    </div>
  );
}

function EditForm({ post, canWrite, actions, onDone }: { post: Post; canWrite: boolean; actions: DetailActions; onDone: () => void }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [due, setDue] = useState(post.due ?? '');
  const [kept, setKept] = useState<FileMeta[]>(post.files);
  const [added, setAdded] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const ok = canWrite && title.trim() !== '' && !busy;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...added];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        actions.notify(`${f.name}: ${MAX_FILE_MB}MB 이하만 올릴 수 있어요`);
        continue;
      }
      if (kept.length + next.length >= MAX_FILES) {
        actions.notify(`첨부 파일은 최대 ${MAX_FILES}개까지예요`);
        break;
      }
      next.push(f);
    }
    setAdded(next);
  }

  async function save() {
    if (!ok) return;
    setBusy(true);
    const removed = post.files.filter((f) => !kept.some((k) => k.path === f.path)).map((f) => f.path);
    const done = await actions.updatePost(post.id, { title: title.trim(), body, due: post.kind === '요청사항' ? due : '' }, added, removed);
    setBusy(false);
    if (done) onDone();
  }

  return (
    <div className="edit-form">
      <div className="field">
        <label htmlFor="e-title">제목</label>
        <input id="e-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {post.kind === '요청사항' && (
        <div className="field">
          <label htmlFor="e-due">마감일 (선택)</label>
          <input id="e-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 200 }} />
        </div>
      )}
      <div className="field">
        <label htmlFor="e-body">내용</label>
        <textarea id="e-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="field">
        <div>
          <input id="e-files" type="file" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <label htmlFor="e-files" className="btn btn-outline">
            파일 추가
          </label>
        </div>
        {kept.map((f) => (
          <div key={f.path} className="file-line">
            <span>
              {f.name} · {fileSize(f.size)}
            </span>
            <button className="btn btn-small btn-link-danger" onClick={() => setKept(kept.filter((k) => k.path !== f.path))}>
              제거
            </button>
          </div>
        ))}
        {added.map((f, i) => (
          <div key={i} className="file-line">
            <span>
              {f.name} · {fileSize(f.size)} (새 파일)
            </span>
            <button className="btn btn-small btn-link-danger" onClick={() => setAdded(added.filter((_, j) => j !== i))}>
              제거
            </button>
          </div>
        ))}
      </div>
      <div className="dialog-actions left">
        <button className="btn" disabled={!ok} onClick={save}>
          {busy ? '저장 중…' : '저장'}
        </button>
        <button className="btn btn-ghost" onClick={onDone}>
          취소
        </button>
      </div>
    </div>
  );
}

function Comments({ post, canWrite, actions }: { post: Post; canWrite: boolean; actions: DetailActions }) {
  const [company, setCompany] = useState(companies[0].name);
  const [pw, setPw] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const pwOk = checkPassword(company, pw);
  const bad = pw !== '' && !pwOk;
  const ok = canWrite && pwOk && text.trim() !== '' && !busy;
  const msg = !canWrite ? '쓰기 토큰이 설정되지 않아 댓글을 등록할 수 없어요' : pw === '' ? '업체 비밀번호를 입력하세요' : bad ? '비밀번호가 맞지 않아요' : text.trim() === '' ? '댓글 내용을 입력하세요' : busy ? '등록 중…' : '확인됐어요';

  async function submit() {
    if (!ok) return;
    setBusy(true);
    const done = await actions.addComment(post.id, company, text.trim());
    setBusy(false);
    if (done) {
      setPw('');
      setText('');
    }
  }

  return (
    <>
      <section className="panel">
        <h2>댓글 {post.comments.length}</h2>
        {post.comments.map((c) => (
          <div key={c.id} className="comment">
            <div>
              <strong>{c.author}</strong> <span className="muted small-text">{ymdhm(c.createdAt)}</span>
            </div>
            <div className="comment-text">{c.text}</div>
          </div>
        ))}
        {post.comments.length === 0 && <span className="muted small-text">아직 댓글이 없어요</span>}
      </section>

      <section className="panel panel-write">
        <h2>댓글 쓰기</h2>
        <div className="row-fields">
          <div className="field">
            <label htmlFor="c-company">업체</label>
            <select id="c-company" value={company} onChange={(e) => { setCompany(e.target.value); setPw(''); }}>
              {companies.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-pw">업체 비밀번호</label>
            <input id="c-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: 180 }} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="c-text">댓글 내용</label>
          <textarea id="c-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="form-actions">
          <span className={`msg ${bad ? 'msg-bad' : ''}`} aria-live="polite">
            {msg}
          </span>
          <button className="btn" disabled={!ok} onClick={submit}>
            댓글 등록
          </button>
        </div>
      </section>
    </>
  );
}
