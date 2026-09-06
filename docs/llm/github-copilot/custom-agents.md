---
sidebar_position: 1
---

# Copilot 커스텀 에이전트 — 2,500개 저장소에서 나온 패턴

> **원문** [How to write a great agents.md: Lessons from over 2,500 repositories](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) — Matt Nigh (GitHub Blog)<br/>
> **게시** 2025-11-19 · **최종 수정** 2025-11-25 · **확인 날짜** 2026-09-05<br/>
> **교차 확인** 프런트매터 필드와 한도는 공식 문서 [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) · [About custom agents](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents)로 확인했습니다 (확인 2026-09-05)<br/>
> **검증 상태** 원문과 공식 문서를 읽고 정리했습니다. **Copilot을 직접 쓰지 않았습니다.**

이 글이 다루는 것은 GitHub Copilot의 **커스텀 에이전트** 기능입니다. 원문 첫 문단이 정의합니다.

> We recently released a new GitHub Copilot feature: **custom agents defined in agents.md files.** Instead of one general assistant, you can now build a team of specialists: a @docs-agent for technical writing, a @test-agent for quality assurance, and a @security-agent for security analysis.

하나의 범용 어시스턴트 대신 **역할이 정해진 에이전트를 여러 개** 두고 이름으로 부르는 방식입니다. 파일 하나가 에이전트 하나를 정의합니다.

| | 내용 |
| --- | --- |
| 위치 | `.github/agents/<이름>.md` |
| 개수 | 에이전트마다 하나 |
| 담는 것 | 페르소나, 스택, 파일 구조, 실행 가능한 명령, 코드 예시, 경계 |
| 프런트매터 | 필수 (`description`) |
| 호출 | `@docs-agent`처럼 이름으로 |

## 이 글의 근거 — 그리고 근거의 한계

저자는 공개 저장소의 `agents.md` 파일 **2,500개 이상**을 분석했다고 밝힙니다. 저자는 GitHub의 프로그램 매니저 디렉터(AI for Everyone 담당)입니다.

:::warning 방법론이 공개되지 않았습니다
"2,500개 분석"은 이 글의 유일한 권위 근거인데, 확인할 수 없는 부분이 셋입니다.

1. **"성공"의 정의가 없습니다.** 원문은 "the ones that fail and the ones that work"로 나누지만 **무엇으로 판정했는지** 말하지 않습니다 — 작업 성공률인지, 별 수인지, 저자의 눈인지 알 수 없습니다
2. **데이터도 코드도 공개되지 않았습니다.** 재현할 수 없습니다
3. **상관과 인과가 구분되지 않았습니다.** "잘 되는 파일에 명령이 앞에 있다"가 사실이더라도, 명령을 앞에 둬서 잘 되는 것인지 **잘 관리되는 저장소가 그렇게 쓰는 것**인지는 이 글로 알 수 없습니다

권장 자체는 다른 자료들과 방향이 일치하고 상식적입니다. 다만 **"2,500개로 검증된 것"으로 인용하면 안 됩니다.**
:::

## 원문이 꼽는 다섯 가지

| 항목 | 내용 |
| --- | --- |
| **명령을 앞쪽에** | `npm test`, `pytest -v`처럼 **플래그까지 포함해** 초반 절에 둡니다. 도구 이름만 적지 않습니다 |
| **설명보다 코드 예시** | "실제 코드 한 조각이 스타일을 설명하는 세 문단을 이깁니다." 좋은 출력이 어떻게 생겼는지 보여줍니다 |
| **경계를 명시** | 절대 건드리면 안 되는 것 — 시크릿, vendor 디렉터리, 프로덕션 설정. **"Never commit secrets"가 가장 흔한 유용 제약**이었다고 합니다 |
| **스택을 구체적으로** | "React project"가 아니라 **"React 18 with TypeScript, Vite, and Tailwind CSS"**. 버전과 주요 의존성 포함 |
| **여섯 영역을 덮기** | 명령 · 테스트 · 프로젝트 구조 · 코드 스타일 · git 워크플로 · 경계 |

## `Boundaries` 절 — 이 글이 퍼뜨린 3단 패턴

이 글에서 가장 널리 인용되는 부분입니다.

```markdown
## Boundaries
- ✅ **Always do:** Write new files to `docs/`, follow the style examples, run markdownlint
- ⚠️ **Ask first:** Before modifying existing documents in a major way
- 🚫 **Never do:** Modify code in `src/`, edit config files, commit secrets
```

