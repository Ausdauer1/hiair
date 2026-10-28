import { useRef } from 'react';
import type { Block } from '../types';
import { SETTING_HEADERS } from '../config';
import TableEditor, { blankRow } from './TableEditor';

/** 글 내용 편집기: 문단 사이사이에 표를 넣을 수 있어요 (커서 위치에 표가 들어가요) */
export default function BlockEditor(props: { blocks: Block[]; onChange: (b: Block[]) => void; title: string; notify: (m: string) => void; idPrefix: string }) {
  const { blocks, onChange } = props;
  // 마지막으로 커서가 있던 문단과 위치
  const caret = useRef<{ i: number; pos: number } | null>(null);

  function setText(i: number, text: string) {
    onChange(blocks.map((b, bi) => (bi === i && b.type === 'text' ? { type: 'text', text } : b)));
  }

  function insertTable(rows: string[][]) {
    const at = caret.current;
    const target = at ? blocks[at.i] : undefined;
    if (at && target && target.type === 'text') {
      const before = target.text.slice(0, at.pos);
      const after = target.text.slice(at.pos);
      onChange([...blocks.slice(0, at.i), { type: 'text', text: before }, { type: 'table', rows }, { type: 'text', text: after }, ...blocks.slice(at.i + 1)]);
      caret.current = null;
    } else {
      onChange([...blocks, { type: 'table', rows }, { type: 'text', text: '' }]);
    }
  }

  function setTable(i: number, rows: string[][] | undefined) {
    if (rows) {
      onChange(blocks.map((b, bi) => (bi === i && b.type === 'table' ? { type: 'table', rows } : b)));
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
          <button className="btn btn-small btn-outline" onClick={() => insertTable(blankRow(3).map(() => blankRow(3)))}>
            표 넣기
          </button>
          <button className="btn btn-small btn-outline" onClick={() => insertTable([SETTING_HEADERS.slice(), blankRow(SETTING_HEADERS.length)])}>
            세팅값 표 넣기
          </button>
        </span>
      </div>
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
            <TableEditor table={b.rows} onChange={(r) => setTable(i, r)} title={props.title} notify={props.notify} />
          </div>
        ),
      )}
    </div>
  );
}
