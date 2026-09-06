---
sidebar_position: 4
---

# AI-Native SDLC 플레이북 — 아티팩트 여섯 개로 SDLC를 다시 짜기

> **원문** [The AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) (claude.com/blog/the-ai-native-sdlc-playbook) — Louis Claxton, Anthropic Applied AI<br/>
> **게시** 2026-08-21 · **확인 날짜** 2026-09-06 — 원문에 최종 수정일 표기는 없습니다<br/>
> **검증 상태** 원문을 읽고 정리했고, **원문의 주장 중 Claude Code 동작에 관한 것은 공식 문서와 대조했습니다**(§7). 조직에 적용해 본 기록은 아닙니다.<br/>
> **확인 환경** `claude --version` → **2.1.236 (Claude Code)**, macOS 15.7.4 (Darwin 24.6.0)

:::danger 출처의 성격을 먼저 밝힙니다
이것은 **Anthropic의 제품 블로그**입니다. Claude를 SDLC 전 단계에 넣자는 글을 Claude를 파는 회사가 썼습니다. 이 저장소의 출처 우선순위에서 벤더 블로그는 공식 문서보다 아래이므로, **이 글 자체를 근거로 삼지 않습니다.**

그럼에도 정리해 둘 값어치가 있는 이유는 둘입니다.

1. 흔한 벤더 글과 달리 **경계와 실패 모드를 꽤 많이 밝힙니다**(§6). 오히려 거기가 옮길 값어치가 있는 부분입니다.
2. **여기서 제안하는 파일 규약과 Claude Code가 실제로 읽는 파일이 다릅니다.** 그 구분을 안 하면 "설정하면 되는 것"으로 오해합니다 — §2가 이 문서의 핵심입니다.
:::

---

## 1. 이 글의 주장 하나

전제는 한 문장입니다 — **"code is no longer the bottleneck"**.

논리는 이렇습니다. 에이전트가 빌드 단계를 시간 단위로 줄이면, 그 앞뒤에 붙어 있던 **사람 속도의 단계들**(기획·설계·리뷰·테스트·배포)이 병목으로 드러납니다. 원문이 명시하는 결과는 리뷰 쪽에서 가장 날카롭습니다.

> "When agents multiply code output, either the review queue builds or code ships under-reviewed. A regulated organization can't accept either outcome."

그래서 처방이 "코딩을 더 빨리"가 아니라 **SDLC를 루프로 다시 짜고 각 지점에 AI를 박아 넣기**가 됩니다 — 원문 표현으로 "a loop, and AI is embedded at each point".

이 진단 자체는 데이터 엔지니어에게 낯설지 않습니다. 처리량을 늘리면 병목이 옮겨갈 뿐이라는 것, 그리고 **옮겨간 병목이 대개 사람이 검수하는 지점**이라는 것은 파이프라인에서 반복해 겪는 구조입니다.

## 2. 가장 먼저 구분해야 할 것 — 어느 파일이 "기능"이고 어느 파일이 "규약"인가

원문은 여섯 개의 아티팩트를 축으로 삼습니다.

```
intent.md → spec.md → plan.md → 코드 diff + 테스트 → 리뷰 결과가 붙은 PR → 인시던트 기록
```

> "Every stage commits an artifact the next stage can read. Together, the intent, the spec, the plan, the diff and the review findings are the audit trail."

**여기서 오해가 생깁니다.** 이 이름들이 Claude Code가 알아서 읽는 파일처럼 읽히기 때문입니다. 아닙니다.

| 원문에 나오는 것 | 도구가 실제로 아는가 | 근거 |
| --- | --- | --- |
| `CLAUDE.md` | **압니다.** 세션 시작 시 자동 로드 | [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) (확인: 2026-09-06) |
| `.claude/skills/<이름>/` | **압니다.** `SKILL.md`의 `description`으로 자동 발동 | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) (확인: 2026-09-06) |
| 훅, 관리 설정(managed settings) | **압니다.** 설정 파일로 강제 | [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings) (확인: 2026-09-06) |
| `intent.md` · `spec.md` · `plan.md` · `REVIEW.md` | **모릅니다.** 이 글이 제안하는 **파일 이름 규약**입니다 | 공식 문서에서 이 파일명을 찾지 못했습니다 |