세 단계로 나누는 이유는 **파일 단위 작업과 위험 작업의 승인 비용이 다르기 때문**입니다. 단일 파일 린트나 특정 테스트 실행은 자동으로 두고, 패키지 설치·git push·인프라 변경은 승인을 받게 합니다.

:::note 이 경계는 권고이지 강제가 아닙니다
원문은 이 점을 말하지 않지만 중요합니다. 마크다운에 적은 "🚫 Never do"는 **모델에게 전달되는 지시**일 뿐입니다. 실제로 막으려면 도구 수준의 제한이 필요합니다 — Copilot이라면 프런트매터의 `tools` 목록, Claude Code라면 훅이나 `--allowedTools`입니다.

권고와 강제를 구분하지 않으면, 대문자로 쓸수록 안전해진다고 착각하게 됩니다. 실제로 안전해지는 건 도구 목록을 좁혔을 때뿐입니다.
:::

## 원문의 완성 예시

`.github/agents/docs-agent.md`:

```markdown title=".github/agents/docs-agent.md"
---
name: docs_agent
description: Expert technical writer for this project
---

You are an expert technical writer for this project.

## Your role
- You are fluent in Markdown and can read TypeScript code
- You write for a developer audience, focusing on clarity and practical examples
- Your task: read code from `src/` and generate or update documentation in `docs/`

## Project knowledge
- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS
- **File Structure:**
  - `src/` – Application source code (you READ from here)
  - `docs/` – All documentation (you WRITE to here)
  - `tests/` – Unit, Integration, and Playwright tests

## Commands you can use
Build docs: `npm run docs:build` (checks for broken links)
Lint markdown: `npx markdownlint docs/` (validates your work)

## Boundaries
- ✅ **Always do:** Write new files to `docs/`, follow the style examples, run markdownlint
- ⚠️ **Ask first:** Before modifying existing documents in a major way
- 🚫 **Never do:** Modify code in `src/`, edit config files, commit secrets
```

원문이 이 예시를 좋다고 보는 이유 — 역할이 명확하고, **실행 가능한 명령**을 쥐여주고(그래서 스스로 검증할 수 있고), 스택을 버전까지 적었고, 3단 경계가 있습니다.

**"명령이 스스로 검증할 수단"이라는 점이 이 예시의 핵심입니다.** `docs:build`는 깨진 링크를 잡고 `markdownlint`는 형식을 잡습니다 — 에이전트가 자기 출력을 검사할 고리가 생깁니다. 이건 Claude Code 공식 문서의 1번 권장("검증 수단을 먼저 쥐여준다")과 같은 이야기입니다.

## 공식 문서로 확인한 것 — 원문에 없는 사양

원문은 프런트매터를 `name`·`description`만 보여주는데, 공식 레퍼런스에는 더 있습니다.

| 필드 | 의미 |
| --- | --- |
| `description` | 에이전트의 목적과 능력. **필수** |
| `name` | 표시 이름 (선택) |
| `target` | 실행 환경 — `vscode` 또는 `github-copilot`. 기본은 둘 다 |
| `tools` | 이 에이전트가 쓸 수 있는 도구 목록 |
| `model` | 실행할 모델 |
| `disable-model-invocation` | 자동 선택 차단. 기본 `false` |
| `user-invocable` | 수동 선택 허용. 기본 `true` |
| `mcp-servers` | 추가 MCP 서버 (GitHub.com 전용) |
| `metadata` | 이름-값 주석 (GitHub.com 전용) |
| `infer` | **폐기됨.** `disable-model-invocation`·`user-invocable`로 대체 |

한도와 우선순위도 공식 문서에만 있습니다.

- **프런트매터 아래 본문은 최대 30,000자**입니다
- 이름이 충돌하면 **낮은 계층이 이깁니다** — 저장소 > 조직 > 엔터프라이즈
- 중복 제거는 **파일명 기준**입니다(`.md`·`.agent.md` 확장자 제외)

`user-invocable: false`로 두면 사람이 고를 수 없고 **프로그램적으로만** 불립니다. `disable-model-invocation: true`면 자동 선택에서 빠집니다 — 부작용이 있는 워크플로를 수동 전용으로 만드는 용도로, Claude Code 스킬의 같은 이름 필드와 같은 목적입니다.

## 첫 에이전트 — 원문의 절차

> Pick one simple task. **Don't build a "general helper."**

시작에 필요한 건 셋뿐이라고 합니다.

