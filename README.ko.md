# figma-deck-skill

Claude Code 로 Figma 안에서 장표를 만든다: Aside 브라우저 + Figma Plugin API + Codex 검토.

[English README](README.md)

## 무엇·왜
- **장표는 Figma 안에 남는다.** 이미 있는 양식 프레임을 Figma 파일 안에서 복제해 채우므로 글꼴·색·배치가 그대로 유지되고, 결과를 사람이 계속 고칠 수 있다.
- **플러그인·MCP 서버 없이.** Figma 웹 편집기는 페이지 스크립트에 Plugin API 객체 `figma` 를 그대로 열어 준다. `bin/figma-run.mjs` 가 Aside 브라우저로 파일을 열고 작은 스크립트를 돌린다 — 읽기·복제·글 수정·이미지 교체·내보내기.
- **도구만이 아니라 방법.** Claude Code 스킬 2개: `deck-method`(그리기 전에 제목 문장부터, 장마다 결론 하나, 차트 고르기, 두 가지 검토), `figma-deck`(도구 쓰는 법).
- **두 가지 검토.** 기계 형식 검사(`scripts/lint-format.js`: 여백·10pt 미만·테마 밖 색·겹침 등)와 문맥 없는 Codex 세션의 독립 논리 검토(`bin/review-logic.sh`).