즉 이 플레이북의 절반은 **제품 기능이 아니라 조직이 스스로 지켜야 하는 관례**입니다. `intent.md`를 만들어 둔다고 다음 단계가 자동으로 읽지 않습니다 — 사람이 그 파일을 세션에 넣어 주거나, `CLAUDE.md`·스킬에 "이 경로의 파일을 먼저 읽어라"고 적어야 동작합니다.

**이 구분을 놓치면 도입 계획이 통째로 틀어집니다.** "파일 규약만 정하면 되는 일"과 "훅·관리 설정으로 강제해야 하는 일"의 비용이 완전히 다르기 때문입니다.

## 3. 여섯 단계 — 무엇을 커밋하고 무엇을 재는가

| 단계 | 만드는 아티팩트 | 쓰는 Claude Code 장치 | 선행 지표 |
| --- | --- | --- | --- |
| **1. Plan** | `intent.md` | (claude.ai / Cowork) | 대화에서 `intent.md` 커밋까지 걸린 시간 |
| **2. Design** | `spec.md` | 조직 스킬(브랜드·보안·컴플라이언스·UX) | `intent.md`와 `spec.md` 커밋 간격 |
| **3. Build** | `plan.md` + 코드 | plan mode, `CLAUDE.md`, 스킬, 병렬 세션·서브에이전트 | 첫 구현 패스에서 머지된 변경의 비율 |
| **4. Test** | 테스트 + eval | 단일 명령 검사, CI eval | CI 1차 통과율 |
| **5. Deploy** | 리뷰 결과가 붙은 PR | PR 리뷰, 승인 게이트 훅, 비대화형 CI 실행 | 첫 리뷰까지의 시간 |
| **6. Maintain** | 인시던트 기록 → 다시 `intent.md` | 관제 밴드 스크립트, Claude Security, Claude Tag | 지표 이탈부터 트리아지 큐 진입까지의 시간 |

각 단계에서 옮길 값어치가 있는 것만 추립니다.

### 2단계 — 정책을 리뷰가 아니라 작성 시점에 적용한다

원문의 문장이 정확합니다.

> "Policy is applied while the spec is written, not discovered in a review weeks later."

브랜드·보안·컴플라이언스·UX 정책을 **스킬로 써 두면** 스펙을 쓰는 세션에서 그 정책이 이미 적용됩니다. 리뷰에서 뒤늦게 발견되는 구조를 앞으로 당기는 것입니다.

다만 원문 스스로 스킬의 성격을 못 박습니다 — **"A skill is a control, though an advisory one."** 권고지 강제가 아닙니다. 이 구분은 §5에서 다시 나옵니다.

### 3단계 — `CLAUDE.md`에 무엇을 넣을지의 기준

원문이 제시하는 규칙 한 줄이 실무적으로 가장 쓸 만합니다.

> "When Claude makes a mistake twice, the correction goes into `CLAUDE.md`."

그리고 반대 방향도 같이 있습니다 — **"Anything stale is taking up context for no benefit"**. 넣는 기준과 빼는 기준이 짝으로 있어야 파일이 안 붓습니다.

병렬 세션에 대해서는 상한을 분명히 합니다.

> "The practical ceiling is how many streams one person can review properly, so add sessions only while review is keeping up."

> "Two or three sessions is a sensible starting point."

**병목이 "몇 개를 띄울 수 있나"가 아니라 "몇 개를 제대로 리뷰할 수 있나"라는 것** — 이게 §1의 진단과 같은 논리입니다. 병렬화가 리뷰 큐로 병목을 옮길 뿐이라면 늘리는 의미가 없습니다.

### 4단계 — 검증을 세션 안에 넣는다

> "Every session checks its own work before a human sees it."

