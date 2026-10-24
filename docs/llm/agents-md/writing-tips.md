---
sidebar_position: 2
---

# AGENTS.md 작성법 — 규칙의 길이보다 행동의 변화를 확인합니다
> **원문** [How to Write an AGENTS.md That Actually Works](https://hboon.com/how-to-write-an-agents-md-that-actually-works/) — Hwee-Boon Yar

**개인 블로그의 경험담**을 정리한 문서이며 공식 규격이나 비교 실험 결과가 아닙니다.

## 무엇을 쓰는 파일인가

> A simple, open format for guiding coding agents.
>
> **번역** — 코딩 에이전트를 안내하는 단순한 공개 포맷입니다.
>
> — [AGENTS.md](https://agents.md/)

저자는 AGENTS.md를 반복 적용할 작업 지침으로 보고, 설명보다 구체적인 행동을 적으라고 권합니다. 예를 들어 “검증을 잘하세요” 대신 “문서 수정 후 저장소 루트에서 `npm run build`를 실행하세요”라고 적는 방식입니다. **여기서 판단하는 것은 문장의 멋이 아니라 수행 여부입니다.**

— [원문 — Skip Explanations, Write Instructions](https://hboon.com/how-to-write-an-agents-md-that-actually-works/)

## 실행 환경

- 저장소 루트, macOS 15.7.4, 빌드 24G517 (`sw_vers` 확인)
- 도구: Node.js v24.21.0, npm 12.2.1, Prettier 3.6.2 (각 버전 명령으로 확인)

## 무엇을 구체적으로 적는가

| 대상 | 저자의 권고 |
| --- | --- |
| 중요 규칙 | 실제 사고를 막는 금지 규칙을 앞에 둡니다. |
| 명령 | 패키지 관리자·개발·검사 명령을 명시합니다. |
| 구조 | 패키지 역할·연결·수정 위치를 짧게 적습니다. |
| 코딩 규약 | “깔끔하게” 대신 판정 가능한 규칙을 적습니다. |
| 반복 실수 | 문제가 생겼을 때 금지 규칙과 대안을 추가합니다. |
| 커밋 | 메시지 형식과 변경 단위를 정합니다. |
| 환경·스킬 | 자동 재시작 여부, 도구 위치, 작업별 스킬을 적습니다. |

— [원문 — Put Critical Rules at the Top부터 Skill Triggers Need Hints까지](https://hboon.com/how-to-write-an-agents-md-that-actually-works/)

```markdown title="이 저장소에 맞춘 AGENTS.md 작성 예시"
# AGENTS.md
- 커밋은 사용자가 요청한 경우에만 합니다.
- 문서는 docs/<대분류>/<기술>/ 아래에 둡니다.
- 문서 수정 후 저장소 루트에서 `npm run build`를 실행합니다.
- 실패하면 오류와 수정 결과를 보고합니다.
```

**이 저장소의 판단:** 루트 지침은 사람이 다시 판단할 문서 구조의 기준이기도 합니다. 따라서 규칙의 적용 범위를 이해하는 데 필요한 이유는 남깁니다. 저자의 “설명 생략” 권고를 그대로 적용하지 않습니다.

## 문장으로 지시하는 것과 검사로 강제하는 것은 다릅니다

Prettier 3.6.2에서 중괄호 없는 `if`문을 포맷한 실제 출력입니다.

```console
$ printf 'if (ready) run();\n' | npm exec --silent --yes --package=prettier@3.6.2 -- prettier --parser babel
if (ready) run();
```

**직접 확인:** 이 예제에서 Prettier는 중괄호를 추가하지 않았습니다.

**공식 문서:** ESLint의 `curly`는 중괄호 생략을 검사합니다. 지침에 요구사항을 적는 것과 검사 도구가 그 요구사항을 검증하는 것은 별개입니다.

— [ESLint — curly](https://eslint.org/docs/latest/rules/curly)

## 줄 수는 목표이지 효과의 증거가 아닙니다

저자는 **150줄 미만**을 목표로 하고, 한 절이 **20줄을 넘으면** 스킬 분리를 고려합니다. 세션 끝에 수정안을 제안받고 직접 골라 반영하는 절차도 권합니다. 두 숫자는 저자의 경험칙입니다.

— [원문 — Keep It Short / The Reflect Loop](https://hboon.com/how-to-write-an-agents-md-that-actually-works/)

이전 문서에는 루트 지침이 155줄이었다는 관측이 남아 있었습니다. 이번 실행 결과는 다음과 같습니다.

```console
$ wc -l AGENTS.md
     211 AGENTS.md
```

**해석의 한계:** 줄 수만으로 지침의 효과를 판정하지 않습니다. 규칙 위반의 원인을 확인하지 못했다면 **원인 미상**으로 남기고, 파일 길이 때문이라고 단정하지 않습니다.

## 모델이 바뀌면 규칙을 어떻게 재검토하는가

1. 규칙을 적용 범위와 보존할 행동으로 나눕니다.
2. 같은 저장소 상태·도구·설정·작업에서 기존 지침을 기준으로 측정합니다.
3. 후보 규칙을 조금씩 제거하고 반복 실행해 결과·명령·검사·권한 처리를 비교합니다.
4. 퇴행하거나 불명확하면 복구하고, 개별 제거가 통과해도 합친 상태를 다시 평가합니다.

저자는 안전·인증·결제·개인정보·데이터 무결성 규칙은 이 제거 평가에서 제외합니다. 예를 들어 문서 작성 규칙을 줄이더라도 출처 누락과 빌드 결과가 달라지는지 비교해야 합니다. **이 예시 평가는 미실행입니다.**

— [원문 — Refresh AGENTS.md after model updates](https://hboon.com/how-to-write-an-agents-md-that-actually-works/)

## 확인하지 못한 것

- **효과와 인과관계 — 미실행:** 규칙 위치·부정 표현·길이에 따른 준수율은 비교하지 않았으며 원문에도 통제 실험 수치가 없습니다.
- **도구별 재현성 — 확인 필요:** 원문은 에이전트 버전을 명시하지 않아 동일 조건을 재현할 수 없습니다.

*작성일: 2026-10-24*
