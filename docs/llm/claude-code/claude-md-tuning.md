---
sidebar_position: 3
---

# CLAUDE.md 튜닝 — 공식 문서 바깥의 관점

> **원문** [How to Write a Great CLAUDE.md: Best Practices and Tips](https://www.tembo.io/blog/how-to-write-a-great-claude-md) — Tembo Team<br/>
> **게시** 2026-02-04 · **확인 날짜** 2026-09-05<br/>
> **검증 상태** 원문을 읽고 정리했습니다. 직접 돌려보지 않았습니다.

:::danger 출처의 성격을 먼저 밝힙니다
Tembo는 **클라우드에서 코딩 에이전트를 돌리는 제품을 파는 회사**이고, 이 글은 그 회사의 블로그입니다. 마지막 절이 "Tembo 프로젝트에 CLAUDE.md 추가하기"인 마케팅 콘텐츠이기도 합니다.

그럼에도 정리해 둘 값어치가 있는 이유는 **공식 문서와 갈리는 지점이 셋**이나 되기 때문입니다. 자료가 갈리면 한쪽을 고르는 게 아니라 둘 다 적고 어느 조건에서 어느 쪽이 맞는지를 봐야 합니다.

근거의 성격: 저자가 대는 유일한 권위는 **"Tembo를 만들며 1년간 이 파일들을 튜닝한 경험"** 입니다. 측정 데이터도, 인용된 논문·문서도 없습니다.
:::

이 글의 값어치는 일반론이 아니라 **Claude Code 공식 문서와 어긋나는 지점**에 있습니다. 그래서 이 문서는 겹치는 일반론을 옮기지 않고, **공식 문서와 갈리는 것**과 **공식 문서에 없는 것**만 다룹니다. 대조한 공식 문서는 [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)와 [How Claude remembers your project](https://code.claude.com/docs/en/memory)이고, 둘 다 2026-09-05에 확인했습니다.

---

## 갈리는 지점 1 — 크기 기준

| 자료 | 기준 | 단위 |
| --- | --- | --- |
| **Claude Code 공식** | 파일당 **200줄** 목표 | 줄 |
| **이 글** | **500줄** 넘으면 리팩터링, **지시 200개**가 모델 한계 | 줄 + 지시 |

원문의 주장입니다.

> Even the best frontier models can only reliably follow around **200 distinct instructions**. Smaller and older models have an even lower threshold. And as instruction count increases, the model doesn't just struggle with instructions that appear later in the file — **it has a harder time following all instructions, even the ones at the beginning.**

:::warning 이 숫자에는 출처가 없습니다
"200 distinct instructions"는 이 글에서 가장 자주 인용되는 대목인데, **원문에 근거가 붙어 있지 않습니다.** 논문도, 벤치마크도, 모델 카드도 인용하지 않습니다. 어느 모델인지, 어떻게 쟀는지, "distinct instruction"을 무엇으로 세는지 전부 없습니다.

**그리고 공식 문서의 200과 단위가 다릅니다.** 공식은 **줄**, 이 글은 **지시 개수**입니다. 우연히 같은 숫자라서 섞어 인용하기 쉬운데, 불릿 한 줄이 지시 하나라는 보장도 없습니다.

앞부분 지시까지 같이 나빠진다는 뒷문장은 방향 자체는 그럴듯하지만(**추측**), 이 글에서는 검증되지 않은 주장입니다.
:::

실무 기준으로 쓸 만한 건 원문의 **판정 문장**이지 숫자가 아닙니다.

> Your preferred indent style? **That's a job for a linter, not your CLAUDE.md file.** Your architectural decision to use microservices with event-driven communication? **That absolutely belongs in the file.**

## 갈리는 지점 2 — 자동 생성

| 자료 | 입장 |
| --- | --- |
| **Claude Code 공식** | `/init`으로 초안을 만들고 다듬으라고 **권합니다** |
| **이 글** | **자동 생성하지 마라** |

원문의 근거입니다.

> This is one file where you need to be meticulous about **both length and content**, so rolling the dice on it by generating it is usually not the best move.

자동 생성물의 세 가지 결함을 듭니다 — 정보 과다(컨텍스트 부풀림), 코드 생성에 영향 없는 잡다한 세부, 그리고 **어디에도 안 적혀 있는 맥락의 누락**.

세 번째가 핵심 논거입니다. 코드에서 못 뽑는 것의 예가 구체적입니다.

- **어떤 패턴을 왜 골랐는지** — 코드에도 주석에도 안 나옵니다
- **"2분기에 REST에서 GraphQL로 옮길 예정이니 새 엔드포인트는 그걸 감안해 설계하라"** 같은 제약

:::note 갈림이 아니라 순서일 수 있습니다
공식은 `/init`을 **초안(starter)** 으로 쓰고 손으로 다듬으라는 것이고, 이 글은 **생성물을 그대로 두지 말라**는 것입니다. "생성 후 전면 재작성"이면 둘 다 만족합니다.

실제로 충돌하는 건 **생성으로 시작할 것인가**뿐입니다. 이 글의 논거대로라면 백지에서 시작하는 편이 낫습니다 — 생성물이 있으면 "이미 있는 걸 지우기"보다 "빠진 걸 채우기"로 기울고, 정작 중요한 누락(위의 두 예)은 채워지지 않기 때문입니다. **판단:** 코드베이스가 크고 낯설면 `/init`으로 구조를 훑는 값어치가 있고, 자기 프로젝트라면 손으로 쓰는 게 낫습니다.
:::

## 갈리는 지점 3 — 코드 스타일

원문은 스타일 규칙을 **아예 이 파일에서 빼라**고 합니다.

> Don't use your CLAUDE.md file to document code style guidelines and expect Claude to apply them perfectly. **This is a common mistake that leads to frustration.**

논거는 예산입니다. "항상 홑따옴표", "여러 줄 배열에 후행 쉼표", "들여쓰기 2칸"을 다 적으면 **자동화 도구가 더 잘하는 일에 지시 예산을 태우는 것**입니다.

원문이 제안하는 워크플로와 파일에 남길 내용입니다.

1. Claude가 코드를 생성한다
2. 린터를 돌린다 (또는 pre-commit 훅이 돌린다)
3. 위반이 있으면 **린터 출력을 Claude에게 보여주고** 고치게 한다

```markdown title="CLAUDE.md에 남길 것은 이 정도"
Code style is enforced by ESLint and Prettier. If linter errors are reported,
fix them according to the linter output rather than trying to predict style rules.
```

> **The linter is the source of truth, not the CLAUDE.md file.**

:::warning 공식 문서와 정면으로 갈립니다
Claude Code 공식 문서의 "넣을 것" 표 두 번째 줄이 **"기본값과 다른 코드 스타일 규칙"** 입니다. 즉 공식은 이 파일에 스타일 규칙을 **적으라**고 합니다.

**조건을 나누면 갈리지 않습니다.**

| 규칙 | 어디로 |
| --- | --- |
| 린터가 강제할 수 있는 것(따옴표·들여쓰기·후행 쉼표) | **린터.** 파일에 쓰면 예산 낭비 |
| 린터 설정으로 표현할 수 없는 것(인자 3개 이상이면 객체 파라미터, 최상위는 함수 선언문) | **파일.** 안 쓰면 아무도 안 잡음 |
| 린터 설정을 새로 만들 수는 있지만 아직 안 만든 것 | **린터로 옮기는 게 정답.** 파일은 임시방편 |

기준 한 줄: **"이 규칙을 위반했을 때 CI가 빨개지는가?"** 빨개진다면 파일에서 빼도 됩니다.
:::

## 공식 문서에 없는 것 1 — 컨텍스트 우선순위를 "고장이 아니라 설계"로 설명

원문이 이 글에서 가장 실무적인 대목입니다.

> As you have a longer conversation with more back-and-forth messages, **your most recent instructions carry more weight** than the contents of your CLAUDE.md file. (…) **This isn't necessarily bad**, but it's something to be aware of — you can't treat the CLAUDE.md file as an unbreakable set of rules.

예시가 구체적입니다. CLAUDE.md가 커스텀 에러 클래스를 쓰라고 했는데 디버깅 중에 "일단 표준 Error를 던져서 해피 패스만 보자"고 시키면, Claude는 **최근 지시를 따릅니다.** 원문은 이게 원하는 동작이라고 씁니다.

**진단 절차로 쓸 수 있는 게 여기입니다.**

> If you're getting code that doesn't match your CLAUDE.md guidelines, **check your recent conversation history.**

일부러 벗어날 때는 명시하라고 합니다 — "이 프로토타입에서는 CLAUDE.md의 에러 처리 패턴을 무시하고 기본 try-catch를 써라".

:::note 공식 문서의 설명과 층이 다릅니다
공식 문서는 같은 현상을 **메커니즘**으로 설명합니다 — CLAUDE.md는 시스템 프롬프트가 아니라 **시스템 프롬프트 뒤의 사용자 메시지**로 전달되므로 엄격한 준수가 보장되지 않는다는 것입니다.

> CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself.

이 글은 같은 것을 **증상과 대처**로 설명합니다. 둘이 모순되지 않고 층이 다릅니다. 지시가 안 먹힐 때 공식 문서의 6단계 진단을 돌리기 전에, **"최근 대화에서 내가 뒤집는 말을 했나"부터 보는 게 빠릅니다.**
:::

## 공식 문서에 없는 것 2 — "복사본 대신 포인터"

원문의 표현은 **prefer pointers to copies**입니다.

> Don't include code snippets in these context files if you can avoid it — **they become outdated quickly.** Instead, use file:line references to point Claude to the authoritative source.

```markdown
For authentication middleware implementation, see `src/middleware/auth.ts:15-45`
For error handling patterns, reference `src/utils/errors.ts:8-30`
```

이렇게 하면 Claude가 **현재 상태의 코드**를 읽습니다. 부수 효과도 있습니다 — 참조 대상이 바뀔 때마다 CLAUDE.md를 고치지 않아도 됩니다.

:::warning 줄 번호는 코드 조각보다 빨리 썩습니다
원문이 말하지 않는 부분입니다. `auth.ts:15-45`는 그 파일 위에 import 한 줄만 추가돼도 어긋납니다. 그리고 **코드 조각과 달리 어긋난 것이 눈에 안 보입니다** — 낡은 조각은 읽으면 이상한 걸 알지만, 잘못된 줄 번호는 엉뚱한 코드를 가리킬 뿐입니다.

**판단:** 파일 경로와 심볼 이름(`src/middleware/auth.ts`의 `requireAuth`)까지만 쓰는 편이 안전합니다. 줄 번호는 파일이 크고 위치를 좁혀야 할 때만 쓰고, 그때도 "대략" 임을 감안해야 합니다.
:::

## 공식 문서에 없는 것 3 — `.claude/` 아래 맥락 파일과 "물어보고 읽기"

원문의 progressive disclosure 예시입니다. 루트는 항상 유효한 것만 두고, 나머지를 `.claude/` 아래로 내립니다.

```markdown title="CLAUDE.md"
## Additional Context Files

For specific components, refer to these context files:

- `.claude/auth-context.md` - Authentication and authorization patterns
- `.claude/database-context.md` - Database schema and query patterns
- `.claude/api-context.md` - API design and endpoint conventions

Before starting work, determine which context files are relevant and read them.
```

한 단계 더 나간 방법도 제안합니다 — 파일 목록에 설명을 붙이고 **어떤 것을 읽을지 사용자에게 묻거나, 선택안을 승인받고 읽게** 하는 것입니다.

:::danger 이 방식은 공식 메커니즘보다 약합니다
결정적으로 갈리는 지점입니다.

| | 이 글의 방식 | 공식 `.claude/rules/` |
| --- | --- | --- |
| 로드를 정하는 주체 | **모델의 판단** ("determine which are relevant") | **글로브 매칭** (`paths` 프런트매터) |
| 확실성 | 없음. 안 읽고 진행할 수 있음 | 매칭되는 파일을 읽을 때 자동 |
| 실패 모드 | 조용히 맥락 없이 작업 | — |

공식 문서의 `.claude/rules/`는 규칙 파일에 `paths` 프런트매터를 붙일 수 있고, 그러면 **매칭되는 파일을 다룰 때만** 로드됩니다 — 사람도 모델도 개입하지 않습니다.

이 글이 게시된 2026-02-04 시점에 `.claude/rules/`가 있었는지는 확인하지 못했습니다. 다만 **지금 고른다면 `paths` 규칙이 낫습니다.** "관련 있으면 읽어라"는 지시도 결국 권고이고, 안 읽었다는 사실이 티가 나지 않습니다.

한편 이 글의 방식이 나은 경우도 있습니다 — **어떤 파일을 읽을지 사람이 승인**하고 싶을 때, 그리고 경로로는 구분되지 않는 관심사(예: "성능 작업"과 "보안 작업"이 같은 파일들을 건드릴 때)입니다.
:::

## 원문이 인정하는 단점 셋

벤더 블로그치고 "부정적인 면" 절을 따로 둔 점은 값어치가 있습니다.

| 단점 | 증상 |
| --- | --- |
| **나쁜 파일은 나쁜 출력을 만든다** | 낡은 정보·모순된 지시가 있으면 Claude가 **자신 있게** 그 틀린 패턴대로 생성합니다. 폐기된 API를 적어 두면 계속 그 API로 짭니다 |
| **지시가 무시된다** | 대화가 길어질수록 최근 지시가 이깁니다 (위 절) |
| **유지보수 부담** | 인증 시스템을 리팩터링하고 파일을 안 고치면 **새 구현과 안 맞는 제안**이 나옵니다 |

세 번째에 대한 원문의 처방은 **코드 리뷰 대상에 넣으라**는 것입니다 — 아키텍처가 바뀌는 PR에서 이 파일도 함께 본다는 뜻입니다.

## 확인하지 못한 것

- **"약 200개 지시" 주장** — 원문에 출처가 없고, 이 저장소에서 재보지도 않았습니다
- **500줄 임계** — 근거 없음
- **`file:line` 포인터가 실제로 낫다는 주장** — 돌려보지 않았습니다. 위의 "줄 번호가 썩는다"는 **판단**이지 실험 결과가 아닙니다
- **2026-02-04 시점의 Claude Code 기능 범위** — `.claude/rules/`와 `paths` 프런트매터가 그때 있었는지 확인하지 못했습니다. 그래서 원문의 `.claude/*.md` 방식이 **당시 최선이었을 가능성**을 배제할 수 없습니다
- 원문은 게시일을 밝히지만 **어느 Claude Code 버전 기준인지는 없습니다.** 확인 시점 기준 **7개월 지난 글**입니다

---

*작성일: 2026-09-06*
