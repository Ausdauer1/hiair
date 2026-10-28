import { useMemo, useState } from 'react';
import type { Post } from '../types';
import { PAGE_SIZE } from '../config';
import { dueInfo, requestsOf, ymd } from '../lib/util';
import { ClipIcon, KindChip } from './ui';
import WriteForm, { type NewPostInput } from './WriteForm';

export default function ListView(props: {
  posts: Post[];
  loading: boolean;
  canWrite: boolean;
  onOpen: (id: number) => void;
  focusKey: number;
  onWriteClick: () => void;
  onSubmit: (input: NewPostInput) => Promise<boolean>;
  notify: (msg: string) => void;
}) {
  const { posts, loading } = props;
  const [sq, setSq] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const t = sq.trim().toLowerCase();
    return requestsOf(posts).filter(
      (p) => t === '' || p.title.toLowerCase().includes(t),
    );
  }, [posts, sq]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const pageReqs = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <>
      <div className="toolbar">
        <label htmlFor="search" className="sr-only">
          제목 검색
        </label>
        <input id="search" type="search" placeholder="제목 검색" value={sq} onChange={(e) => { setSq(e.target.value); setPage(1); }} autoComplete="off" />
        <button className="btn" onClick={props.onWriteClick}>
          글쓰기
        </button>
      </div>

      <section className="board">
        {pageReqs.map((req) => (
          <div key={req.id}>
            <Row post={req} onOpen={props.onOpen} />
            {req.done && <DoneRow post={req} onOpen={props.onOpen} />}
          </div>
        ))}
        {loading && posts.length === 0 && <div className="board-empty">불러오는 중…</div>}
        {!loading && filtered.length === 0 && <div className="board-empty">{sq.trim() ? '검색 결과가 없어요' : '아직 등록된 글이 없어요'}</div>}
      </section>

      {pages > 1 && (
        <nav className="pager" aria-label="페이지 이동">
          <button className="page-btn" disabled={cur <= 1} aria-label="이전 페이지" onClick={() => setPage(cur - 1)}>
            ‹
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`page-btn ${n === cur ? 'page-on' : ''}`} aria-label={`${n}페이지`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>
              {n}
            </button>
          ))}
          <button className="page-btn" disabled={cur >= pages} aria-label="다음 페이지" onClick={() => setPage(cur + 1)}>
            ›
          </button>
        </nav>
      )}

      <WriteForm canWrite={props.canWrite} focusKey={props.focusKey} onSubmit={props.onSubmit} notify={props.notify} />
    </>
  );
}

function Row({ post, onOpen }: { post: Post; onOpen: (id: number) => void }) {
  const due = dueInfo(post.due, !!post.done);
  const meta = [post.author, ymd(post.createdAt), `댓글 ${post.comments.length}`].join(' · ');
  return (
    <div className="row">
      <KindChip kind={post.kind} />
      <div className="row-title">
        <a
          href={`#/post/${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            onOpen(post.id);
          }}
        >
          {post.title}
        </a>
        {post.files.length > 0 && <ClipIcon />}
      </div>
      <span className={`due due-${due.tone}`}>{due.text}</span>
      <span className="row-meta">{meta}</span>
    </div>
  );
}

/** 요청사항 아래에 붙는 "작성완료" 줄 */
function DoneRow({ post, onOpen }: { post: Post; onOpen: (id: number) => void }) {
  const done = post.done!;
  return (
    <div className="row row-reply">
      <span className="chip chip-res">작성완료</span>
      <div className="row-title">
        <span aria-hidden="true" className="muted">
          ↳
        </span>
        <a
          href={`#/post/${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            onOpen(post.id);
          }}
        >
          작성완료
        </a>
      </div>
      <span />
      <span className="row-meta">
        {done.by} · {ymd(done.at)}
      </span>
    </div>
  );
}
