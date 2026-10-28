#!/usr/bin/env bash
# 최초 1회: 글/첨부파일을 저장할 data 브랜치를 만듭니다.
set -e
git checkout --orphan data
git rm -rf . >/dev/null 2>&1 || true
mkdir -p data
echo '[]' > data/posts.json
git add data/posts.json
git commit -m "init data branch"
git push origin data
git checkout main
