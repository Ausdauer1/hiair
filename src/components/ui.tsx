import { useState } from 'react';
import type { Kind } from '../types';

export function KindChip({ kind }: { kind: Kind }) {
  return <span className={`chip ${kind === '요청사항' ? 'chip-req' : 'chip-res'}`}>{kind}</span>;
}

export function ClipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A524F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="첨부 파일 있음">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

export function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}

/** 글 비밀번호를 한 번 더 확인하는 작은 창 (수정/삭제용) */
export function PasswordDialog(props: {
  title: string;
  /** 글을 쓸 때 정한 비밀번호 */
  expected: string;
  confirmLabel: string;
  danger?: boolean;
  blockedMessage?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = pw !== '' && pw === props.expected;
  const bad = pw !== '' && !ok;
  const blocked = !!props.blockedMessage;
  const msg = blocked ? props.blockedMessage : pw === '' ? '글을 쓸 때 정한 비밀번호를 입력하세요' : bad ? '비밀번호가 맞지 않아요' : props.danger ? '삭제하면 되돌릴 수 없어요' : '확인됐어요';

  async function go() {
    if (!ok || blocked || busy) return;
    setBusy(true);
    try {
      await props.onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog" role="dialog" aria-label={props.title}>
      <strong>{props.title}</strong>
      <div className="field">
        <label htmlFor="dlg-pw">글 비밀번호</label>
        <input id="dlg-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoFocus />
      </div>
      <span className={`msg ${bad ? 'msg-bad' : ''}`} aria-live="polite">
        {msg}
      </span>
      <div className="dialog-actions">
        <button className="btn btn-ghost" onClick={props.onCancel}>
          취소
        </button>
        <button className={`btn ${props.danger ? 'btn-danger' : ''}`} disabled={!ok || blocked || busy} onClick={go}>
          {busy ? '처리 중…' : props.confirmLabel}
        </button>
      </div>
    </div>
  );
}
