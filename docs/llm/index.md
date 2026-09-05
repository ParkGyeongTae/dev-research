---
sidebar_position: 1
---

# LLM

**LLM을 실제로 쓰는 쪽**을 다룹니다. 모델을 만드는 이야기가 아니라, 남이 만든 모델을 **어떻게 제대로 쓰는가**가 주제입니다.

두 갈래가 있습니다.

- **API를 직접 부르는 것** — 파라미터, 프롬프트 설계, 캐싱, 평가, RAG
- **LLM 기반 도구를 쓰는 것** — Claude Code·Codex·Kiro·Copilot 같은 에이전틱 코딩 도구와 그 도구들이 읽는 지침 파일

갈래는 다르지만 지배하는 제약은 같습니다 — **컨텍스트 예산, 지시의 모호성, 검증 수단의 부재.** 그래서 한 대분류에 둡니다.

## 다루는 것

- 벤더별 API의 동작 — 파라미터, 프롬프트 캐싱, 레이트 리밋, 과금 단위
- 에이전틱 코딩 도구의 사용법과 한계
- 프롬프트 설계 — 무엇이 왜 효과가 있고, 어디서 무너지는가
- 툴 사용(function calling)과 에이전트 구성
- 평가 — 잘 되는지 어떻게 재는가
- 검색 증강(RAG) — 청킹·임베딩·재순위

## 경계

- **LLM을 부르는 서버 코드**(엔드포인트 설계, 인증, 타임아웃)는 [백엔드](../backend/index.md)로 갑니다. 여기서는 **무엇을 어떻게 보낼 것인가**만 다룹니다.
- **벡터 데이터베이스의 내부 동작**(인덱스 구조, ANN 알고리즘)은 [데이터베이스](../database/index.md)로 갑니다. RAG 파이프라인에서 그것을 **어떻게 쓰는가**는 여기입니다.
- **대량 배치 호출을 파이프라인에 물리는 것**은 [데이터 엔지니어링](../data-engineering/index.md)으로 갑니다.
- **GPU·추론 서버 운영**은 [인프라](../infrastructure/index.md)로 갑니다.

## 이 아래를 자르는 방식

제품 고유의 것과 여러 제품에 걸치는 것을 나눕니다. 같은 원칙을 두 벌 적어두면 **한쪽이 반드시 낡기** 때문입니다.

| 폴더 | 들어가는 것 |
| --- | --- |
| `claude-code/` · `codex/` · `kiro/` · `github-copilot/` | 그 도구에만 있는 것 — 명령, 설정 파일, 고유 기능과 한계 |
| `claude-api/` · `openai-api/` | 그 벤더에만 있는 것 — 파라미터와 기본값, 캐싱 방식, 레이트 리밋, 과금 단위 |
| `agents-md/` · `prompt-engineering/` 등 주제 폴더 | 여러 제품에 걸치는 원칙. **권장사항이 갈리는 지점**을 나란히 놓고 어느 조건에서 어느 쪽이 맞는지 다룹니다 |

:::warning 지침 파일 문서를 어디에 둘지 — 파일명만 보고 정하면 틀립니다
`AGENTS.md`라는 이름이 두 가지 다른 것을 가리킵니다.

- **저장소 루트의 `AGENTS.md`** — 프로젝트 맥락을 담는 오픈 포맷. 여러 도구에 걸치므로 `agents-md/`
- **`.github/agents/<이름>.md`** — GitHub Copilot의 **에이전트 페르소나 정의** 파일. 그 제품에만 있으므로 `github-copilot/`

둘째는 Claude Code의 `.claude/agents/*.md` 서브에이전트에 대응하는 것이지 루트 `AGENTS.md`와 같은 물건이 아닙니다. **글 제목에 "agents.md"가 들어 있다고 `agents-md/`로 보내면 안 됩니다** — 본문에서 파일 위치를 확인하고 정합니다.
:::

## 공식 문서를 정리할 때 조심할 것

이 영역의 문서는 다른 대분류와 다릅니다.

