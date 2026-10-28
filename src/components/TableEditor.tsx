import { SETTING_HEADERS } from '../config';
import { buildXlsx } from '../lib/xlsx';
import { isKakaoInApp, kakaoExternalUrl, saveBlob } from '../lib/util';

/** 표만 엑셀(.xlsx)로 내보내기. 카카오톡 인앱 브라우저는 저장이 안 되므로 기본 브라우저로 넘겨요. */
export function exportTable(table: string[][], title: string, notify: (m: string) => void) {
  if (isKakaoInApp()) {
    notify('기본 브라우저에서 내보낼 수 있어요. 브라우저로 이동합니다');
    window.location.href = kakaoExternalUrl();
    return;
  }
  const name = (title.trim() || '표').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  saveBlob(buildXlsx(table, name), `${name}.xlsx`);
  notify('엑셀 파일로 내보냈어요');
}

/** 읽기용 표 (상세 화면, 글 내용 중간에 들어가요) */
export function TableView({ table, title, notify }: { table: string[][]; title: string; notify: (m: string) => void }) {
  return (
    <div className="table-block">
      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              {table[0].map((h, c) => (
                <th key={c}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.slice(1).map((r, ri) => (
              <tr key={ri}>
                {table[0].map((_, c) => (
                  <td key={c}>{r[c] ?? ''}</td>
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

/** 작성·수정용 표 편집기: 모든 칸 수정, 행/열을 원하는 위치에 추가·삭제 */
export default function TableEditor(props: { table: string[][]; onChange: (t: string[][] | undefined) => void; title: string; notify: (m: string) => void }) {
  const { table, onChange } = props;
  const width = table[0].length;
  const set = (r: number, c: number, v: string) => onChange(table.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)));
  const addRowAt = (at: number) => onChange([...table.slice(0, at), blankRow(width), ...table.slice(at)]);
  const addColAt = (at: number) => onChange(table.map((row) => [...row.slice(0, at), '', ...row.slice(at)]));
  const delRow = (r: number) => onChange(table.length <= 1 ? undefined : table.filter((_, i) => i !== r));
  const delCol = (c: number) => onChange(width <= 1 ? undefined : table.map((row) => row.filter((_, i) => i !== c)));
  const loadSetting = () => {
    const header = SETTING_HEADERS.slice();
    const w = Math.max(width, header.length);
    const pad = (row: string[]) => [...row, ...blankRow(w - row.length)];
    onChange([pad(header), ...table.slice(1).map(pad)]);
  };

  return (
    <div className="field table-edit">
      <div className="table-head">
        <span className="label">표 (칸을 눌러 바로 수정하세요)</span>
        <span className="table-tools">
          <button className="btn btn-small btn-outline" onClick={loadSetting}>
            세팅값 불러오기
          </button>
          <button className="btn btn-small btn-ghost danger-text" onClick={() => onChange(undefined)}>
            표 삭제
          </button>
        </span>
      </div>
      <div className="table-scroll">
        <table className="grid grid-edit">
          <thead>
            <tr>
              {table[0].map((_, c) => (
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
            {table.map((row, r) => (
              <tr key={r} className={r === 0 ? 'head-row' : ''}>
                {row.map((v, c) => (
                  <td key={c}>
                    <input aria-label={`${r === 0 ? '제목' : `${r}행`} ${c + 1}열`} value={v} onChange={(e) => set(r, c, e.target.value)} />
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
