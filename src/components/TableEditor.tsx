import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type { CellFmt, TableData } from '../types';
import { SETTING_HEADERS } from '../config';
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

function cellStyle(f: CellFmt | undefined): CSSProperties | undefined {
  if (!f || (!f.b && !f.a)) return undefined;
  return { fontWeight: f.b ? 700 : undefined, textAlign: f.a ? ALIGN_CSS[f.a] : undefined };
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
                <th key={c} style={cellStyle(fmt?.[0]?.[c])}>
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
  const any = cells.some((r) => r.some((c) => c.f.b || c.f.a));
  return any ? { rows, fmt: cells.map((r) => r.map((c) => ({ ...c.f }))) } : { rows };
};
const blankCells = (n: number): Cell[] => Array.from({ length: n }, () => ({ v: '', f: {} }));

type Scope = 'cell' | 'row' | 'col';

/** 작성·수정용 표 편집기: 모든 칸 수정, 행/열을 원하는 위치에 추가·삭제, 굵게·정렬 */
export default function TableEditor(props: { table: TableData; onChange: (t: TableData | undefined) => void; title: string; notify: (m: string) => void }) {
  const cells = toCells(props.table);
  const width = cells[0].length;
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const [scope, setScope] = useState<Scope>('cell');
  const emit = (next: Cell[][]) => props.onChange(next.length === 0 || next[0].length === 0 ? undefined : fromCells(next));

  const setValue = (r: number, c: number, v: string) => emit(cells.map((row, ri) => row.map((x, ci) => (ri === r && ci === c ? { ...x, v } : x))));
  const addRowAt = (at: number) => emit([...cells.slice(0, at), blankCells(width), ...cells.slice(at)]);
  const addColAt = (at: number) => emit(cells.map((row) => [...row.slice(0, at), { v: '', f: {} }, ...row.slice(at)]));
  const delRow = (r: number) => emit(cells.filter((_, i) => i !== r));
  const delCol = (c: number) => emit(cells.map((row) => row.filter((_, i) => i !== c)));
  const loadSetting = () => {
    const w = Math.max(width, SETTING_HEADERS.length);
    const pad = (row: Cell[]) => [...row, ...blankCells(w - row.length)];
    const header = pad(SETTING_HEADERS.map((v, i) => ({ v, f: cells[0][i]?.f ?? {} })));
    emit([header, ...cells.slice(1).map(pad)]);
  };

  // 서식 적용 범위: 선택한 칸 / 그 행 전체 / 그 열 전체
  const inScope = (r: number, c: number) => !!focus && (scope === 'cell' ? r === focus.r && c === focus.c : scope === 'row' ? r === focus.r : c === focus.c);
  const focusCell = focus ? cells[focus.r]?.[focus.c] : undefined;
  function toggleBold() {
    if (!focus) return;
    const on = !focusCell?.f.b;
    emit(cells.map((row, ri) => row.map((x, ci) => (inScope(ri, ci) ? { ...x, f: { ...x.f, b: on || undefined } } : x))));
  }
  function setAlign(a: 'l' | 'c' | 'r') {
    if (!focus) return;
    emit(cells.map((row, ri) => row.map((x, ci) => (inScope(ri, ci) ? { ...x, f: { ...x.f, a } } : x))));
  }
  // 툴바 버튼을 눌러도 입력칸의 커서가 빠지지 않게 해요
  const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

  return (
    <div className="field table-edit">
      <div className="table-head">
        <span className="label">표 (칸을 눌러 바로 수정하세요)</span>
        <span className="table-tools">
          <button className="btn btn-small btn-outline" onClick={loadSetting}>
            세팅값 제목 넣기
          </button>
          <button className="btn btn-small btn-ghost danger-text" onClick={() => props.onChange(undefined)}>
            표 삭제
          </button>
        </span>
      </div>
      <div className="format-bar" role="toolbar" aria-label="칸 서식">
        <button className={`mini-btn ${focusCell?.f.b ? 'on' : ''}`} onMouseDown={keepFocus} onClick={toggleBold} disabled={!focus} aria-label="굵게" aria-pressed={!!focusCell?.f.b}>
          <b>B</b>
        </button>
        {(['l', 'c', 'r'] as const).map((a) => (
          <button key={a} className={`mini-btn ${focusCell?.f.a === a ? 'on' : ''}`} onMouseDown={keepFocus} onClick={() => setAlign(a)} disabled={!focus} aria-label={a === 'l' ? '왼쪽 정렬' : a === 'c' ? '가운데 정렬' : '오른쪽 정렬'} aria-pressed={focusCell?.f.a === a}>
            {a === 'l' ? '왼쪽' : a === 'c' ? '가운데' : '오른쪽'}
          </button>
        ))}
        <label className="format-scope">
          적용 범위
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label="서식 적용 범위">
            <option value="cell">선택한 칸</option>
            <option value="row">그 행 전체</option>
            <option value="col">그 열 전체</option>
          </select>
        </label>
        {!focus && <span className="muted small-text">칸을 먼저 눌러 선택하세요</span>}
      </div>
      <div className="table-scroll">
        <table className="grid grid-edit">
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
                  <td key={c} className={focus && focus.r === r && focus.c === c ? 'cell-on' : ''}>
                    <input
                      aria-label={`${r === 0 ? '제목' : `${r}행`} ${c + 1}열`}
                      value={x.v}
                      style={cellStyle(x.f)}
                      onFocus={() => setFocus({ r, c })}
                      onChange={(e) => setValue(r, c, e.target.value)}
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