1. **이름** — `test-agent`, `docs-agent`, `lint-agent`
2. **설명** — "Writes unit tests for TypeScript functions"
3. **페르소나** — "You are a quality software engineer who writes comprehensive tests"

## 만들 값어치가 있는 에이전트

원문은 여섯을 제안한다고 쓰지만 **본문에는 다섯 개만 있습니다**(`@docs-agent`, `@test-agent`, `@lint-agent`, `@api-agent`, `@dev-deploy-agent`). 도입부에 언급된 `@security-agent`는 별도 절이 없습니다.

| 에이전트 | 하는 일 | 경계 |
| --- | --- | --- |
| `@docs-agent` | 코드에서 문서 생성 | `docs/`에만 쓰기, 소스 수정 금지 |
| `@test-agent` | 단위·통합·엣지 케이스 테스트 | `tests/`에만 쓰기, **실패하는 테스트를 지우지 말 것** |
| `@lint-agent` | 포맷·import 순서·명명 규칙 | 스타일만, **로직 변경 금지** |
| `@api-agent` | REST 엔드포인트·GraphQL 리졸버 | 라우트는 수정 가능, **스키마 변경은 먼저 물을 것** |
| `@dev-deploy-agent` | 로컬·dev 빌드, Docker 이미지 | **dev 환경에만**, 위험한 건 승인 필요 |

:::tip 가장 값어치 있는 경계 한 줄
`@test-agent`의 것입니다.

> it can write to tests but should **never remove a test because it is failing and cannot be fixed by the agent.**

에이전트에게 테스트를 맡길 때의 대표적 실패 모드입니다 — 못 고치는 테스트를 지워서 "통과"를 만듭니다. 이 경계가 없으면 검증 수단 자체가 무력화됩니다.
:::

`@lint-agent`를 초기에 권하는 근거도 명확합니다 — **린터는 애초에 안전하게 설계돼 있어서** 위험이 낮습니다.

## 원문의 결론

> Start simple. Test it. **Add detail when your agent makes mistakes.** The best agent files grow through **iteration, not upfront planning.**

**미리 설계하지 말고 실패할 때마다 붙이라**는 것이 이 글의 마지막 권장입니다. 앞서 나온 3단 경계도, 여섯 영역도 처음부터 다 채우라는 뜻이 아닙니다.

## 읽고 든 판단

여기부터는 **원문에 있는 말이 아니라 정리하며 든 생각**입니다.

- **크기 권고가 없는 게 눈에 띕니다.** 지침 파일을 다루는 글은 대개 "짧게"를 말하는데 이 글은 하지 않습니다. 페르소나 파일은 **항상 로드되는 게 아니라 호출될 때만** 들어오기 때문으로 보입니다(**추측:** 원문에 근거 없음). 그렇다면 상시 로드되는 파일의 길이 기준을 여기에 그대로 적용할 이유는 없습니다.
- **"명령을 쥐여주는 것"이 이 글에서 가장 실질적인 권장입니다.** 나머지(페르소나, 스택, 경계)는 무엇을 쓸지에 대한 것인데, `docs:build`와 `markdownlint`만이 에이전트가 **자기 출력을 검사할 고리**를 만듭니다. 검사가 없으면 페르소나를 아무리 잘 써도 "다 된 것 같다"에서 멈춥니다.
- **경계를 세 단계로 나눈 것이 두 단계보다 나은 이유는 승인 비용입니다.** 전부 금지하면 에이전트가 아무것도 못 하고, 전부 허용하면 사람이 계속 지켜봐야 합니다. "먼저 물어라"가 있어야 위험한 것만 사람에게 옵니다.

## 확인하지 못한 것

- **Copilot 커스텀 에이전트를 실제로 만들어 보지 않았습니다.** 프런트매터 필드·한도·우선순위는 전부 **공식 문서에서 읽은 것**입니다
- **2,500개 분석의 어떤 부분도 재현하지 않았습니다**
- `@docs-agent` 같은 호출 문법이 어느 인터페이스(웹·VS Code·CLI)에서 어떻게 동작하는지 — 원문이 명시하지 않고 확인하지 않았습니다
- 원문은 게시일과 수정일을 밝히지만 **어느 Copilot 버전 기준인지는 없습니다.** 게시가 2025-11이라 **9개월 이상 지난 글**이고, 그 사이 `infer` 필드가 폐기된 것처럼 사양이 움직였습니다

---

*작성일: 2026-09-06*
