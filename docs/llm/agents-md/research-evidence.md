---
sidebar_position: 3
---

# AGENTS.md의 효과 — 지침 준수와 과제 성공은 별도로 측정해야 합니다

## 실행 환경

- OS: macOS 15.7.4, 빌드 24G517 (`sw_vers`로 확인)
- 도구: Python 3.9.6. 외부 패키지 없이 표준 라이브러리를 사용했습니다.
- 실행 위치: 이 저장소 루트
- 실행 범위: 공개된 CSV를 내려받아 해시·행 수·평가 조건·평가 방식 표기를 확인했습니다. 코딩 에이전트의 benchmark 실행은 **미실행**입니다.

## 무엇이 좋아져야 효과가 있다고 말할 수 있는가

> A simple, open format for guiding coding agents.
>
> **번역** — 코딩 에이전트를 안내하는 단순한 공개 포맷입니다.
>
> — [AGENTS.md](https://agents.md/)

공식 사이트는 AGENTS.md를 에이전트에게 맥락과 지침을 전달할 자리로 설명합니다. 이 역할 정의 자체가 작업 성공률 향상에 대한 실험 결과는 아닙니다. 공식 페이지에는 판번호가 없습니다. — [AGENTS.md — Why AGENTS.md?](https://agents.md/)

**이 문서의 판단 기준:** “효과가 있다”는 말을 다음처럼 나눠야 검증할 수 있습니다.

| 평가 대상 | 최소한의 관측 예시 | 그 관측만으로 확정할 수 없는 것 |
| --- | --- | --- |
| 지침 준수 | 지정한 테스트 명령을 실행했습니다. | 요구사항을 만족하는 패치를 만들었는지 |
| 과제 정확도 | 수정 전에는 실패하던 독립 평가 테스트가 패치 후 통과했습니다. | 테스트하지 않은 동작과 규칙까지 맞는지 |
| 운영 효율 | 같은 품질 기준에서 시간·토큰·비용을 비교했습니다. | 다른 모델·작업·캐시 조건에서도 같은 효과가 나는지 |
| 작업 범위 준수 | 요청하지 않은 Git 작업을 수행하지 않았습니다. | 코드 정확도와 자원 사용량 |

예를 들어 다음은 **가상의 지침과 작업**입니다. 실제로 별도 에이전트에 실행하지 않았습니다.

```markdown title="가상의 AGENTS.md"
- Python 코드를 수정하면 변경 모듈의 테스트를 실행합니다.
- 커밋은 사용자가 요청한 경우에만 합니다.
```

작업 요청이 “입력 순서를 유지하도록 중복 제거 함수를 고쳐 주세요”라면, 테스트 명령 실행·반환 순서의 정확도·커밋 여부는 각각 다른 관측 항목입니다. 테스트를 많이 실행하고도 반환 순서를 잘못 구현할 수 있습니다. 반대로 코드를 정확히 고쳤어도 요청하지 않은 커밋을 했다면 작업 규칙 평가에서는 실패입니다. 이는 지표를 구분하기 위한 상황 예시이며 측정 결과가 아닙니다.

## 연구 세 편은 실제로 무엇을 비교했는가

아래는 **논문 본문의 보고**를 정리한 것입니다. arXiv의 판번호를 고정했으며 저자들의 결과를 이 저장소에서 독립 재현한 것은 아닙니다. 표의 과제 수는 실험 대상의 규모이며, 이 저장소에 대한 성능 수치가 아닙니다.

| 연구·확인한 판본 | 비교 조건과 대상 | 본문이 보고한 결과와 해석 범위 |
| --- | --- | --- |
| Lulla 등, arXiv:2601.20404 **v2** | Codex·`gpt-5.2-codex`. 10개 저장소의 124개 PR 작업에서 같은 시작 상태의 루트 AGENTS.md 유무를 비교했습니다. | 실행 시간과 출력 토큰 감소를 보고했습니다. 전체 결과물의 의미적 정확성 평가는 범위 밖이며 일부 출력의 수동 sanity check를 수행했습니다. 따라서 같은 정확도를 보장하면서 더 효율적이었다고 단정할 수는 없습니다. — [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents, §3–4](https://arxiv.org/html/2601.20404v2) |
| Gloaguen 등, arXiv:2602.11988 **v3** | Claude Code·Sonnet-4.5, Codex·GPT-5.2/GPT-5.1 mini, Qwen Code·Qwen3-30b-coder. SWE-bench Lite 300개 과제와 CTXbench 138개 과제에서 파일 없음·LLM 생성 파일·개발자 제공 파일을 비교했습니다. 개발자 파일 조건은 CTXbench에만 있습니다. | 파일 없음 대비 성공률 차이는 통계적으로 유의하지 않았고 비용은 증가했습니다. 개발자 파일이 LLM 생성 파일보다 나은 비교와, 파일 없음보다 나은 비교를 구분해야 합니다. — [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?, §4.1–4.2](https://arxiv.org/html/2602.11988v3#S4.SS1) |
| Khatri, arXiv:2607.27250 **v1** | 3개 Python 저장소. Claude Code·`claude-sonnet-4-6`에 15개 과제, Codex·`gpt-5.5`에 17개 과제. 맥락 없음·전체 주입·필요 시 검색을 조건별 반복 실행했습니다. | 정확도의 유의한 전략 효과를 검출하지 못했다고 보고했습니다. 표본 크기에 따른 검출 한계를 인정하며, 작은 효과까지 없다는 증명으로 보지는 않습니다. — [Do Context Files Help Coding Agents? A Two-Agent Ablation Study on Real Repositories, §3–4 및 Limitations](https://arxiv.org/html/2607.27250v1#S3) |

모델명은 **각 논문의 실험 설정**입니다. 현재 제품의 기본 모델이나 지원 모델 목록으로 해석하지 않습니다.

### 효율 개선과 정확도 개선은 같은 결론이 아닙니다

Lulla 등의 v2는 작은 코드 변경 PR을 선별했고 문서·설정만 바꾸는 PR은 제외했습니다. 결과물 전체의 정확성은 평가하지 않았다고 명시합니다. **이 문서의 해석:** 이 결과는 제한된 과제군의 자원 사용에 관한 근거이며, 문서 작성 작업이나 장기 운영 규칙의 유효성을 직접 판정하지는 않습니다. — [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents v2, §3.1.3·§3.1.8](https://arxiv.org/html/2601.20404v2#S3.SS1.SSS3)

Gloaguen 등의 v3에서는 성공을 패치 적용 후 평가 테스트가 모두 통과하는 것으로 정의합니다. 실행 추적에서는 지침에 따른 테스트·탐색·전용 도구 사용이 늘었습니다. **이 문서의 해석:** 성공률이 개선되지 않았다는 결과를 “에이전트가 파일을 무시했다”로 바꾸면 관측과 어긋납니다. 지침 준수에 작업이 더 필요해져도 정답 패치 수가 늘지 않을 수 있습니다. 이 연구는 Python에 집중하며 보안 등 다른 품질 측면은 후속 과제로 남깁니다. — [Evaluating AGENTS.md v3, §3.1·§4.3·§5](https://arxiv.org/html/2602.11988v3#S4.SS3)

### 같은 내용을 같은 경로로 전달했는지도 확인해야 합니다

Khatri의 v1은 자연스러운 파일 탐색을 그대로 재현한 실험이 아닙니다. 작업 공간의 지침 파일을 제거하고 내용을 별도로 주입합니다. Claude와 Codex의 주입 채널도 다릅니다. 검색 조건의 자료는 일부 저장소에서 원래 파일보다 넓은 wiki이므로 **전달 방식과 정보량이 함께 바뀝니다**. 연구 본문도 이를 한계로 적습니다. **이 문서의 판단:** 이를 “AGENTS.md를 똑같이 쪼개기만 해도 효과가 없다”는 결론으로 읽지는 않습니다. — [Do Context Files Help Coding Agents? v1, §3.3–3.4 및 Limitations](https://arxiv.org/html/2607.27250v1#S3.SS3)

**실무 판단:** 이 세 연구를 하나의 평균 효과로 합치기 전에 성공 기준·대상 과제·모델·지침 내용·전달 방식을 맞춰야 합니다. 결과의 방향이 다른 원인을 특정 요인 하나로 확정하는 인과 분석은 여기서 하지 않았습니다. 원인이 확인되지 않은 차이는 **원인 미상**으로 남깁니다.

## 공개 CSV만으로 결과를 재현했다고 말해도 되는가

Khatri 연구의 공개 저장소는 `results_summary.csv`를 조건별 집계 자료로 제공하고, `task_passed`를 gold tests의 통과 여부로 설명합니다. README에는 이 열의 평균으로 성공률을 계산하는 예시가 있습니다. 다음은 해당 설명을 검토하기 위해 **자료의 구조만 확인한 로컬 실행**입니다. — [연구 공개 데이터 설명, commit c929724의 data/README.md](https://github.com/codeprakhar25/context-files-coding-agents/blob/c929724f4049af8e8a666efeb9abcc21724c6839/data/README.md)

### 실행 명령과 실제 출력

URL을 commit에 고정하고 다운로드한 원본 바이트의 SHA-256을 출력했습니다. 평가 조건은 데이터 설명의 `(task × strategy × agent × repeat)` 조합으로 셌습니다. 외부 코드를 실행하지 않고 CSV를 읽기만 합니다.

```bash
python3 - <<'PY'
import csv
import hashlib
import io
import urllib.request
from collections import Counter

commit = 'c929724f4049af8e8a666efeb9abcc21724c6839'
url = ('https://raw.githubusercontent.com/codeprakhar25/'
       f'context-files-coding-agents/{commit}/data/results_summary.csv')
with urllib.request.urlopen(url, timeout=30) as response:
    raw = response.read()
rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8'))))
keys = [(r['task_id'], r['strategy'], r['agent'], r['repeat_index']) for r in rows]
print('commit:', commit)
print('sha256:', hashlib.sha256(raw).hexdigest())
print('rows:', len(rows))
print('unique_cells:', len(set(keys)))
for method, count in sorted(Counter(r['eval_method'] for r in rows).items()):
    print(f'eval_method[{method}]: {count}')
PY
```

```text title="이번 실행에서 얻은 실제 출력"
commit: c929724f4049af8e8a666efeb9abcc21724c6839
sha256: 96809726f635925bfe7cc0f91cbfea85d2b5ff7fc116a5934e168e2e280505f9
rows: 291
unique_cells: 288
eval_method[line_overlap]: 72
eval_method[tests]: 219
```

**직접 확인한 것:** 총 291행과 고유 평가 조건 288개는 서로 다릅니다. `eval_method`에는 `tests` 외에 `line_overlap`도 있습니다. 이 관측은 고정한 commit의 CSV에 한정됩니다. — [검사한 results_summary.csv 원본](https://github.com/codeprakhar25/context-files-coding-agents/blob/c929724f4049af8e8a666efeb9abcc21724c6839/data/results_summary.csv)

**해석의 한계:** 이 CSV는 모든 행이 서로 다른 조건의 gold-test 결과라고 즉시 간주할 수 있는 형태는 아닙니다. README의 단순 평균 예시를 그대로 실행하는 것만으로 논문 본문의 평가를 재현했다고 보고하지 않습니다. 중복 조건의 선택 규칙과 `line_overlap` 표기가 최종 평가에 어떻게 대응하는지는 **확인 필요**이며, 차이가 생긴 원인은 **원인 미상**입니다. 논문은 정확도 평가에서 일부 실행을 제외했다고 설명하지만, 그 제외 대상과 CSV의 중복 조건이 일치하는지는 대조하지 않았습니다. — [데이터 설명](https://github.com/codeprakhar25/context-files-coding-agents/blob/c929724f4049af8e8a666efeb9abcc21724c6839/data/README.md), [논문 v1, §3.1–3.2](https://arxiv.org/html/2607.27250v1#S3.SS1)

**실무 판단:** 공개 집계표를 다시 계산하는 일과 원래 실험을 재현하는 일을 구분합니다. 평가 방식·중복·제외 기준을 확인하기 전에는 성공률을 다시 산출하지 않습니다. 이 자료 확인만으로 논문의 결론이 잘못됐다고 판정하지도 않습니다.

## 이 저장소에서는 무엇을 유지·변경할 근거가 되는가

**이 저장소의 판단:** “규칙을 따랐다”와 “과제를 해결했다”를 따로 확인하고, 품질 기준을 만족한 결과끼리 비용을 비교합니다. 코드를 잘못 고친 실행이 빨리 끝났다고 해서 더 효율적인 해결책이라고 채택하지 않습니다.

예를 들어 “본문은 한국어 존댓말로 작성한다”는 산출물의 요구사항이고, “매 수정 전에 저장소의 모든 문서를 읽는다”는 진행 방법의 요구사항입니다. 앞의 기준을 보존한 채 뒤의 절차를 바꿀 수 있는지는 **해당 작업으로 평가할 가설**입니다. 논문에 일반적인 성공률 향상이 없었다는 이유만으로 둘을 함께 삭제할 근거는 되지 않습니다.

실패를 관찰할 때는 먼저 무엇이 빠졌는지 구분합니다. 명령·경로를 몰라 헤맸다면 지침 추가의 후보가 됩니다. 경로와 규칙을 알고도 구현을 틀렸다면 같은 설명을 늘리는 것으로 해결된다고 단정하지 않습니다. 실제 원인을 가리지 못한 경우는 **원인 미상**으로 남기고 작업 분해·예시·검사 개선을 각각 별도의 변경으로 평가합니다. 이는 연구 결과에서 도출한 실무 판단이며 이 저장소에서 효과를 측정한 결과는 아닙니다.

## 확인하지 못한 것

- **논문 실험의 독립 재현 — 미실행:** 세 연구의 코딩 에이전트·모델·대상 저장소·평가기를 실행하지 않았습니다. 논문 결과는 저자 보고로 구분했습니다.
- **실행 환경 전체와 효과 크기 — 확인 필요:** 연구별 하드웨어·동시성·모든 캐시 및 과금 조건을 대조하지 않았습니다. 이 문서는 자원 사용의 구체적 개선율을 이 저장소에 적용하지 않습니다.
- **공개 CSV와 최종 평가의 대응 — 확인 필요:** 고정한 commit의 CSV 구조를 확인했으나 원시 DB·제외 목록·재평가 이력을 대조하지 않았습니다. `line_overlap` 및 중복 조건의 원인은 확인하지 못했습니다.
- **이 저장소와 다른 작업으로의 일반화 — 미실행:** 한국어 기술 문서 작성, 장기 세션, 운영 규칙 준수에 대한 효과를 측정하지 않았습니다.

*작성일: 2026-10-24*