실행 항목은 넷입니다. 검사를 `make test`·`npm test` 같은 **한 명령으로 묶고**, 정상 출력이 어떤 모양인지 `CLAUDE.md`에 적고, 버그 수정은 **실패하는 테스트를 먼저** 쓰고, UI 작업은 브라우저·스크린샷 도구를 준다.

세 번째에 붙은 제약이 중요합니다.

> "An agent fixing code must not be able to weaken the check on that code."

테스트를 에이전트의 편집 대상에서 빼 두라는 것입니다. **에이전트에게 검증 수단을 주는 것과 검증 수단을 고칠 권한을 주는 것은 다릅니다** — 후자를 허용하면 검증이 성립하지 않습니다.

CI eval 쪽 제안은 이렇습니다. 실제 작업 20~50개를 기대 결과와 함께 모아 두고, **`CLAUDE.md`·스킬·훅이 바뀔 때 돌려서** 통과율로 게이트를 겁니다. 프로덕션 인시던트는 하나씩 영구 eval이 됩니다.

이 항목의 발상은 옮길 만합니다 — **설정 파일도 회귀 테스트 대상**이라는 것. `CLAUDE.md`를 고치고 나서 무엇이 나빠졌는지 재는 수단이 없다면, 그 파일은 감으로 관리되는 중입니다.

### 5단계 — 권고와 강제를 층으로 나눈다

원문의 통제 3층이 이 글에서 가장 구조가 분명한 부분입니다.

| 층 | 무엇 | 성격 |
| --- | --- | --- |
| 1 | 스킬 · `CLAUDE.md` | **권고** — 에이전트를 안내 |
| 2 | 훅 | **결정적 강제** — 동작 차단, 승인 요구, 검증 실행 |
| 3 | 브랜치 보호 · 사람 리뷰 | 최종 게이트, 직무 분리 |

그리고 직무 분리를 이렇게 못 박습니다.

> "The agent that wrote the code has no way to approve it."

> "Branch protection still requires approval from a code owner."

> "The agent may act up to the production gate and cannot pass it."

환경별 자율성 등급도 제시합니다 — 개발은 자유, 스테이징은 중간, **프로덕션은 게이트**. 릴리스는 에이전트가 준비하고 릴리스 매니저가 승인하며, 훅이 그 게이트를 강제합니다.

승인 훅을 **어느 단계에 두느냐**에 대한 지적이 특히 실무적입니다.

> "A hook that asks a human for approval belongs with the gates in Stage 5: Deploy, because an approval prompt during the build puts a person back on the critical path"

빌드 중에 승인 프롬프트를 걸면 방금 없앤 병목을 다시 만드는 셈이라는 것입니다.

### 6단계 — 루프를 닫는 방식

프로덕션 지표를 **결정적 스크립트**가 감시하고, Western Electric 규칙으로 이탈을 판정한 뒤 단계별로 대응합니다.

> "At 1σ the script only logs, at 2σ it invokes Claude read-only to diagnose, and at 3σ Claude may act"

3σ 예시가 구체적입니다.

> "When the CI test failure rate breaches 3σ, the agent quarantines the flaky test or opens a revert PR, and the review gate decides."

여기서 눈여겨볼 설계는 **판정을 LLM이 하지 않는다**는 점입니다. 이탈 여부는 결정적 스크립트가 정하고, Claude는 그 뒤에 호출됩니다. 판정까지 모델에 맡기면 재현도 감사도 안 되기 때문입니다. 그리고 진단 결과는 다시 `intent.md`로 쓰여 1단계로 들어갑니다 — 그래서 "루프"입니다.

## 4. 지표 — 선행과 후행을 나눈다

| 선행(예측) | 후행(결과) |
| --- | --- |
| 아이디어 → `intent.md` 커밋 시간 | 빌드 착수 후 요구사항 변경·재작업 횟수 |
| `spec.md` → `plan.md` 커밋 간격 | PR당 리뷰 시간 |
| CI 1차 통과율 | 프로덕션까지 새 나간 결함·취약점 |
| 첫 PR 리뷰까지의 시간 | 반복 인시던트 |
| 지표 이탈 → 트리아지 큐 진입 시간 | DORA 4지표 |

