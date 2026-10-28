import { useEffect, useRef, useState } from 'react';
import type { Block } from '../types';
import { MAX_FILES, MAX_FILE_MB, companies } from '../config';
import { fileSize } from '../lib/util';
import BlockEditor from './BlockEditor';

export interface NewPostInput {
  company: string;
  title: string;
  blocks: Block[];
  due: string;
  files: File[];
  password: string;
}

const EMPTY: Block[] = [{ type: 'text', text: '' }];

export default function WriteForm(props: {
  canWrite: boolean;
  focusKey: number;
  onSubmit: (input: NewPostInput) => Promise<boolean>;
  notify: (msg: string) => void;
}) {
  const { canWrite, focusKey, onSubmit, notify } = props;
  const [company, setCompany] = useState(companies[0].name);
  const [pw, setPw] = useState('');
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(EMPTY);
  const [due, setDue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // 상단 "글쓰기" 버튼
  useEffect(() => {
    if (focusKey > 0) {
      setTimeout(() => {
        boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        titleRef.current?.focus({ preventScroll: true });
      }, 120);
    }
  }, [focusKey]);

  const pwOk = pw.trim() !== '';
  const ok = canWrite && pwOk && title.trim() !== '' && !busy;
  const msg = !canWrite ? '쓰기 토큰이 설정되지 않아 글을 등록할 수 없어요' : !pwOk ? '글 비밀번호를 정하세요 (수정·삭제할 때 필요해요)' : title.trim() === '' ? '제목을 입력하세요' : busy ? '등록 중…' : '확인됐어요';

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        notify(`${f.name}: ${MAX_FILE_MB}MB 이하만 올릴 수 있어요`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        notify(`첨부 파일은 최대 ${MAX_FILES}개까지예요`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit() {
    if (!ok) return;
    setBusy(true);
    const done = await onSubmit({ company, title: title.trim(), blocks, due, files, password: pw });
    setBusy(false);
    if (done) {
      setPw('');
      setTitle('');
      setBlocks(EMPTY);
      setDue('');
      setFiles([]);
    }
  }

  return (
    <section className="panel" id="write" ref={boxRef}>
      <h2>새 요청사항 작성</h2>
      <div className="row-fields">
        <div className="field">
          <label htmlFor="w-company">업체</label>
          <select id="w-company" value={company} onChange={(e) => setCompany(e.target.value)}>
            {companies.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="w-pw">글 비밀번호</label>
          <input id="w-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: 180 }} />
        </div>
        <div className="field grow">
          <label htmlFor="w-title">제목</label>
          <input id="w-title" type="text" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="w-due">마감일 (선택)</label>
        <input id="w-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 200 }} />
      </div>

      <BlockEditor blocks={blocks} onChange={setBlocks} title={title} notify={notify} idPrefix="w" />

      <div className="field">
        <div>
          <input id="w-files" type="file" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <label htmlFor="w-files" className="btn btn-outline">
            파일 첨부
          </label>
        </div>
        {files.map((f, i) => (
          <div key={i} className="file-line">
            <span>
              {f.name} · {fileSize(f.size)}
            </span>
            <button className="btn btn-small btn-link-danger" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
              제거
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <span className="msg" aria-live="polite">
          {msg}
        </span>
        <button className="btn" disabled={!ok} onClick={submit}>
          등록
        </button>
      </div>
    </section>
  );
}
