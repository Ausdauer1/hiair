import { useRef, useState } from 'react';
import type { Block, TableData } from '../types';
import { useSettings } from '../settings';
import SettingMaker from './SettingMaker';
import TableEditor, { blankTable } from './TableEditor';

const SETTING_PAGE_SIZE = 5;

/** 글 내용 편집기: 문단 사이사이에 표를 넣을 수 있어요 (커서 위치에 표가 들어가요) */
export default function BlockEditor(props: { blocks: Block[]; onChange: (b: Block[]) => void; title: string; notify: (m: string) => void; idPrefix: string }) {
  const { blocks, onChange } = props;
  const { settings, remove } = useSettings();
  const [making, setMaking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [sure, setSure] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(settings.length / SETTING_PAGE_SIZE));
  const curPage = Math.min(page, pages);
  // 마지막으로 커서가 있던 문단과 위치
  const caret = useRef<{ i: number; pos: number } | null>(null);

  function setText(i: number, text: string) {
    onChange(blocks.map((b, bi) => (bi === i && b.type === 'text' ? { type: 'text', text } : b)));
  }

  function insertTable(t: TableData) {
    const at = caret.current;
    const target = at ? blocks[at.i] : undefined;
    if (at && target && target.type === 'text') {
      const before = target.text.slice(0, at.pos);
      const after = target.text.slice(at.pos);
      onChange([...blocks.slice(0, at.i), { type: 'text', text: before }, { type: 'table', ...t }, { type: 'text', text: after }, ...blocks.slice(at.i + 1)]);
      caret.current = null;
    } else {
      onChange([...blocks, { type: 'table', ...t }, { type: 'text', text: '' }]);
    }
  }

  function setTable(i: number, t: TableData | undefined) {
    if (t) {
      onChange(blocks.map((b, bi) => (bi === i && b.type === 'table' ? { type: 'table', ...t } : b)));
      return;
    }
    // 표를 지우면 앞뒤 문단을 하나로 합쳐요
    const prev = blocks[i - 1];
    const next = blocks[i + 1];
    if (prev && next && prev.type === 'text' && next.type === 'text') {
      const joined = [prev.text, next.text].filter((t) => t !== '').join('\n');
      onChange([...blocks.slice(0, i - 1), { type: 'text', text: joined }, ...blocks.slice(i + 2)]);
    } else {
      const rest = blocks.filter((_, bi) => bi !== i);
      onChange(rest.length > 0 ? rest : [{ type: 'text', text: '' }]);
    }
    caret.current = null;
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    caret.current = null;
  }

  return (
    <div className="field">
      <div className="table-head">
        <label htmlFor={`${props.idPrefix}-body-0`}>내용</label>
        <span className="table-tools">
          <button className="btn btn-small btn-outline" onClick={() => insertTable(blankTable(3, 3))}>
            표 넣기
          </button>
          <button className="btn btn-small btn-outline" aria-expanded={picking} onClick={() => {
              setPicking(!picking);
              setPage(1);
              setSure(null);
            }}>
            세팅값 불러오기
          </button>
          <button className="btn btn-small btn-outline" onClick={() => setMaking(true)}>
            세팅값 표 만들기
          </button>
        </span>
      </div>
      {picking && (
        <div className="picker" role="group" aria-label="저장된 세팅값">
          {settings.length === 0 && <span className="muted small-text">저장된 세팅값이 없어요. 「세팅값 표 만들기」로 먼저 만들어 주세요.</span>}
          {settings.slice((curPage - 1) * SETTING_PAGE_SIZE, curPage * SETTING_PAGE_SIZE).map((s) => (
            <div key={s.id} className="picker-row">
              <span className="picker-name">
                {s.name} <span className="muted small-text">· {s.table.rows[0]?.length ?? 0}열 {Math.max(0, s.table.rows.length - 1)}행</span>
              </span>
              <button
                className="btn btn-small"
                onClick={() => {
                  insertTable(JSON.parse(JSON.stringify(s.table)) as TableData);
                  setPicking(false);
                }}
              >
                넣기
              </button>
              {sure === s.id ? (
                <button
                  className="btn btn-small btn-danger"
                  onClick={async () => {
                    await remove(s.id);
                    setSure(null);
                  }}
                >
                  정말 삭제
                </button>
              ) : (
                <button className="btn btn-small btn-ghost danger-text" onClick={() => setSure(s.id)}>
                  삭제
                </button>
              )}
            </div>
          ))}
          {pages > 1 && (
            <nav className="pager" aria-label="세팅값 페이지 이동">
              <button className="page-btn" disabled={curPage <= 1} aria-label="세팅값 이전 페이지" onClick={() => setPage(curPage - 1)}>
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`page-btn ${n === curPage ? 'page-on' : ''}`} aria-label={`세팅값 ${n}페이지`} aria-current={n === curPage ? 'page' : undefined} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button className="page-btn" disabled={curPage >= pages} aria-label="세팅값 다음 페이지" onClick={() => setPage(curPage + 1)}>
                ›
              </button>
            </nav>
          )}
        </div>
      )}
      {making && <SettingMaker onClose={() => setMaking(false)} notify={props.notify} />}
      <span className="muted small-text">글을 쓰다가 표를 넣고 싶은 자리에 커서를 두고 버튼을 누르면 그 자리에 표가 들어가요.</span>
      {blocks.map((b, i) =>
        b.type === 'text' ? (
          <textarea
            key={i}
            id={`${props.idPrefix}-body-${i}`}
            rows={i === 0 ? 4 : 2}
            value={b.text}
            aria-label={i === 0 ? '내용' : `내용 ${i + 1}`}
            onChange={(e) => {
              caret.current = { i, pos: e.target.selectionStart };
              setText(i, e.target.value);
            }}
            onBlur={(e) => {
              caret.current = { i, pos: e.target.selectionStart };
            }}
          />
        ) : (
          <div key={i} className="table-item">
            <div className="table-tools">
              <button className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => move(i, -1)}>
                표 위로
              </button>
              <button className="btn btn-small btn-ghost" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                표 아래로
              </button>
            </div>
            <TableEditor table={{ rows: b.rows, fmt: b.fmt }} onChange={(t) => setTable(i, t)} title={props.title} notify={props.notify} />
          </div>
        ),
      )}
    </div>
  );
}