후행 지표만 보면 조치가 늦고, 선행 지표만 보면 **바쁘기만 한 상태를 성과로 착각**합니다. 둘을 짝으로 놓은 것이 이 절의 요점입니다.

## 5. 레거시 도구는 밀어내지 않는다

Jira·ServiceNow를 어떻게 할 것인가에 대해 원문은 현실적입니다.

> "Those systems are hard to displace because auditors and regulators already accept them and other teams depend on them, so the AI-native SDLC has to fit around what exists."

선택지 셋을 제시합니다 — 저장소를 정본으로, 레거시를 정본으로, 아니면 **최소한 둘을 연결만** 해 두기.

> "Both the legacy system and the markdown-first system can coexist, so long as there is a link between the two or one is declared the source of truth."

## 6. 원문이 밝히는 경계

벤더 글에서 가장 옮길 값어치가 있는 부분입니다. 위에서 인용한 것 외에 정리하면:

- **사람이 남는 지점이 명시돼 있습니다.** — "Humans remain accountable for every decision that requires judgment." 스펙 수용 판단은 사람이 하고, 조직이 고위험으로 분류한 것은 테크리드·아키텍트로 갑니다.
- **게이트가 자동화보다 먼저 와야 합니다.** 5단계 CI/CD의 선행 조건이 "the gates must exist before automation accelerates anything"입니다. 순서를 뒤집으면 검수 없는 배포를 가속하게 됩니다.
- **한 번에 다 하는 게 아닙니다.** 플레이 사이에 의존 그래프가 있고, 선행 조건이 없는 것부터 시작하라고 합니다 — "Start with any clay play — nothing points into it, so it needs nothing first." 나머지는 "화살표가 들어오는 플레이를 먼저 도입"합니다.
- **스킬은 권고입니다.** 반드시 막아야 하는 것은 스킬이나 `CLAUDE.md`가 아니라 훅과 관리 설정으로 가야 합니다.

마지막 문장이 이 글의 태도를 요약합니다.

> "The loop keeps running. Human judgement stays above it."

## 7. 공식 문서와 대조해 보완이 필요한 지점

원문은 블로그이므로 메커니즘 서술이 성깁니다. 이 저장소 기준으로 확인한 차이입니다.

### (a) `@claude` 태깅에는 선행 조건이 있습니다

원문은 "When tagged with `@claude`, Claude addresses review comments"로 넘어갑니다. 공식 문서 기준으로 그 전에 필요한 것이 있습니다.

- Claude GitHub App 설치 + 인증 시크릿(`ANTHROPIC_API_KEY` 또는 `CLAUDE_CODE_OAUTH_TOKEN`) + `.github/workflows/`의 워크플로 파일. 세 개가 다 있어야 `@claude`가 동작합니다.
- **트리거한 사용자에게 저장소 write 권한이 없으면 실행이 실패합니다.** 봇 액터도 기본 거부됩니다(`allowed_bots`로 예외).

> "on issue and pull request events, the triggering user must have write access to the repository"

