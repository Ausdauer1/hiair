import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type { CellFmt, TableData } from '../types';
import { buildXlsx } from '../lib/xlsx';
import { isKakaoInApp, kakaoExternalUrl, saveBlob } from '../lib/util';

/** 표만 엑셀(.xlsx)로 내보내기. 카카오톡 인앱 브라우저는 저장이 안 되므로 기본 브라우저로 넘겨요. */
export function exportTable(table: TableData, title: string, notify: (m: string) => void) {
  if (isKakaoInApp()) {
    notify('기본 브라우저에서 내보낼 수 있어요. 브라우저로 이동합니다');
    window.location.href = kakaoExternalUrl();
    return;
  }
  const name = (title.trim() || '표').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  saveBlob(buildXlsx(table.rows, name, table.fmt), `${name}.xlsx`);
  notify('엑셀 파일로 내보냈어요');
}

const ALIGN_CSS = { l: 'left', c: 'center', r: 'right' } as const;

/** 굵게: 서식에 따로 정하지 않았으면 제목 행(첫 행)만 굵게예요 */
const isBold = (f: CellFmt | undefined, header: boolean) => f?.b ?? header;

function cellStyle(f: CellFmt | undefined, header = false): CSSProperties | undefined {
  const bold = isBold(f, header);
  if (!header && !bold && !f?.a) return undefined;
  return { fontWeight: bold ? 700 : 400, textAlign: f?.a ? ALIGN_CSS[f.a] : undefined };
}

