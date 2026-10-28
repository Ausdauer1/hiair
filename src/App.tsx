import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileMeta, Post, SettingTable } from './types';
import { token } from './config';
import { UserError, deleteFiles, errMsg, loadPosts, loadSettings, mutatePosts, mutateSettings, uploadFile } from './lib/github';
import { SettingsContext, type SettingsApi } from './settings';
import ListView from './components/ListView';
import DetailView, { type DetailActions } from './components/DetailView';
import type { NewPostInput } from './components/WriteForm';
import { Toast } from './components/ui';
import { isKakaoInApp, kakaoExternalUrl } from './lib/util';

function parseHash(): number | null {
  const m = window.location.hash.match(/^#\/post\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<SettingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(parseHash());
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const [focusKey, setFocusKey] = useState(0);
  const canWrite = token !== '';

  const notify = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const reload = useCallback(async () => {
    try {
      setPosts(await loadPosts());
      try {
        setSettings(await loadSettings());
      } catch {
        // 세팅값을 못 불러와도 글은 볼 수 있어요
      }
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const t = window.setInterval(reload, 30000);
    return () => window.clearInterval(t);
  }, [reload]);

  useEffect(() => {
    const onHash = () => {
      setOpenId(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goList = () => {
    window.location.hash = '#/';
  };
  const openPost = (id: number) => {
    window.location.hash = `#/post/${id}`;
  };

  async function run(fn: () => Promise<void>, okMsg: string): Promise<boolean> {
    try {
      await fn();
      notify(okMsg);
      return true;
    } catch (e) {
      notify(errMsg(e));
      return false;
    }
  }

  const createPost = (input: NewPostInput) =>
    run(async () => {
      const id = Date.now();
      const files: FileMeta[] = [];
      try {
        for (const f of input.files) files.push(await uploadFile(id, f));
        const next = await mutatePosts((list) => {
          const no = Math.max(0, ...list.filter((p) => p.kind === '요청사항').map((p) => p.no ?? 0)) + 1;
          const post: Post = {
            id,
            no,
            kind: '요청사항',
            title: input.title,
            blocks: input.blocks,
            author: input.company,
            ...(input.due ? { due: input.due } : {}),
            password: input.password,
            createdAt: new Date().toISOString(),
            files,
            comments: [],
          };
          return [post, ...list];
        }, `글 등록: ${input.title}`);
        setPosts(next);
      } catch (e) {
        if (files.length > 0) void deleteFiles(files.map((f) => f.path));
        throw e;
      }
    }, '글을 등록했어요');

  const actions: DetailActions = {
    notify,
    updatePost: (id, patch, add, removePaths) =>
      run(async () => {
        const metas: FileMeta[] = [];
        try {
          for (const f of add) metas.push(await uploadFile(id, f));
          const next = await mutatePosts((list) => {
            const p = list.find((x) => x.id === id);
            if (!p) throw new UserError('이미 삭제된 글이에요');
            p.title = patch.title;
            p.blocks = patch.blocks;
            delete p.body;
            if (patch.due) p.due = patch.due;
            else delete p.due;
            if (patch.done) p.done = { by: patch.done.by, at: new Date().toISOString() };
            else if (patch.done === null) delete p.done;
            p.files = p.files.filter((f) => !removePaths.includes(f.path)).concat(metas);
            p.editedAt = new Date().toISOString();
            return list;
          }, `글 수정: ${patch.title}`);
          setPosts(next);
        } catch (e) {
          if (metas.length > 0) void deleteFiles(metas.map((f) => f.path));
          throw e;
        }
        if (removePaths.length > 0) void deleteFiles(removePaths);
      }, patch.done ? '작성 완료했어요' : patch.done === null ? '작성완료를 해제했어요' : '수정했어요'),
    deletePost: (id) =>
      run(async () => {
        const target = posts.find((p) => p.id === id);
        const next = await mutatePosts((list) => {
          const p = list.find((x) => x.id === id);
          if (!p) return list;
          return list.filter((x) => x.id !== id);
        }, `글 삭제: ${target?.title ?? id}`);
        setPosts(next);
        if (target && target.files.length > 0) void deleteFiles(target.files.map((f) => f.path));
      }, '삭제했어요'),
    addComment: (id, author, text) =>
      run(async () => {
        const next = await mutatePosts((list) => {
          const p = list.find((x) => x.id === id);
          if (!p) throw new UserError('이미 삭제된 글이에요');
          p.comments.push({ id: Date.now(), author, text, createdAt: new Date().toISOString() });
          return list;
        }, '댓글 등록');
        setPosts(next);
      }, '댓글을 등록했어요'),
  };

  const settingsApi: SettingsApi = {
    settings,
    canWrite,
    save: (name, table) =>
      run(async () => {
        setSettings(
          await mutateSettings((list) => [...list, { id: Date.now(), name, table, createdAt: new Date().toISOString() }], `세팅값 저장: ${name}`),
        );
      }, '세팅값을 저장했어요'),
    remove: (id) =>
      run(async () => {
        setSettings(await mutateSettings((list) => list.filter((x) => x.id !== id), '세팅값 삭제'));
      }, '세팅값을 삭제했어요'),
  };

  const current = openId != null ? posts.find((p) => p.id === openId) : undefined;

  return (
    <SettingsContext.Provider value={settingsApi}>
    <div className="page">
      <Toast text={toast} />
      <div className="wrap">
        <header className="band">
          <h1>
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                goList();
              }}
            >
              하이에어코리아 <span>게시판</span>
            </a>
          </h1>
          <span className="band-sub">요청사항을 올리면 결과물로 회신해요</span>
        </header>

        {isKakaoInApp() && (
          <div className="notice-bar">
            카카오톡 안에서는 파일 다운로드가 되지 않아요.{' '}
            <a href={kakaoExternalUrl()} className="btn btn-small">
              기본 브라우저로 열기
            </a>
          </div>
        )}
        {!canWrite && <div className="notice-bar">쓰기 토큰이 설정되지 않아 지금은 읽기만 할 수 있어요. (README의 설정 안내를 확인해 주세요)</div>}
        {error && (
          <div className="notice-bar notice-bad">
            {error}{' '}
            <button className="btn btn-small btn-ghost" onClick={reload}>
              다시 불러오기
            </button>
          </div>
        )}

        {openId == null ? (
          <ListView
            posts={posts}
            loading={loading}
            canWrite={canWrite}
            onOpen={openPost}
            focusKey={focusKey}
            onWriteClick={() => setFocusKey((k) => k + 1)}
            onSubmit={createPost}
            notify={notify}
          />
        ) : current ? (
          <DetailView key={current.id} post={current} canWrite={canWrite} actions={actions} onBack={goList} />
        ) : (
          <div className="board-empty">
            {loading ? '불러오는 중…' : '글을 찾을 수 없어요. 삭제되었을 수 있어요.'}
            {!loading && (
              <div>
                <a href="#/" onClick={(e) => { e.preventDefault(); goList(); }}>
                  ← 목록으로
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </SettingsContext.Provider>
  );
}