— [code.claude.com/docs/en/github-actions](https://code.claude.com/docs/en/github-actions) (확인: 2026-09-06)

리뷰를 조직 전체에 깔 때 **권한 모델이 먼저 걸린다**는 뜻입니다. 원문에는 이 제약이 없습니다.

### (b) PR 리뷰에는 워크플로를 안 쓰는 경로가 따로 있습니다

원문은 PR 리뷰를 하나로 뭉뚱그리지만, 공식 문서는 둘을 구분합니다.

- **Claude Code GitHub Action** — 워크플로 파일을 직접 관리하고 프롬프트·모델·트리거를 통제
- **Code Review** — "automatic review on every pull request, without writing a workflow"

— [code.claude.com/docs/en/github-actions](https://code.claude.com/docs/en/github-actions) (확인: 2026-09-06)

원문이 제안하는 `REVIEW.md`(리뷰 패스·Important/Nit 기준·제외 파일·Nit 상한)는 **어느 쪽에도 자동으로 물리지 않습니다.** 스킬이나 프롬프트에서 그 파일을 읽게 만들어야 합니다.

### (c) plan mode의 표현

원문은 plan mode를 "read-only access"라고 씁니다. 공식 문서의 표현은 조금 다릅니다.

> "Claude reads files and proposes a plan but makes no edits until you approve."

— [code.claude.com/docs/en/common-workflows](https://code.claude.com/docs/en/common-workflows) (확인: 2026-09-06)

**"편집을 하지 않는다"이지 "아무것도 실행하지 않는다"가 아닙니다.** 감사 요건으로 "plan mode니까 읽기 전용"이라고 쓰면 정확하지 않습니다.

### (d) 관리 설정은 대체로 못 뚫지만 예외 방향이 정해져 있습니다

원문은 관리 설정을 "controls cannot be bypassed by individual engineers"로 설명합니다. 공식 문서는 예외를 명시합니다.

> "nothing you set overrides it, apart from a few security-sensitive exceptions"

그런데 그 예외의 방향이 중요합니다 — **낮은 층에서 더 엄격한 값을 쓰면 그쪽이 이깁니다.** 즉 개발자가 정책을 느슨하게 푸는 방향으로는 못 뚫습니다. 원문의 결론은 유지되지만, 근거를 정확히 알고 쓰는 편이 낫습니다.

— [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings) (확인: 2026-09-06)

### (e) 스킬 발동 조건

원문은 "trigger automatically based on frontmatter conditions"라고 씁니다. 공식 문서 기준으로 실제 판단 근거는 프런트매터의 **`description` 한 필드**이고, 파일은 `.claude/skills/<이름>/SKILL.md`입니다. 자동 발동을 막으려면 `disable-model-invocation: true`를 씁니다.

— [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) (확인: 2026-09-06)

### (f) 등장하는 제품이 실재하는지

원문에 나오는 제품 이름 셋을 확인했습니다.

| 이름 | 확인 결과 |
| --- | --- |
| Cowork | 실재. Claude Desktop에서 도는 세션 형태로 공식 문서에 언급 — [claude.com/docs/cowork/overview](https://claude.com/docs/cowork/overview) |
| Claude Security | 실재. **예약 스캔**, 보고 전 검증 패스, 신뢰도 등급이 제품 페이지에 있음 — [claude.com/product/claude-security](https://claude.com/product/claude-security), [code.claude.com/docs/en/claude-security](https://code.claude.com/docs/en/claude-security) |
| Claude Tag (Slack·Teams) | 실재 |

세 링크 모두 2026-09-06 확인. **다만 셋 다 이 저장소에서 써 보지 않았습니다.**

## 8. 숫자를 어떻게 볼 것인가

이 대분류의 규칙대로 수치부터 의심했습니다.

| 수치 | 원문의 근거 | 판단 |
| --- | --- | --- |
| eval용 실제 작업 **20~50개** | **없음** | 근거 없는 기준치입니다. 다만 "몇 개부터 시작할까"의 출발점으로는 쓸 만합니다 |
| 병렬 세션 **2~3개**로 시작 | **없음** | 위와 같음. 대신 함께 제시된 **판단 기준**("리뷰가 따라오는 동안만 늘려라")은 근거가 필요 없는 종류라 그쪽을 쓰는 편이 낫습니다 |
| 관제 밴드 **1σ / 2σ / 3σ** | Western Electric 규칙 | 통계적 공정관리에서 가져온 것이라 출처가 있는 편입니다. 다만 **어느 지표에 어느 σ가 맞는지**는 원문이 정하지 않습니다 — 조직이 정해야 합니다 |

**어느 수치도 실험으로 뒷받침되지 않았습니다.** 원문이 제시하는 값어치는 숫자가 아니라 구조(무엇을 커밋하고, 무엇을 강제하고, 무엇을 재는가)에 있습니다.

## 9. 읽고 나서 든 판단

여기부터는 **원문에 있는 말이 아니라 정리하며 든 생각**입니다.

- **`CLAUDE.md`·스킬·훅에 회귀 테스트를 붙이자는 4단계 제안이 이 글에서 가장 실행 가능성이 높습니다.** 나머지 다섯 단계는 조직 프로세스 변경이 필요하지만, 이건 저장소 하나에서 혼자 시작할 수 있습니다.
- **반대로 1~2단계(`intent.md`·`spec.md`)는 비용이 가장 큽니다.** 도구가 읽어 주는 파일이 아니고(§2), 사람들의 기존 워크플로(Jira 티켓 등)와 이중 관리가 되기 쉽습니다. 원문이 레거시 절을 따로 둔 것도 그래서일 것입니다.
- **직무 분리 서술이 실제로 강제되는 지점은 브랜치 보호 하나입니다.** 훅은 로컬 설정이라 저장소 밖에서 우회 가능성이 남고, 스킬은 권고입니다. 감사 대응을 설계한다면 **GitHub·GitLab 쪽 설정이 실질적인 유일한 게이트**라고 보는 편이 안전합니다. (추측: 원문이 3층 중 마지막에 브랜치 보호를 둔 것도 같은 이유일 것입니다.)
- **이 저장소에 바로 걸리는 것 하나** — 여기의 `AGENTS.md`(→ `CLAUDE.md` 심볼릭 링크)가 이미 원문의 "institutional knowledge를 버전 관리되는 마크다운으로" 항목을 하고 있습니다. 반면 eval 스위트는 없습니다. `AGENTS.md`를 고쳤을 때 무엇이 나빠졌는지 재는 수단이 이 저장소에 없다는 뜻입니다.

## 10. 확인하지 못한 것

- **원문 페이지 원본과의 대조.** 인용문은 페이지를 가져와 추출한 것이고, HTML 원본을 직접 열어 한 글자씩 맞춰보지는 않았습니다. **확인 필요.**
- **의존 그래프의 실제 내용.** 원문은 플레이 간 의존 관계를 그림으로 제시하는데, 어떤 플레이가 "clay play"인지 전체 목록을 얻지 못했습니다. §6의 서술은 그 그림에 대한 원문 설명만 옮긴 것입니다.
- **여섯 단계를 조직에 적용해 본 기록.** 없습니다. 이 문서는 전부 **읽은 것**입니다.
- **Cowork · Claude Security · Claude Tag의 실제 동작.** 존재와 기능 서술만 공식 페이지로 확인했고, **직접 써 보지 않았습니다.**
- **CI eval 게이트의 구체적 구성.** 통과율 몇 %에서 막을지, eval을 무엇으로 돌릴지는 원문에 없고 확인하지도 않았습니다.
- **원문의 최종 수정 여부.** 게시일(2026-08-21)만 있고 수정 이력 표기가 없습니다. 이 종류의 페이지는 조용히 바뀌므로 **위 인용은 2026-09-06 시점의 것**입니다.

## 출처

- [The AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) — Louis Claxton, 게시 2026-08-21 (확인: 2026-09-06)
- [Claude Code — Skills](https://code.claude.com/docs/en/skills) (확인: 2026-09-06)
- [Claude Code — Settings](https://code.claude.com/docs/en/settings) (확인: 2026-09-06)
- [Claude Code — Common workflows](https://code.claude.com/docs/en/common-workflows) (확인: 2026-09-06)
- [Claude Code — GitHub Actions](https://code.claude.com/docs/en/github-actions) (확인: 2026-09-06)
- [Claude Code — Memory](https://code.claude.com/docs/en/memory) (확인: 2026-09-06)
- [Claude Security 제품 페이지](https://claude.com/product/claude-security) · [Claude Code — Claude Security](https://code.claude.com/docs/en/claude-security) (확인: 2026-09-06)
- 로컬 `claude --version` → 2.1.236, macOS 15.7.4 (24G517), 2026-09-06 실행

---

*작성일: 2026-09-06*
