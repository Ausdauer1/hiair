export type Kind = '요청사항' | '결과물';

export interface FileMeta {
  name: string;
  size: number;
  /** data 브랜치 안의 파일 경로 */
  path: string;
}

export interface Comment {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

/** 글 내용: 문단과 표가 순서대로 섞여 있어요 */
/** 표 칸 서식: 굵게, 정렬(왼쪽/가운데/오른쪽) */
export interface CellFmt {
  b?: boolean;
  a?: 'l' | 'c' | 'r';
}

/** 표 (첫 행이 제목 행). fmt는 rows와 같은 크기일 때만 쓰여요 */
export interface TableData {
  rows: string[][];
  fmt?: CellFmt[][];
}

export type Block = { type: 'text'; text: string } | ({ type: 'table' } & TableData);

/** 작성 완료 (결과물) 표시 */
export interface Done {
  by: string;
  at: string;
  /** 작성완료 줄에 보이는 한 줄 제목 (비우면 "작성완료") */
  title?: string;
}

export interface Post {
  id: number;
  /** 요청사항 번호 */
  no?: number;
  kind: Kind;
  title: string;
  /** 예전 글(문단만)과의 호환용 */
  body?: string;
  blocks?: Block[];
  /** 작성 완료를 누르면 붙어요 */
  done?: Done;
  /** 작성 업체 이름 */
  author: string;
  /** 마감일 (YYYY-MM-DD, 요청사항만) */
  due?: string;
  createdAt: string;
  editedAt?: string;
  files: FileMeta[];
  comments: Comment[];
  /** 글 수정·삭제용 비밀번호 (프로토타입이라 그대로 저장돼요) */
  password?: string;
}

export interface Company {
  name: string;
}

/** 저장해 둔 세팅값 표 (새 글을 쓸 때 불러와 넣어요) */
export interface SettingTable {
  id: number;
  name: string;
  table: TableData;
  createdAt: string;
}
