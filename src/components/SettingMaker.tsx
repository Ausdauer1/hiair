import { useState } from 'react';
import type { TableData } from '../types';
import { sameName, useSettings } from '../settings';
import TableEditor, { blankTable } from './TableEditor';

/** 세팅값 표를 따로 만들어 저장하는 창 (새 글을 쓸 때 불러와서 넣어요) */
export default function SettingMaker({ onClose, notify }: { onClose: () => void; notify: (m: string) => void }) {
  const { save, canWrite, settings } = useSettings();
  const [name, setName] = useState('');
  const [table, setTable] = useState<TableData | undefined>(blankTable(6, 3));
  const [busy, setBusy] = useState(false);
  const dup = name.trim() !== '' && settings.some((s) => sameName(s.name, name));
  const ok = canWrite && name.trim() !== '' && !dup && !!table && !busy;

  async function go() {
    if (!ok || !table) return;
    setBusy(true);
    const done = await save(name.trim(), table);
    setBusy(false);
    if (done) onClose();
  }

  return (
    <div className="modal-back" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="세팅값 표 만들기">
        <div className="modal-head">
          <strong>세팅값 표 만들기</strong>
          <button className="btn btn-small btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
        <span className="muted small-text">기존 내용을 입력해서 저장해 두면, 새 요청사항을 쓸 때 「세팅값 불러오기」로 그대로 넣을 수 있어요.</span>
        <div className="field">
          <label htmlFor="sm-name">세팅값 이름</label>
          <input id="sm-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: A야드 크레인 기본 세팅" autoFocus />
        </div>
        {table ? (
          <TableEditor table={table} onChange={setTable} title={name} notify={notify} />
        ) : (
          <button className="btn btn-outline" onClick={() => setTable(blankTable(6, 3))}>
            빈 표 다시 만들기
          </button>
        )}
        <div className="form-actions">
          <span className={`msg ${dup ? 'msg-bad' : ''}`} aria-live="polite">{!canWrite ? '쓰기 토큰이 설정되지 않아 저장할 수 없어요' : name.trim() === '' ? '세팅값 이름을 입력하세요' : dup ? '이미 있는 이름이에요. 다른 이름으로 저장하세요' : !table ? '표가 없어요' : busy ? '저장 중…' : '확인됐어요'}</span>
          <button className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn" disabled={!ok} onClick={go}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