/** 읽기용 표 (상세 화면, 글 내용 중간에 들어가요) */
export function TableView({ table, title, notify }: { table: TableData; title: string; notify: (m: string) => void }) {
  const { rows, fmt } = table;
  return (
    <div className="table-block">
      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              {rows[0].map((h, c) => (
                <th key={c} style={cellStyle(fmt?.[0]?.[c], true)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, ri) => (
              <tr key={ri}>
                {rows[0].map((_, c) => (
                  <td key={c} style={cellStyle(fmt?.[ri + 1]?.[c])}>
                    {r[c] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button className="btn btn-small btn-outline" onClick={() => exportTable(table, title, notify)}>
          표 엑셀로 내보내기
        </button>
      </div>
    </div>
  );
}

export const blankRow = (n: number) => Array.from({ length: n }, () => '');
export const blankTable = (cols: number, rows: number): TableData => ({ rows: Array.from({ length: rows }, () => blankRow(cols)) });

// 편집할 때는 칸마다 값과 서식을 함께 다뤄요 (행/열을 끼워 넣어도 서식이 같이 움직이도록)
interface Cell {
  v: string;
  f: CellFmt;
}
const toCells = (t: TableData): Cell[][] => t.rows.map((r, ri) => r.map((v, ci) => ({ v, f: t.fmt?.[ri]?.[ci] ?? {} })));
const fromCells = (cells: Cell[][]): TableData => {
  const rows = cells.map((r) => r.map((c) => c.v));
  const any = cells.some((r) => r.some((c) => c.f.b !== undefined || c.f.a));
  return any ? { rows, fmt: cells.map((r) => r.map((c) => ({ ...c.f }))) } : { rows };
};
const blankCells = (n: number): Cell[] => Array.from({ length: n }, () => ({ v: '', f: {} }));

interface Pos {
  r: number;
  c: number;
}

/** 작성·수정용 표 편집기: 모든 칸 수정, 행/열을 원하는 위치에 추가·삭제, 드래그로 칸을 선택해 굵게·정렬 */
export default function TableEditor(props: { table: TableData; onChange: (t: TableData | undefined) => void; title: string; notify: (m: string) => void }) {
  const cells = toCells(props.table);
  const [anchor, setAnchor] = useState<Pos | null>(null);
  const [end, setEnd] = useState<Pos | null>(null);
  const dragging = useRef(false);
  const emit = (next: Cell[][]) => props.onChange(next.length === 0 || next[0].length === 0 ? undefined : fromCells(next));
  const width = cells[0].length;

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const setValue = (r: number, c: number, v: string) => emit(cells.map((row, ri) => row.map((x, ci) => (ri === r && ci === c ? { ...x, v } : x))));
  const addRowAt = (at: number) => emit([...cells.slice(0, at), blankCells(width), ...cells.slice(at)]);
  const addColAt = (at: number) => emit(cells.map((row) => [...row.slice(0, at), { v: '', f: {} }, ...row.slice(at)]));
  const delRow = (r: number) => {
    setAnchor(null);
    setEnd(null);
    emit(cells.filter((_, i) => i !== r));
  };
  const delCol = (c: number) => {
    setAnchor(null);
    setEnd(null);
    emit(cells.map((row) => row.filter((_, i) => i !== c)));
  };

  // 선택 범위(드래그로 잡은 칸들). 칸 하나만 눌렀으면 그 칸만 대상이에요.
  const a = anchor && cells[anchor.r]?.[anchor.c] ? anchor : null;
  const e = a && end && cells[end.r]?.[end.c] ? end : a;
  const rng = a && e ? { r1: Math.min(a.r, e.r), r2: Math.max(a.r, e.r), c1: Math.min(a.c, e.c), c2: Math.max(a.c, e.c) } : null;
  const inRange = (r: number, c: number) => !!rng && r >= rng.r1 && r <= rng.r2 && c >= rng.c1 && c <= rng.c2;
  const multi = !!rng && (rng.r1 !== rng.r2 || rng.c1 !== rng.c2);
  const lead = a ? cells[a.r][a.c] : undefined;
  const leadBold = a ? isBold(lead?.f, a.r === 0) : false;

  function toggleBold() {
    if (!rng || !a) return;
    const on = !leadBold;
    emit(
      cells.map((row, ri) =>
        row.map((x, ci) => {
          if (!inRange(ri, ci)) return x;
          const f = { ...x.f };
          // 제목 행은 굵게가 기본값이라 끌 때만 따로 기록해요
          if (ri === 0 ? on : !on) delete f.b;
          else f.b = on;
          return { ...x, f };
        }),
      ),
    );
  }
  function setAlign(al: 'l' | 'c' | 'r') {
    if (!rng) return;
    emit(cells.map((row, ri) => row.map((x, ci) => (inRange(ri, ci) ? { ...x, f: { ...x.f, a: al } } : x))));
  }
  // 툴바 버튼을 눌러도 입력칸의 커서가 빠지지 않게 해요
  const keepFocus = (ev: ReactMouseEvent) => ev.preventDefault();

  function cellDown(ev: ReactMouseEvent, r: number, c: number) {
    if (ev.shiftKey && anchor) {
      ev.preventDefault();
      setEnd({ r, c });
      return;
    }
    dragging.current = true;
    setAnchor({ r, c });
    setEnd({ r, c });
  }
  function cellEnter(ev: ReactMouseEvent, r: number, c: number) {
    if (!dragging.current || ev.buttons !== 1) return;
    if (anchor && (anchor.r !== r || anchor.c !== c)) window.getSelection()?.removeAllRanges();
    setEnd({ r, c });
  }

  return (
    <div className="field table-edit">
      <div className="table-head">
        <span className="label">표 (칸을 눌러 바로 수정하세요)</span>
        <span className="table-tools">
          <button className="btn btn-small btn-ghost danger-text" onClick={() => props.onChange(undefined)}>
            표 삭제
          </button>
        </span>
      </div>
      <div className="format-bar" role="toolbar" aria-label="칸 서식">
        <button className={`mini-btn ${leadBold ? 'on' : ''}`} onMouseDown={keepFocus} onClick={toggleBold} disabled={!rng} aria-label="굵게" aria-pressed={leadBold}>
          <b>B</b>
        </button>
        {(['l', 'c', 'r'] as const).map((al) => (
          <button key={al} className={`mini-btn ${lead?.f.a === al && !multi ? 'on' : ''}`} onMouseDown={keepFocus} onClick={() => setAlign(al)} disabled={!rng} aria-label={al === 'l' ? '왼쪽 정렬' : al === 'c' ? '가운데 정렬' : '오른쪽 정렬'} aria-pressed={lead?.f.a === al && !multi}>
            {al === 'l' ? '왼쪽' : al === 'c' ? '가운데' : '오른쪽'}
          </button>
        ))}
        <span className="muted small-text">{multi ? `${(rng!.r2 - rng!.r1 + 1) * (rng!.c2 - rng!.c1 + 1)}칸 선택됨` : rng ? '여러 칸은 마우스로 끌어서 선택하세요' : '칸을 눌러 선택하세요 (끌어서 여러 칸 선택)'}</span>
      </div>
      <div className="table-scroll">
        <table className={`grid grid-edit ${multi ? 'ranging' : ''}`}>
          <thead>
            <tr>
              {cells[0].map((_, c) => (
                <th key={c} className="col-del">
                  <button className="mini" aria-label={`${c + 1}번째 열 왼쪽에 추가`} title="왼쪽에 열 추가" onClick={() => addColAt(c)}>
                    ←+
                  </button>
                  <button className="mini" aria-label={`${c + 1}번째 열 삭제`} title="열 삭제" onClick={() => delCol(c)}>
                    ×
                  </button>
                  <button className="mini" aria-label={`${c + 1}번째 열 오른쪽에 추가`} title="오른쪽에 열 추가" onClick={() => addColAt(c + 1)}>
                    +→
                  </button>
                </th>
              ))}
              <th className="row-del" />
            </tr>
          </thead>
          <tbody>
            {cells.map((row, r) => (
              <tr key={r} className={r === 0 ? 'head-row' : ''}>
                {row.map((x, c) => (
                  <td
                    key={c}
                    className={inRange(r, c) ? (multi ? 'cell-range' : 'cell-on') : ''}
                    onMouseDown={(ev) => cellDown(ev, r, c)}
                    onMouseEnter={(ev) => cellEnter(ev, r, c)}
                  >
                    <input
                      aria-label={`${r === 0 ? '제목' : `${r}행`} ${c + 1}열`}
                      value={x.v}
                      style={cellStyle(x.f, r === 0)}
                      onFocus={() => {
                        if (!dragging.current) {
                          setAnchor({ r, c });
                          setEnd({ r, c });
                        }
                      }}
                      onChange={(ev) => setValue(r, c, ev.target.value)}
                    />
                  </td>
                ))}
                <td className="row-del">
                  <button className="mini" aria-label={`${r === 0 ? '제목' : `${r}`}행 위에 추가`} title="위에 행 추가" onClick={() => addRowAt(r)}>
                    ↑+
                  </button>
                  <button className="mini" aria-label={`${r === 0 ? '제목' : `${r}`}행 아래에 추가`} title="아래에 행 추가" onClick={() => addRowAt(r + 1)}>
                    +↓
                  </button>
                  <button className="mini" aria-label={`${r === 0 ? '제목' : `${r}`}행 삭제`} title="행 삭제" onClick={() => delRow(r)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
