---
sidebar_position: 1
---

# AGENTS.md 오픈 포맷

> **원문** [AGENTS.md](https://agents.md/) (agents.md)<br/>
> **확인 날짜** 2026-09-05 — 사이트에 판번호도 최종 수정일 표기도 없습니다<br/>
> **검증 상태** 사이트 전문을 받아 정리했습니다. 사이트의 **주장**과 이 저장소에서 **확인한 것**을 구분해 표시했습니다.

## 무엇인가 — "포맷"보다는 "파일명 관례"에 가깝습니다

사이트의 자기 정의는 한 줄입니다.

> A simple, open format for guiding coding agents.
>
> Think of AGENTS.md as a **README for agents**.

README와 나누는 이유를 셋으로 듭니다 — 에이전트에게 **예측 가능한 자리**를 주고, README는 사람용으로 짧게 유지하고, 기존 문서를 보완한다는 것입니다. 새 독점 파일을 만드는 대신 **누구나 쓸 수 있는 이름과 형식**을 골랐다고 밝힙니다.

:::danger 이 사이트에서 가장 중요한 FAQ 한 줄
> **Are there required fields?** No. AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide.

필수 필드가 없다는 건 **검증할 수 있는 스펙이 아니라는 뜻**입니다. 린터도 스키마도 없고, "이 파일이 AGENTS.md 규격에 맞는가"를 기계로 물을 수 없습니다. 실제로 표준화된 것은 **파일 이름과 위치, 그리고 탐색 규칙**뿐입니다.
:::

## 표준화된 것은 사실상 셋입니다

### 1. 이름과 위치

저장소 루트의 `AGENTS.md`.

### 2. 중첩과 탐색

모노레포에서는 패키지마다 `AGENTS.md`를 둡니다. 사이트 서술입니다.

> Agents automatically read the nearest file in the directory tree, so the **closest one takes precedence**.

사이트는 예로 "at time of writing the main OpenAI repo has **88 AGENTS.md files**"를 듭니다. (사이트 자체 주장이고 시점 표기가 "at time of writing"뿐이라 이 문서에서 재확인하지 않았습니다.)

### 3. 충돌 해소

> The closest AGENTS.md to the edited file wins; **explicit user chat prompts override everything**.

:::warning 이 규칙은 Claude Code와 다릅니다 — 갈리는 지점입니다
agents.md는 **가장 가까운 파일이 이긴다(wins)** 고 씁니다. 덮어쓰기 모델입니다.

Claude Code의 `CLAUDE.md`는 그렇지 않습니다. 작업 디렉터리와 그 위 모든 디렉터리의 파일이 **서로를 덮어쓰지 않고 전부 이어붙습니다**(루트 → 작업 디렉터리 순) — [How Claude remembers your project](https://code.claude.com/docs/en/memory), 확인 2026-09-05.

**어느 쪽이 맞느냐가 아니라, 도구마다 다르다는 것이 답입니다.** agents.md는 필수 필드도 준수 검증도 없는 관례라서, 탐색·병합 방식은 결국 각 도구의 구현이 정합니다. 중첩 `AGENTS.md`를 쓸 거라면 **쓰는 도구의 문서로 병합 방식을 따로 확인해야 합니다.**
:::

## 무엇을 담나

사이트가 제시하는 "popular choices"는 다섯입니다. 규격이 아니라 **관행 목록**이라고 명시돼 있습니다.

- 프로젝트 개요
- 빌드·테스트 명령
- 코드 스타일 가이드라인
- 테스트 방법
- 보안 고려사항

여기에 "새 팀원에게 말해줄 것은 무엇이든" — 커밋 메시지·PR 가이드라인, 보안 함정, 대용량 데이터셋, 배포 절차를 덧붙이라고 합니다.

사이트의 최소 예시입니다.

```markdown title="AGENTS.md"
# AGENTS.md

## Setup commands
- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Run tests: `pnpm test`

## Code style
- TypeScript strict mode
- Single quotes, no semicolons
- Use functional patterns where possible
```

## 실패 모드 — 테스트 명령을 적으면 에이전트가 실제로 돌립니다

FAQ에 있는 문장이 이 페이지에서 가장 실무적인 경고입니다.

> **Will the agent run testing commands found in AGENTS.md automatically?**
> Yes—if you list them. The agent will attempt to execute relevant programmatic checks and fix failures before finishing the task.

즉 이 파일에 적은 명령은 **문서가 아니라 실행 대상**이 됩니다. 여기서 나오는 증상들입니다.

| 적은 것 | 일어나는 일 |
| --- | --- |
| 전체 테스트 스위트 명령 | 사소한 변경에도 전체 스위트를 돌려 시간과 컨텍스트를 태웁니다 |
| 배포·마이그레이션 스크립트 | 에이전트가 "관련 있는 프로그램적 검사"로 판단하면 시도할 수 있습니다 |
| 실패하는 것이 정상인 명령 | 에이전트가 "실패를 고치려" 엉뚱한 코드를 건드립니다 |

**적을 명령과 적지 말 명령을 구분해야 합니다.** 되돌릴 수 없는 명령은 이 파일에 두지 않는 편이 안전합니다.

## 마이그레이션 — 이 저장소가 쓰는 방식과 같습니다

기존 지침 파일이 있을 때 사이트가 권하는 방법입니다.

```bash
mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md
```

:::tip 이 저장소에서 확인한 것
이 저장소는 같은 구조를 반대 방향으로 쓰고 있습니다 — `AGENTS.md`가 실체이고 `CLAUDE.md`가 심볼릭 링크입니다.

```
lrwxr-xr-x  CLAUDE.md -> AGENTS.md
```

이 세션에서 링크 너머의 `AGENTS.md`가 지침으로 로드되는 것을 확인했습니다.

다만 심볼릭 링크에는 제약이 둘 있습니다 — **Windows에서는 관리자 권한이나 개발자 모드가 필요하고**, 링크로 묶은 이상 **도구 전용 내용을 덧붙일 수 없습니다.** 둘 다 Claude Code 공식 문서에 명시된 것입니다([How Claude remembers your project](https://code.claude.com/docs/en/memory), 확인 2026-09-05).
:::

도구별 설정도 FAQ에 있습니다.

| 도구 | 설정 |
| --- | --- |
| Aider | `.aider.conf.yml`에 `read: AGENTS.md` |
| Gemini CLI | `.gemini/settings.json`에 `"context": { "fileName": "AGENTS.md" }` |

**설정이 필요하다는 것 자체가 "한 파일이 모든 에이전트에 통한다"는 문구의 실제 범위를 보여줍니다.** 기본으로 읽는 도구도 있고, 설정해야 읽는 도구도 있고, 아예 다른 파일명을 쓰는 도구도 있습니다.

## 거버넌스와 채택 규모

- OpenAI Codex · Amp · Google Jules · Cursor · Factory의 협업에서 나왔습니다
- 현재 **Linux Foundation 산하 [Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/)** 이 관리합니다
- 사이트는 **"used by over 60k open-source projects"** 를 내겁니다

:::note 60k라는 숫자를 어떻게 다룰 것인가
이건 **사이트의 자체 주장**입니다. 집계 방법(파일명 검색인지, 실제로 유효한 내용인지, 포크를 어떻게 셌는지)이 공개돼 있지 않고 기준 시점도 없습니다. "널리 쓰인다"는 방향은 지원 도구 목록으로 뒷받침되지만, **60,000이라는 수치 자체는 이 문서에서 검증하지 못했습니다.**
:::

사이트가 나열하는 지원 도구는 확인 시점 기준 23개입니다 — OpenAI Codex, Google Jules, Factory, Aider, goose, opencode, Zed, Warp, VS Code, Cognition Devin, UiPath Autopilot & Coded Agents, JetBrains Junie, Amp, Cursor, RooCode, Google Gemini CLI, Kilo Code, Phoenix, Semgrep, GitHub Copilot coding agent, Ona, Cognition Windsurf, Augment Code.

**Claude Code는 이 목록에 없습니다.** Claude Code 공식 문서가 **"Claude Code reads `CLAUDE.md`, not `AGENTS.md`"** 라고 명시합니다. 연결하려면 `CLAUDE.md`에서 `@AGENTS.md`로 import하거나 `ln -s AGENTS.md CLAUDE.md`로 링크를 겁니다([How Claude remembers your project](https://code.claude.com/docs/en/memory), 확인 2026-09-05).

## 경계 — 이 포맷이 해주지 않는 것

| 대상 | 경계 |
| --- | --- |
| 포맷 검증 | **없습니다.** 필수 필드도 스키마도 린터도 없습니다 |
| 준수 보장 | 없습니다. 사이트 스스로 "사용자 채팅 프롬프트가 모든 것을 덮는다"고 씁니다 |
| 병합·탐색 방식 | 사이트는 "가장 가까운 것이 이긴다"고 하지만 **도구별 구현에 달렸습니다**(Claude Code는 이어붙임) |
| 도구 호환 | 목록의 23개도 **기본 동작이 아니라 설정이 필요한 경우**가 있습니다 |
| 명령 기재 | 적으면 **실제로 실행됩니다.** 문서가 아니라 실행 대상입니다 |
| 크기 기준 | **사이트에 없습니다.** 길이·지시 개수에 대한 권고가 전혀 없습니다 |

마지막 항목이 이 사이트의 가장 큰 공백입니다. 무엇을 담을지는 말하지만 **얼마나 담으면 망가지는지는 말하지 않습니다.** 길이 권고도, 지시 개수 한계도, 파일이 커졌을 때의 증상도 없습니다.

## 읽고 든 판단

여기부터는 **사이트에 있는 말이 아니라 정리하며 든 생각**입니다.

- **이 포맷의 값어치는 기술이 아니라 조율에 있습니다.** 기술적으로는 "루트에 마크다운 파일 하나"가 전부입니다. 실제로 얻는 건 도구를 바꿔도 파일을 다시 안 써도 된다는 것, 그리고 팀원끼리 "그건 AGENTS.md에 적어"로 말이 통한다는 것입니다.
- **필수 필드가 없다는 게 채택을 키우고 상호운용성을 깎았습니다.** 진입 장벽이 없으니 60k가 가능했겠지만, 대신 "AGENTS.md를 지원한다"가 도구마다 다른 것을 뜻하게 됐습니다. 지원 목록을 근거로 도구를 고를 때 이 점을 감안해야 합니다.
- **명령 자동 실행 FAQ가 이 사이트에서 가장 저평가된 문장입니다.** 나머지는 "무엇을 적을까"인데 저것만 "적으면 무슨 일이 일어나는가"입니다.

## 확인하지 못한 것

- **60k 프로젝트 채택** — 사이트 자체 주장이고 집계 방법·시점이 없습니다
- **OpenAI 저장소의 88개 파일** — "at time of writing" 표기뿐이라 재확인하지 않았습니다
- **지원 도구 23개가 각각 어떻게 읽는지** — 탐색 순서, 병합 방식, 크기 한도를 도구별로 확인하지 않았습니다. 사이트는 도구별 동작을 명시하지 않습니다
- **명령 자동 실행의 실제 범위** — 어떤 명령이 "relevant programmatic checks"로 판정되는지 기준이 사이트에 없고 직접 재현하지도 않았습니다
- 사이트에 **판번호도 최종 수정일도 없습니다.** 조용히 바뀔 수 있는 페이지이므로 위 인용은 전부 **2026-09-05 확인분**입니다

---

*작성일: 2026-09-05*
