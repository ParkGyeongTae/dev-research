---
sidebar_position: 2
---

# CLAUDE.md와 자동 메모리

> **원문** [How Claude remembers your project](https://code.claude.com/docs/en/memory) (code.claude.com/docs/en/memory)<br/>
> **확인 날짜** 2026-09-05 — 원문에 판번호도 최종 수정일 표기도 없습니다<br/>
> **검증 상태** 원문을 읽고 정리했고, 일부는 이 저장소에서 직접 확인했습니다(맨 아래 절).

같은 공식 문서군의 [Best practices](https://code.claude.com/docs/en/best-practices) 페이지에도 CLAUDE.md 절이 있지만 **요약본**입니다. 위치와 로드 순서, 크기 기준, `.claude/rules/`, 지시가 안 먹힐 때의 진단은 이 원문 페이지에만 있습니다.

## 두 가지 메커니즘

세션은 매번 빈 컨텍스트로 시작합니다. 그 간극을 메우는 장치가 둘입니다.

|  | CLAUDE.md | 자동 메모리 |
| --- | --- | --- |
| **쓰는 주체** | 사람 | Claude |
| **담기는 것** | 지시와 규칙 | 배운 것과 패턴 |
| **범위** | 프로젝트 · 사용자 · 조직 | 저장소별(워크트리 간 공유) |
| **로드** | 매 세션 | 매 세션 (앞 200줄 또는 25KB) |
| **쓰는 용도** | 코딩 표준, 워크플로, 아키텍처 | 내 선호, 내가 준 교정, 코드에서 못 뽑는 맥락 |

:::danger 이 페이지에서 가장 중요한 한 문장
> Claude treats them as **context, not enforced configuration.**

둘 다 **강제가 아니라 맥락**입니다. 무엇이 됐든 **반드시 막아야 한다면** CLAUDE.md에 세게 쓰는 게 아니라 [PreToolUse 훅](https://code.claude.com/docs/en/hooks-guide)을 씁니다.
:::

---

## CLAUDE.md에 언제 추가하나

원문이 제시하는 트리거는 네 가지입니다. **"매번 다시 설명하게 되는 것"을 적는 자리**라는 정의가 기준입니다.

- Claude가 **같은 실수를 두 번째로** 할 때
- 코드 리뷰가 **Claude가 알았어야 할 것**을 잡아냈을 때
- 지난 세션에 쳤던 **같은 교정을 또 치고 있을** 때
- 새 팀원이라면 **같은 맥락을 필요로 할** 때

반대로 **옮겨야 하는 것**도 명시돼 있습니다 — 여러 단계짜리 절차이거나 코드베이스의 일부에서만 의미가 있다면, CLAUDE.md가 아니라 **스킬**이나 **경로 한정 규칙**으로 갑니다.

## 어디에 두나 — 4계층

아래는 **로드 순서**이기도 합니다. 넓은 범위가 먼저 들어가고 좁은 범위가 나중에 들어갑니다.

| 범위 | 위치 | 공유 대상 |
| --- | --- | --- |
| **관리 정책** | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`<br/>Linux·WSL `/etc/claude-code/CLAUDE.md`<br/>Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | 조직 전체 |
| **사용자** | `~/.claude/CLAUDE.md` | 나 (모든 프로젝트) |
| **프로젝트** | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md` | 팀 (버전 관리) |
| **로컬** | `./CLAUDE.local.md` (`.gitignore` 대상) | 나 (현재 프로젝트) |

### 로드 규칙 — 덮어쓰기가 아닙니다

여기가 오해하기 쉬운 지점입니다.

- 작업 디렉터리와 **그 위 모든 디렉터리**의 `CLAUDE.md`·`CLAUDE.local.md`가 실행 시 로드됩니다
- 발견된 파일은 **서로를 덮어쓰지 않고 전부 이어붙습니다**
- 순서는 **파일시스템 루트 → 작업 디렉터리** 방향입니다. 즉 실행 위치에 가까운 지시가 **나중에** 읽힙니다
- 각 디렉터리 안에서는 `CLAUDE.local.md`가 `CLAUDE.md` **뒤에** 붙습니다
- 하위 디렉터리의 파일은 실행 시가 아니라 **Claude가 그 디렉터리 파일을 읽을 때** 들어옵니다

모노레포에서 남의 팀 `CLAUDE.md`가 딸려오면 `claudeMdExcludes` 설정으로 글로브 패턴을 지정해 뺍니다.

:::tip 토큰을 안 쓰는 메모
블록 단위 HTML 주석(`<!-- 유지보수 메모 -->`)은 **컨텍스트에 주입되기 전에 제거됩니다.** 사람용 메모를 토큰 소모 없이 남길 수 있습니다. 코드 블록 안의 주석은 그대로 유지되고, Read 도구로 파일을 직접 열면 주석도 보입니다.
:::

## 잘 쓰는 법 — 네 축

원문이 제시하는 축은 넷입니다.

**Size — 파일당 200줄 이내를 목표로.**
길수록 컨텍스트를 더 먹고 **준수율이 떨어집니다**. 커지면 경로 한정 규칙으로 쪼갭니다. `@` import로 나누는 건 **정리에는 도움이 되지만 컨텍스트는 안 줄어듭니다** — 가져온 파일도 실행 시 같이 로드되기 때문입니다. 4 MiB를 넘는 파일은 아예 로드하지 않습니다.

**Structure — 헤더와 불릿으로 묶습니다.**
> Claude scans structure the same way readers do.

**Specificity — 검증할 수 있을 만큼 구체적으로.**

| ❌ | ✅ |
| --- | --- |
| "Format code properly" | "Use 2-space indentation" |
| "Test your changes" | "Run `npm test` before committing" |
| "Keep files organized" | "API handlers live in `src/api/handlers/`" |

**Consistency — 규칙이 서로 모순되면 Claude가 아무거나 고릅니다.**
중첩된 하위 `CLAUDE.md`와 `.claude/rules/`까지 포함해 주기적으로 훑고 낡거나 충돌하는 지시를 지웁니다.

## 다른 파일 가져오기

`@path/to/import` 문법을 씁니다.

- 상대·절대 경로 모두 가능. **상대 경로는 작업 디렉터리가 아니라 그 파일 기준**으로 풀립니다
- 재귀 import 가능, **최대 4홉**
- 코드 스팬과 코드 블록 안은 파싱하지 않습니다 — 경로를 그냥 언급하려면 백틱으로 감쌉니다. `` `@README` ``는 문자 그대로, `@README`는 import
- 워크트리를 여러 개 쓰면 `.gitignore`된 `CLAUDE.local.md`는 만든 워크트리에만 있습니다. 홈 디렉터리 파일을 import하면 공유됩니다

:::warning 외부 import 승인
프로젝트 메모리 파일의 import가 작업 디렉터리 **밖으로** 풀리면 외부 import입니다. 처음 만나면 승인 다이얼로그가 뜨고, **거절하면 그 import는 비활성 상태로 남고 다이얼로그도 다시 안 뜹니다.**

남이 공유 프로젝트에 커밋한 파일로부터 사용자를 보호하려는 장치입니다. 사용자 스코프 파일(`~/.claude/CLAUDE.md` 등)은 본인이 쓴 것이라 다이얼로그 없이 로드됩니다.
:::

---

## AGENTS.md와의 관계

:::info 이 저장소가 쓰고 있는 방식입니다
> **Claude Code reads `CLAUDE.md`, not `AGENTS.md`.**

이미 `AGENTS.md`를 쓰고 있다면 두 방법이 있습니다.
:::

**방법 1 — import (Claude 전용 지침을 덧붙일 수 있음)**

```markdown title="CLAUDE.md"
@AGENTS.md

## Claude Code

Use plan mode for changes under `src/billing/`.
```

**방법 2 — 심볼릭 링크 (전용 지침이 필요 없을 때)**

```bash
ln -s AGENTS.md CLAUDE.md
```

성공하면 아무것도 출력하지 않습니다. 다음 세션에서 `/context`를 돌려 **Memory files**에 `CLAUDE.md`가 보이는지 확인합니다.

:::warning 심볼릭 링크의 두 가지 제약
- **Windows에서는 관리자 권한이나 개발자 모드가 필요합니다.** 팀에 Windows 사용자가 있으면 `@AGENTS.md` import 방식으로 가야 합니다
- **Claude 전용 내용을 덧붙일 수 없습니다.** 필요해지는 순간 import 방식으로 바꿔야 합니다
:::

`/init`은 Cursor 규칙(`.cursor/rules/`, `.cursorrules`)과 Copilot 규칙(`.github/copilot-instructions.md`)을 읽어 생성물에 반영합니다. `CLAUDE_CODE_NEW_INIT=1`을 켜면 `AGENTS.md`·`.devin/rules/`·`.windsurf/rules/`·`.clinerules`까지 읽습니다.

`/import` 명령은 다른 에이전트 설정을 일회성으로 복사해 오고 MCP 서버·명령·서브에이전트·스킬까지 옮깁니다(v2.1.213 이상).

## `.claude/rules/`로 쪼개기

파일이 커질 때의 공식 탈출구입니다.

```
your-project/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       └── security.md
```

`paths` 프런트매터를 붙이면 **매칭되는 파일을 다룰 때만** 로드됩니다.

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules
- All API endpoints must include input validation
```

- `paths`가 없는 규칙은 무조건 로드되고 우선순위는 `.claude/CLAUDE.md`와 같습니다
- 경로 한정 규칙은 **모든 도구 사용마다가 아니라 매칭되는 파일을 읽을 때** 걸립니다
- 중괄호 확장은 예산이 있습니다 — `paths` 목록 전체가 **확장 패턴 1,000개와 4 MiB**를 공유합니다
- `.claude/rules/`는 심볼릭 링크를 지원해 여러 프로젝트에서 공유할 수 있습니다
- `~/.claude/rules/`는 사용자 레벨. **프로젝트 규칙보다 먼저** 로드되므로 프로젝트 쪽이 우선입니다

:::note 규칙과 스킬의 분담
규칙은 **매 세션(또는 매칭 시)** 로드됩니다. 항상 컨텍스트에 있을 필요가 없는 작업 한정 지시는 **스킬**로 가야 합니다 — 스킬은 부를 때나 관련 있다고 판단될 때만 로드됩니다.
:::

## 조직 단위로 관리하기

관리 정책 위치에 `CLAUDE.md`를 배포하면 그 머신의 모든 세션·모든 저장소에 적용되고 **개인 설정으로 뺄 수 없습니다.** 별도 파일 대신 `managed-settings.json`의 `claudeMd` 키에 내용을 직접 넣어도 됩니다.

원문이 그은 분담선이 명확합니다.

| 관심사 | 어디에 |
| --- | --- |
| 도구·명령·경로 차단, 샌드박스 강제, 환경 변수, 로그인 제한 | **관리 설정** (클라이언트가 강제) |
| 코드 스타일, 데이터 취급·규정 준수 알림, 행동 지시 | **관리 CLAUDE.md** (강제 아님) |

---

## 자동 메모리

Claude가 스스로 쌓는 쪽입니다. 네 종류를 프런트매터의 `type` 필드로 구분합니다.

| type | 담는 것 |
| --- | --- |
| `user` | 내 역할, 전문성, 작업 선호 |
| `feedback` | 내가 준 교정, 확인된 접근 |
| `project` | 진행 중인 일, 마감, 코드·git 히스토리에서 못 뽑는 결정 |
| `reference` | 프로젝트 밖 정보의 위치 — 이슈 트래커, 대시보드 |

**코드베이스에서 유추 가능한 것**(아키텍처, 파일 경로, 디버깅 수정)과 **CLAUDE.md에 이미 있는 것**은 저장하지 않습니다.

### 저장 위치와 크기

프로젝트마다 `~/.claude/projects/<project>/memory/`를 갖습니다. `<project>`는 **git 저장소에서 파생**되므로 같은 저장소의 모든 워크트리·하위 디렉터리가 한 디렉터리를 공유합니다.

```
~/.claude/projects/<project>/memory/
├── MEMORY.md            # 색인. 매 세션 로드
├── user_role.md         # 개별 메모리
└── feedback_testing.md
```

- `MEMORY.md`의 **앞 200줄 또는 25KB 중 먼저 걸리는 쪽**까지만 세션 시작에 로드됩니다. 그 뒤는 안 들어갑니다
- 한도를 넘겨 쓰면 쓰기 자체는 성공하지만, 다음 로드에서 초과분이 버려지므로 **색인을 다시 쓰라는 에러**가 돌아옵니다
- 이 한도는 `MEMORY.md`에만 적용됩니다. **CLAUDE.md는 4 MiB까지 통째로 로드**하고 그보다 크면 건너뜁니다
- 개별 토픽 파일은 시작 시 로드되지 않고 **필요할 때 읽습니다**
- **머신 로컬**입니다. 다른 머신·클라우드 환경과 공유되지 않습니다
- 세션 기록 정리(`cleanupPeriodDays`) 대상에서 **제외**됩니다

메인 대화의 자동 메모리는 서브에이전트에 **상속되지 않습니다**(fork는 예외).

끄려면 `/memory`의 토글, 프로젝트 설정의 `autoMemoryEnabled: false`, 또는 환경 변수 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`을 씁니다.

---

## 지시가 안 먹힐 때 — 진단 순서

:::danger 근본 원인
> CLAUDE.md content is delivered as a **user message after the system prompt**, not as part of the system prompt itself.

읽고 따르려 하지만 **엄격한 준수가 보장되지 않습니다.** 모호하거나 충돌하는 지시일수록 그렇습니다.
:::

1. `/context`를 돌려 **Memory files** 목록에 파일이 있는지 확인합니다. 없으면 Claude는 아예 못 봅니다
2. 그 `CLAUDE.md`가 **로드되는 위치**에 있는지 확인합니다
3. 지시를 더 **구체적으로** 고칩니다
4. 파일들 사이의 **충돌**을 찾습니다
5. **특정 시점에 반드시 실행돼야 하는 것**이라면 지시가 아니라 **훅**으로 씁니다
6. 시스템 프롬프트 수준이 필요하면 `--append-system-prompt`를 씁니다(매 호출마다 넘겨야 해서 자동화용)

`InstructionsLoaded` 훅으로 **어떤 지시 파일이 언제 왜 로드됐는지** 로그를 남길 수 있습니다.

`/compact` 후에 지시가 사라진 것 같다면 — **프로젝트 루트 CLAUDE.md는 압축을 견딥니다.** 압축 후 디스크에서 다시 읽어 재주입됩니다. 사라졌다면 그건 대화 중에만 준 지시였거나, 아직 다시 로드되지 않은 중첩 파일·경로 한정 규칙입니다.

## 경계 — 한자리에 모으면

| 대상 | 경계 |
| --- | --- |
| CLAUDE.md 전체 | **강제가 아니라 맥락.** 준수 보장 없음 |
| 크기 | 200줄 목표. 넘으면 준수율 하락. **4 MiB 초과는 로드 안 함** |
| `@` import | 정리에는 좋지만 **컨텍스트는 안 줄어듦**. 최대 4홉 |
| 외부 import | 한 번 거절하면 **다이얼로그가 다시 안 뜸** |
| 심볼릭 링크 | Windows는 권한 필요. **Claude 전용 내용 추가 불가** |
| 관리 정책 CLAUDE.md | 개인 설정으로 **제외 불가** |
| 자동 메모리 | 머신 로컬. 서브에이전트에 상속 안 됨. `MEMORY.md`는 200줄/25KB에서 잘림 |

## 이 저장소에서 직접 확인한 것

원문 서술 중 이 저장소에서 실제로 확인한 것만 적습니다.

- **심볼릭 링크 방식이 동작합니다.** `CLAUDE.md -> AGENTS.md`로 걸려 있고, 링크 너머의 `AGENTS.md`가 세션 지침으로 로드되는 것을 확인했습니다
- **자동 메모리 디렉터리가 문서 서술대로 존재합니다.** 경로는 `~/.claude/projects/<프로젝트>/memory/`이고 `<프로젝트>` 이름이 **git 저장소 경로에서 파생**된 형태였습니다. 현재는 **비어 있습니다** — `MEMORY.md`도 토픽 파일도 아직 없습니다
- 이 저장소는 **프로젝트 스코프 하나만** 씁니다. `~/.claude/CLAUDE.md`와 `~/.claude/rules/`는 없습니다
- 현재 `AGENTS.md`는 **155줄**로 200줄 기준 안입니다
- 확인 환경: `claude --version` → **2.1.236 (Claude Code)**, macOS (Darwin 24.6.0)

## 읽고 든 판단

여기부터는 **원문에 있는 말이 아니라 정리하며 든 생각**입니다.

- **"맥락 vs 강제"가 이 페이지의 축이고, 대부분의 CLAUDE.md 실패가 이 혼동에서 옵니다.** `IMPORTANT`를 아무리 붙여도 강제가 되지 않습니다. 강제가 필요하면 훅, 관리 설정, `--allowedTools` 중 하나로 내려야 합니다.
- **`@` import가 컨텍스트를 안 줄인다는 게 반직관적입니다.** 파일을 쪼개면 가벼워질 것 같지만 실행 시 전부 로드됩니다. 실제로 줄이는 건 `paths` 프런트매터를 가진 경로 한정 규칙뿐입니다.
- **이 저장소는 아직 `.claude/rules/`를 쓸 이유가 없습니다.** `AGENTS.md` 155줄이면 여유가 있고, 규칙이 문서 종류별로 갈리지도 않습니다. 200줄에 가까워지면 그때 §2(주장 검증)와 §7(마무리 점검)을 규칙 파일로 빼는 게 자연스러운 첫 분할로 보입니다.

## 확인하지 못한 것

- `claudeMdExcludes`, `InstructionsLoaded` 훅, `--append-system-prompt`, `/doctor`의 트림 제안, `CLAUDE_CODE_NEW_INIT=1` — **전부 원문에서 읽었을 뿐 돌려보지 않았습니다**
- 200줄을 넘겼을 때 준수율이 실제로 얼마나 떨어지는지 — 원문에 수치가 없고 직접 재보지도 않았습니다
- 관리 정책 경로와 조직 배포 — 확인할 환경이 없습니다
- 자동 메모리가 실제로 무엇을 저장하는지 — **현재 비어 있어 관찰된 사례가 없습니다**
- 원문에 판번호·최종 수정일이 없어 **어느 버전 기준인지 알 수 없습니다.** 본문에 `v2.1.198`·`v2.1.206`·`v2.1.213` 같은 버전 조건이 흩어져 있는 것으로 보아 자주 갱신되는 페이지입니다

## 원문이 가리키는 관련 페이지

[Hooks](https://code.claude.com/docs/en/hooks-guide) · [Skills](https://code.claude.com/docs/en/skills) · [Settings](https://code.claude.com/docs/en/settings) · [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases) — 모두 2026-09-05 확인

---

*작성일: 2026-09-05*
