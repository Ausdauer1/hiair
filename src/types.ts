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

export interface Post {
  id: number;
  /** 요청사항에만 붙는 번호 (결과물은 번호 없음) */
  no?: number;
  kind: Kind;
  title: string;
  body: string;
  /** 작성 업체 이름 */
  author: string;
  /** 마감일 (YYYY-MM-DD, 요청사항만) */
  due?: string;
  /** 결과물이 연결된 요청사항의 id */
  link?: number;
  createdAt: string;
  editedAt?: string;
  files: FileMeta[];
  comments: Comment[];
}

export interface Company {
  name: string;
  password: string;
}