## 필요한 것
| | 쓰이는 곳 | 메모 |
|---|---|---|
| Node.js 20 이상 | 전부 | 내장 `fetch` 사용 |
| 작업 파일을 편집할 수 있는 Figma 계정 | 편집 | 파일 안에 양식 프레임이 있어야 한다 |
| Figma 개인 액세스 토큰 | REST: 목록·내보내기 | 읽기 스코프면 충분 |
| **Aside 브라우저**(`aside` 명령이 `PATH` 에) | **모든 편집**(`figma-run.mjs`, `aside-js.sh`) | 아래 *Aside 에 대해* 참고. Aside 에서 Figma 로그인이 돼 있어야 한다 |
| poppler(`pdfunite`, `pdfinfo`) | `deck-pdf.sh` | `brew install poppler`. 그림→PDF 는 `sips`(macOS) 또는 ImageMagick |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) | 선택: 스킬 사용 | 문서대로 설치·로그인. 도구는 손으로도 돌릴 수 있다 |
| [Codex CLI](https://github.com/openai/codex) | 선택: `codex-task.sh`, `review-logic.sh` | 설치·로그인(`codex login`). 없어도 나머지는 다 돈다 |

**Aside 에 대해.** Aside 는 외부 업체의 Chromium 기반 macOS AI 브라우저이고, `aside` CLI 에 Playwright 식 JavaScript REPL 인 `aside repl` 이 있다. 업체 안내대로 앱과 CLI 를 설치하고 앱을 연 뒤 확인한다:
```sh
aside --version
aside repl "const p = await openTab('https://www.figma.com'); console.log(await p.title())"
```
이 도구는 `aside repl` 만 쓴다(`openTab`, `page.evaluate`, `~/.aside/u/<계정>/` 아래 파일의 `fs.readFile`). Aside 계정이 `u0` 가 아니면 `ASIDE_PAYLOAD_DIR` 를 바꾼다(`.env.example`).

**Aside 가 없으면** REST 쪽만 쓸 수 있다 — `figma-api.mjs`(목록·노드 읽기·PNG/PDF 내보내기)와 `deck-pdf.sh`. 장표 편집과 `lint-format.js` 등 스크립트 실행은 안 된다.

## 설치
1. 이 레포를 받아 검사:
   ```sh
   git clone <this-repo-url> figma-deck-skill
   cd figma-deck-skill
   bin/check.sh
   ```
2. Figma 토큰 발급: Figma → Settings → Security → **Personal access tokens** → *Generate new token*. 읽기 스코프(`file_content:read`, `file_metadata:read`, `current_user:read`, `figma-api.mjs projects`/`files` 를 쓰려면 `projects:read` 추가). 모양은 `figd_xxxx`.
3. 설정:
   ```sh
   cp .env.example .env      # FIGMA_TOKEN, FIGMA_FILE_KEY 채우기
   set -a; . ./.env; set +a
   node bin/figma-api.mjs me # Figma 사용자 정보가 나오면 토큰 정상
   ```
   `FIGMA_FILE_KEY` 는 `https://www.figma.com/design/<key>/...` 의 `<key>`. macOS 에서는 토큰을 키체인에 둘 수도 있다: `security add-generic-password -s figma-deck-token -a "$USER" -w`(토큰을 물어봄) 후 `FIGMA_KEYCHAIN_SERVICE=figma-deck-token`.
4. Aside 에서 파일을 한 번 열고 Figma 로그인.
5. Claude Code 스킬 설치(심볼릭 링크라 레포를 갱신하면 같이 바뀐다):
   ```sh
   mkdir -p ~/.claude/skills
   ln -s "$PWD/skills/figma-deck" ~/.claude/skills/figma-deck
   ln -s "$PWD/skills/deck-method" ~/.claude/skills/deck-method
   export FIGMA_DECK_HOME="$PWD"                                  # 스킬은 레포를 $FIGMA_DECK_HOME 으로 부른다
   printf 'export FIGMA_DECK_HOME=%q\n' "$PWD" >> ~/.zshrc         # 새 셸에도 남기기(또는 쓰는 셸 설정 파일)
   ```

## 5분 만에 첫 장표
```sh
# 1. 파일 안 목록(페이지·프레임·id) → cache/inventory-<key>-<date>.md
node bin/figma-api.mjs inventory $FIGMA_FILE_KEY

# 2. 편집기 연결 확인(읽기만)
node bin/figma-run.mjs scripts/inventory.js --json cache/inventory.json

# 3. 계획: jobs/my-deck/PLAN.md (목표·독자, 장별 제목 문장, 배치 스케치)
mkdir -p jobs/my-deck && cp examples/PLAN.md jobs/my-deck/PLAN.md   # 고쳐 쓴다
#    구현 전에 장표를 요청한 사람과 계획을 맞추고 PLAN.md 에 적는다("합의: <누구>, <날짜>").

# 4. 구현: Codex 에 맡기거나 ...
bin/codex-task.sh "jobs/my-deck/PLAN.md 의 6장을 'Templates' 페이지 프레임을 복제해 만든다" my-deck
#    ... 스크립트를 직접 써서 돌린다(docs/plugin-api-tips.md):
#    node bin/figma-run.mjs scripts/my-deck/02-build.js

# 5. 검토: 형식(위반 0 까지 반복)과 논리
node bin/figma-run.mjs scripts/lint-format.js --arg frame=<슬라이드나 부모 id> --json jobs/my-deck/lint.json
bin/review-logic.sh my-deck $FIGMA_FILE_KEY <슬라이드id,슬라이드id,...>

# 6. PDF 하나로
node bin/figma-api.mjs export $FIGMA_FILE_KEY <슬라이드id,...> --format pdf --out exports/my-deck
bin/deck-pdf.sh exports/my-deck/*.pdf -o exports/my-deck.pdf   # 합본은 장별 폴더 밖에
```
Claude Code 에서는 "이 브리프로 Figma 에 제안서 6장 만들어" 라고만 해도 된다. 스킬이 계획부터 쓰게 하고 위 명령을 쓴다. 끝난 작업은 [examples/REPORT.md](examples/REPORT.md) 모양이 된다.

## 명령
명령 표와 레포 구조는 [README.md](README.md#commands) 와 같다. 전체 사용법은 `node bin/figma-api.mjs --help`, `node bin/figma-run.mjs --help`, 환경변수 전체는 [.env.example](.env.example). REST 내보내기가 한도(429)에 걸리면 `scripts/export-png.js` + `bin/save-pngs.mjs` 로 편집기 안에서 PNG 를 뽑는다.

## 안전
- 도구는 토큰을 출력하지 않는다. `.env` 는 git 에서 제외돼 있다.
- 스크립트는 **복제본**(`<job> NN · 제목`)만 고친다. 원본 프레임은 수정·이동·삭제하지 않는 것이 규칙이다.
- `codex-task.sh` 는 기본으로 Codex 를 `danger-full-access` 로 돌린다. `figma-run.mjs` 가 Aside 를 띄우고 레포 밖에 잠금·payload 파일을 써야 하기 때문이다. 바꾸려면 `CODEX_SANDBOX`.
- `review-logic.sh` 는 슬라이드 PNG 만 든 빈 임시 폴더에서 Codex 를 읽기 전용으로 돌린다. 검토자는 계획·스크립트를 볼 수 없다(본인의 전역 Codex 설정은 그대로 적용된다).

더 보기: [docs/method.ko.md](docs/method.ko.md)(방법론 원문) · [docs/plugin-api-tips.md](docs/plugin-api-tips.md) · [docs/troubleshooting.md](docs/troubleshooting.md)

## 라이선스
MIT
