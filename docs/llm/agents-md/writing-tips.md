---
sidebar_position: 2
---

# AGENTS.md 작성 실무 팁

> **원문** [How to Write an AGENTS.md That Actually Works](https://hboon.com/how-to-write-an-agents-md-that-actually-works/) — Hwee-Boon Yar<br/>
> **게시** 2026-03-29 · **최종 수정** 2026-06-13 · **확인 날짜** 2026-09-05<br/>
> **검증 상태** 원문을 읽고 정리했습니다. 직접 돌려보지 않았습니다.

:::danger 출처 순위를 먼저 밝힙니다
이 문서의 근거는 **개인 블로그 하나**입니다. 이 저장소의 출처 우선순위에서 가장 낮은 등급입니다.

- **측정치가 없습니다.** "절반쯤 npm으로 간다", "절반쯤 스킬을 무시한다" 같은 표현이 나오지만 시행 횟수도 조건도 없습니다. **인상이지 데이터가 아닙니다**
- **저자에게 이해관계가 있습니다.** 저자는 AGENTS.md를 포함해 파는 SaaS 스타터 킷(Stacknaut)을 홍보하며 글을 맺습니다
- **표본이 한 사람의 프로젝트군입니다.** Vue/Fastify/Drizzle 모노레포 중심이고, Droid·Claude Code·Codex를 씁니다

그럼에도 정리해 둘 값어치가 있는 이유는 **공식 문서에 없는 것 두 가지**가 있기 때문입니다 — (1) "무엇이 안 통했는가"를 따로 적은 절, (2) 규칙을 **반응적으로 쌓는 절차**. 아래는 그 전제를 달고 읽어야 합니다.
:::

## 저자의 조건

- AGENTS.md를 **1년 넘게** 모든 프로젝트에서 유지했습니다
- **Droid · Claude Code · Codex**가 **같은 파일 하나**를 읽게 씁니다
- 이 글은 "내 작성 과정"을 다룬 이전 글의 후속이고, **무엇이 행동을 바꾸고 무엇이 안 바꾸는가**에 초점을 둡니다

## 1. 치명적 규칙을 맨 위에

```markdown
## Critical Rules
- Never generate database migrations unless explicitly told
- Never commit without running prettier on changed files first
- Never modify files under reference/ or screenshots/
```

저자의 근거는 **모든 규칙이 실제 사고에서 나왔다**는 것입니다 — 에이전트가 묻지 않고 Drizzle 마이그레이션을 돌린 적이 있고, 규칙을 넣은 뒤로 다시 일어나지 않았다고 씁니다.

:::warning 위치가 가중치를 갖는다는 주장은 근거가 없습니다
저자의 전제는 이것입니다.

> The agent reads your file top to bottom, and **earlier lines carry more weight in practice**.

**추측:** 자기 관찰에서 나온 경험칙으로 보입니다. 근거가 붙어 있지 않고, 벤더 공식 문서에서 "앞줄이 더 무겁다"는 서술을 찾지 못했습니다. Claude Code 공식 문서가 강조에 대해 말하는 것은 위치가 아니라 **선별**입니다 — 한 줄만 `IMPORTANT`로 표시하면 통하지만 여러 줄을 강조하면 아무것도 안 두드러진다는 것([베스트 프랙티스](../claude-code/best-practices.md)).

중요한 것을 위에 두는 게 **손해는 아니므로** 따라도 됩니다. 다만 **"위에 뒀으니 지켜질 것"으로 믿으면 안 됩니다.** 반드시 막아야 하는 것은 위치가 아니라 훅으로 내려야 합니다.
:::

## 2. 명령은 가장 신호가 센 절

> Agents guess wrong constantly about how to run tests, which package manager to use, how to build.

```markdown
## Commands
- Package manager: `pnpm` (not npm, not yarn)
- Dev server: `pnpm run dev`
- Type check: `pnpm run type-check`
- Lint: `pnpm run lint`
- Tests: `pnpm run test`
- Deploy: `scripts/push-and-deploy.sh`
```

핵심은 괄호 안입니다 — **"(not npm, not yarn)"**. 저자는 이 부정 표현이 없으면 에이전트가 절반쯤 npm으로 간다고 씁니다(측정치 아님).

## 3. 아키텍처는 10줄 이내

> The agent doesn't need a detailed architecture document. It needs to know **where things are and how they connect**.

```markdown
## Architecture
Monorepo with three packages:
- frontend/ — Vue 3 SPA
- backend/ — Fastify API server
- shared/ — shared types and schemas, keep flat

Path alias: `@` resolves to `src/` in both frontend and backend.
Database: PostgreSQL via Drizzle ORM. Edit schemas in shared/src/schemas/, not .sql files.
```

"그 정도면 충분하다. 더 필요하면 에이전트가 실제 파일을 읽는다."

## 4. 코딩 규약은 **구체적일 때만** 행동을 바꿉니다

> Vague instructions like "write clean code" or "follow best practices" **do nothing**. The agent already tries to write reasonable code.

```markdown
## Code Style
- Function declarations for top-level functions (not arrow functions)
- Always use curly braces for if/else/for/while, even one-liners
- Prefer const over let; use ternary instead of reassignment
- No comments unless the code is genuinely non-obvious
- Object parameters for functions with more than 2 arguments
```

각 항목이 **저자가 실제로 겪은 특정 패턴 하나씩**을 막습니다. 중괄호 규칙이 없으면 절반쯤 한 줄짜리 무중괄호가 나오고, 화살표 함수 규칙이 없으면 코드베이스에 스타일이 섞인다고 씁니다.

:::note 이 항목은 다른 자료와 갈립니다
Tembo는 정반대로 **코드 스타일 규칙을 이 파일에 쓰지 말고 린터에 맡기라**고 합니다 — 지시 예산을 스타일에 태우지 말라는 논리입니다([CLAUDE.md 튜닝](../claude-code/claude-md-tuning.md)).

**어느 쪽이 맞는지는 린터가 그 규칙을 강제할 수 있는지에 달렸습니다.** `prettier`가 잡는 중괄호·따옴표·들여쓰기는 린터 몫입니다. 반면 "인자 3개 이상이면 객체 파라미터", "최상위는 함수 선언문" 같은 것은 규칙을 따로 만들지 않는 한 린터가 못 잡습니다 — 그건 이 파일에 남을 값어치가 있습니다.

기준 한 줄: **린터가 잡아줄 수 있으면 린터로, 아니면 파일로.**
:::

## 5. 원하지 않는 것을 말하라

> Negative instructions are often **more effective** than positive ones.

```markdown
- Don't use axios — use fetch
- Don't create new directories without asking
- Don't add try/catch blocks unless the error is actually handled
- Don't install new dependencies without asking
```

저자의 절차가 여기서 드러납니다 — **반응적으로 추가합니다.** 마음에 안 드는 일이 생길 때마다 부정 규칙을 하나 넣고, 몇 주가 지나면 파일이 그 프로젝트에 딱 필요한 가드레일만 쌓게 됩니다.

이건 Claude Code 공식 문서의 트리거("Claude가 같은 실수를 **두 번째로** 할 때 적는다")와 같은 방향입니다.

## 6. 커밋 스타일은 적을 값어치가 있습니다

지시가 없으면 에이전트는 "Updated auth module to handle edge case where user session expires during OAuth flow." 같은 문단짜리 메시지를 씁니다.

```markdown
## Git
- Atomic commits, one logical change per commit
- Single-line commit messages, lowercase, no period
- Format: "add login page" not "Added login page functionality"
```

## 7. 설명을 빼고 지시를 써라

> The agent doesn't need to know **why** you chose Vue over React.

| ❌ 나쁜 예 | ✅ 좋은 예 |
| --- | --- |
| "Vue 3를 고른 건 Composition API가 Options API보다 TypeScript 지원이 낫고 반응성이 Proxy 기반이라 세밀한 추적이…" | `Vue 3 with Composition API`, `Use composables for shared logic (src/composables/)`, `No Options API` |

저자는 이유를 아예 버리라는 게 아니라 **자리를 옮기라**고 합니다 — 근거는 개발 중의 스펙과 프롬프트에 두고, AGENTS.md는 **상시 지시(standing instructions)** 만 담으라는 것입니다.

:::warning 이 항목은 이 저장소의 `AGENTS.md`와 정면으로 충돌합니다
이 저장소의 `AGENTS.md`는 §2·§3에서 판단의 **근거**를 계속 요구하고, 왜 그렇게 하는지를 문장으로 적어 둡니다. 저자 기준으로는 낭비입니다.

**둘 다 맞습니다. 파일의 독자가 다르기 때문입니다.**

| | 저자의 AGENTS.md | 이 저장소의 AGENTS.md |
| --- | --- | --- |
| 독자 | 에이전트만 | 에이전트 **와** 저장소 주인 |
| 성격 | 실행 지시서 | 지시서 + 문서 구조의 마스터 |
| 근거를 적는 이유 | 없음(출력이 안 바뀜) | 사람이 나중에 기준을 다시 판정해야 함 |

**"왜"를 뺄지 말지는 그 파일을 사람이 읽는지에 달렸습니다.** 사람이 안 읽는 파일이라면 저자 말이 맞습니다.
:::

## 8. 환경과 도구 맥락

코드에는 없지만 작업 방식을 바꾸는 것들입니다.

```markdown
## Environment
- Dev servers auto-reload — don't restart them after changes
- tmux session "main": window 0 = editor, window 1 = agent, window 2 = dev servers
```

auto-reload 줄이 없으면 에이전트가 파일을 고칠 때마다 개발 서버를 재시작하려 든다고 씁니다.

## 9. 스킬 트리거에는 힌트가 필요합니다

```markdown
## Skills
- "commit" → use the commit-succinct skill
- "review" → use the review-dirty skill
- "take over" → use the take-over-finish skill
```

힌트가 없으면 절반쯤 스킬을 무시하고 맨손으로 작업한다고 씁니다(측정치 아님). 스킬 이름이 `commit`·`review`처럼 **흔한 트리거 단어**일 때 특히 그렇다는 관찰입니다.

## 10. 짧게 유지하라

> I aim for **under 150 lines**. If a section grows past **20 lines**, I consider extracting it into a skill.

- 한 달 동안 쓰인 적 없는 규칙은 지웁니다
- 문제를 실제로 막고 있지 않거나 출력을 개선하지 않는 줄은 자릅니다

:::note 크기 기준이 자료마다 다릅니다 — 셋 다 근거가 없습니다
| 자료 | 기준 | 근거 |
| --- | --- | --- |
| 이 글 | 150줄 이하, 절 하나 20줄 초과 시 분리 | 저자 경험칙 |
| Claude Code 공식 | 파일당 200줄 목표 | 수치 근거 없음 |
| Tembo | 500줄 넘으면 리팩터링, 지시 200개 한계 | 출처 미표기 |

**세 숫자 모두 측정 결과가 아닙니다.** 숫자를 외우기보다 공식 문서의 **증상 기준**을 쓰는 게 낫습니다 — 규칙이 있는데도 계속 어긴다면 파일이 너무 긴 것입니다.

참고로 이 저장소의 `AGENTS.md`는 **149줄**로 셋 중 가장 빡빡한 기준 안에 있습니다.
:::

## 11. Reflect 루프

세션 끝에 에이전트에게 "배운 걸 정리하고 AGENTS.md 수정안을 내라"고 시킵니다. `API routes follow the pattern routes/{resource}/index.ts` 같은 항목이 나오고, 저자는 **골라서 넣고 나머지는 버립니다.**

**사람이 고르는 단계가 이 절차의 핵심입니다.** 자동 반영이 아닙니다.

## 안 통한 것 — 이 글에서 가장 값어치 있는 절

원문의 "What Doesn't Work"입니다. 벤더 문서에 없는 종류의 정보입니다.

| 시도 | 왜 안 됐나 |
| --- | --- |
| **긴 아키텍처 설명** | 에이전트는 필요하면 파일을 직접 읽습니다. 간단한 지도면 충분 |
| **팀 문서에서 복사한 스타일 가이드** | 너무 장황하고 줄당 신호가 낮습니다. 실제로 중요한 5~10개만 뽑을 것 |
| **조건부 지시** ("TypeScript면 X, JavaScript면 Y") | 에이전트는 **무조건문**에서 더 잘 동작합니다. 하나를 골라 단정할 것 |
| **강제하지 않는 희망 규칙** | 코드베이스의 실상과 안 맞는 지시는 **에이전트가 무시하는 법을 배웁니다** |

마지막 항목이 특히 중요합니다. 지키지 않는 규칙을 적어 두면 **그 규칙 하나만 무시되는 게 아니라 파일 전체의 신뢰도가 깎인다**는 주장입니다.

## 한 파일, 여러 에이전트

저자는 `CLAUDE.md`를 **한 줄짜리 포인터**로 둡니다.

```markdown title="CLAUDE.md"
@AGENTS.md
```

근거가 명확합니다 — **"The instructions are about the project, not the agent."** `pnpm을 써라`는 어느 에이전트가 실행하든 같습니다.

이 저장소는 같은 목적을 **심볼릭 링크**로 달성하고 있습니다. 두 방식의 차이(Windows 권한, 도구 전용 내용 추가 가능 여부)는 [CLAUDE.md와 자동 메모리](../claude-code/memory.md)에 정리돼 있습니다.

## 확인하지 못한 것

- **이 글의 모든 효과 주장** — "절반쯤 npm으로 간다", "절반쯤 스킬을 무시한다", "부정 지시가 더 효과적이다"는 전부 **저자의 인상**이고 이 저장소에서 재현하지 않았습니다
- **앞줄이 더 무겁다는 전제** — 근거가 없고 벤더 문서에서 대응 서술을 찾지 못했습니다
- **150줄·20줄 기준** — 측정 근거가 없습니다
- **Droid에서의 동작** — 이 저장소에서 쓰지 않는 도구입니다
- 원문은 게시일과 수정일을 밝히지만 **어느 에이전트 버전 기준인지는 없습니다.** 위 인용은 **2026-09-05 확인분**입니다

## 참고

- 원문: [How to Write an AGENTS.md That Actually Works](https://hboon.com/how-to-write-an-agents-md-that-actually-works/) — 2026-03-29 게시, 2026-06-13 수정, 확인 2026-09-05
- 같은 폴더: [AGENTS.md 오픈 포맷](./spec.md)
- 갈리는 지점 대조: [CLAUDE.md 튜닝](../claude-code/claude-md-tuning.md) · [Claude Code 베스트 프랙티스](../claude-code/best-practices.md)

---

*작성일: 2026-09-05*