1. **버전 번호가 없습니다.** 벤더의 best practice 페이지는 판번호 없이 조용히 바뀌고 URL도 옮겨다닙니다. 그래서 버전 대신 **원문 URL · 문서 제목 · 확인 날짜** 세 개를 항상 함께 적습니다. 벤더 문서 넷 중 최종 수정일을 밝힌 것은 Kiro 하나뿐이었고, 반대로 개인·기업 블로그 글은 셋 다 게시일을 밝혔습니다 — **날짜가 있다고 최신인 것도, 없다고 낡은 것도 아닙니다.**
2. **원문의 경계를 빠뜨리기 쉽습니다.** 벤더 문서라고 권장사항만 있는 것은 아닙니다 — 실제로 세 문서 모두 "언제 쓰지 마라"를 담고 있었고, 오히려 **거기가 가장 옮길 값어치가 있는 부분**이었습니다. 권장만 옮기고 경계를 흘리면 절반짜리 정리가 됩니다.
3. **직접 써보지 않았다면 그렇게 적습니다.** 원문에서 읽은 것과 돌려본 것을 섞지 않습니다. 안 써본 도구의 문서는 "확인하지 못한 것"을 문서 안에 남깁니다.
4. **블로그 글은 숫자부터 의심합니다.** 이 영역의 글들은 "150줄 이하", "500줄", "지시 200개" 같은 기준을 던지는데 **확인해 본 것 중 근거를 댄 것이 하나도 없었습니다.** 근거 없는 수치는 그렇게 표시하고, 대신 재현 가능한 **증상 기준**(규칙이 있는데도 계속 어긴다면 파일이 너무 긴 것)을 우선합니다.

## 문서 목록

### 에이전틱 코딩 도구

| 문서 | 원문 | 출처 등급 | 검증 상태 |
| --- | --- | --- | --- |
| [Claude Code 베스트 프랙티스](./claude-code/best-practices.md) | [code.claude.com](https://code.claude.com/docs/en/best-practices) | 공식 | 원문 정리 + 일부 직접 확인 |
| [CLAUDE.md와 자동 메모리](./claude-code/memory.md) | [code.claude.com](https://code.claude.com/docs/en/memory) | 공식 | 원문 정리 + 일부 직접 확인 |
| [CLAUDE.md 튜닝](./claude-code/claude-md-tuning.md) | [tembo.io](https://www.tembo.io/blog/how-to-write-a-great-claude-md) | 벤더 블로그 | 원문 정리 — **미실행** |
| [Codex 베스트 프랙티스](./codex/best-practices.md) | [learn.chatgpt.com](https://learn.chatgpt.com/guides/best-practices) | 공식 | 원문 정리 — **미사용** |
| [Kiro 스펙 베스트 프랙티스](./kiro/specs-best-practices.md) | [kiro.dev](https://kiro.dev/docs/specs/best-practices/) | 공식 | 원문 정리 — **미사용** |
| [Copilot 커스텀 에이전트](./github-copilot/custom-agents.md) | [github.blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) | 벤더 블로그 + 공식 레퍼런스 교차 확인 | 원문 정리 — **미사용** |

### 지침 파일 포맷

| 문서 | 원문 | 출처 등급 | 검증 상태 |
| --- | --- | --- | --- |
| [AGENTS.md 오픈 포맷](./agents-md/spec.md) | [agents.md](https://agents.md/) | 표준 사이트 | 원문 정리 + 일부 직접 확인 |
| [AGENTS.md 작성 실무 팁](./agents-md/writing-tips.md) | [hboon.com](https://hboon.com/how-to-write-an-agents-md-that-actually-works/) | 개인 블로그 | 원문 정리 — **미실행** |

**어느 문서도 해당 도구를 실제로 돌려본 기록이 아닙니다.** 전부 원문을 읽고 정리한 것입니다. "일부 직접 확인"은 이 저장소에서 관찰 가능한 것(심볼릭 링크가 로드되는지, `AGENTS.md`가 몇 줄인지, 자동 메모리 디렉터리가 존재하는지)에 한합니다. 각 문서 맨 아래 "확인하지 못한 것"에 무엇을 검증하지 않았는지 적어 두었습니다.

출처 등급이 낮은 문서(개인 블로그·벤더 블로그)는 **공식 문서와 갈리는 지점을 표시하는 용도**로 둡니다. 그 자체를 근거로 쓰지 않습니다.

---

*작성일: 2026-09-05*
