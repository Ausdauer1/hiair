# 하이에어코리아 협력업체 게시판

요청사항/결과물을 주고받는 게시판 (프로토타입). 정적 사이트(GitHub Pages) + 글·첨부파일은 이 저장소의 `data` 브랜치에 저장되고, 브라우저가 GitHub API로 직접 읽고 씁니다.

## 설정 (최초 1회)
1. **data 브랜치 만들기**: `./scripts/init-data-branch.sh` (또는 GitHub에서 `data` 브랜치를 직접 생성)
2. **토큰 만들기**: GitHub → Settings → Developer settings → Fine-grained token. 이 저장소만 선택, Permissions → Contents: Read and write.
3. **Secrets** (Settings → Secrets and variables → Actions)
   - `GH_DATA_TOKEN`: 위 토큰
   - `COMPANIES_JSON`: 업체 이름 목록 `["하이에어코리아","협력업체 A","협력업체 B"]` (비밀번호는 글마다 작성자가 정해요)
4. **Pages**: Settings → Pages → Source를 `GitHub Actions`로.
5. `main`에 push하면 자동 배포됩니다.

## 로컬 실행
`.env.example`을 `.env`로 복사해 값을 채운 뒤 `npm install && npm run dev`.

## 주의 (프로토타입)
토큰과 글 비밀번호가 빌드 결과(JS)에 포함되어 누구나 볼 수 있습니다. 무료 Pages는 공개 저장소가 필요해 글·첨부파일도 공개됩니다. 실서비스에는 서버/인증을 두세요.
