---
sidebar_position: 7
---

# Zeppelin의 PR 양식과 비활성 PR 정리는 무엇을 요구하는가

> 원문 — [PULL_REQUEST_TEMPLATE](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/PULL_REQUEST_TEMPLATE), [Apache Zeppelin 소스 2ee180ffa](https://github.com/apache/zeppelin/tree/2ee180ffab215aa18fd167815b65bc23fcc64d1f)
>
> 확인 날짜 — 2026-09-20

> A few sentences describing the overall goals of the pull request's commits.
>
> **번역** — pull request의 커밋들이 가진 전체 목표를 몇 문장으로 설명합니다.
>
> — [PULL_REQUEST_TEMPLATE](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/PULL_REQUEST_TEMPLATE) (확인: 2026-09-20)

Zeppelin의 `.github`는 테스트 외에도 PR 작성 양식과 비활성 PR 정리 설정을 담습니다. **양식은 작성자에게 설명을 요구하고, stale workflow는 일정에 따라 유지보수 작업을 수행합니다.** 양식에 항목이 있다는 사실만으로 자동 검사가 강제된다고 읽으면 안 됩니다.

## 실행 환경과 검증 범위

대상은 `/Users/pgt0409/Desktop/git/zeppelin`의 **0.13.0-SNAPSHOT**, 커밋 `2ee180ffab215aa18fd167815b65bc23fcc64d1f`입니다. 확인 날짜는 2026-09-20이며, 로컬은 macOS 15.7.4 arm64, Python 3.9.6, Node.js 22.21.1입니다. 아래 파일 조회·설정 집계는 직접 실행했습니다. **GitHub hosted runner에서 workflow 실행은 미실행**입니다. 설정이 선언하는 작업과 실제 GitHub 실행 성공·저장소 설정을 구분합니다.

## PR 양식은 변경 목적과 검증 근거를 받습니다

| 항목 | 양식이 요구하는 내용 |
| --- | --- |
| What is this PR for? | 커밋 전체의 목적 |
| What type of PR is it? | Bug Fix·Improvement·Feature·Documentation·Hot Fix·Refactoring 중 해당 유형만 남기기 |
| Todos | 남은 작업 |
| What is the Jira issue? | Jira 링크와 제목의 `[ZEPPELIN-번호]` |
| How should this be tested? | 새 동작·변경 동작의 자동 테스트 권장, 수동 검증 절차 |
| Screenshots | 필요한 경우 화면 자료 |
| Questions | 라이선스 파일 갱신, 이전 버전 호환성, 문서 필요 여부 |

— [PULL_REQUEST_TEMPLATE](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/PULL_REQUEST_TEMPLATE) (확인: 2026-09-20)

가장 작은 유용한 설명 예시는 “문서의 잘못된 설정 키를 고쳤고, 해당 커밋의 enum 이름과 대조했다”입니다. “문서 개선”만 쓰는 것보다 변경 전후와 검증 경계가 드러납니다. 이것은 작성 제안이며 실제 PR 제출 기록은 아닙니다. 이번 범위의 YAML에서는 이 양식의 모든 항목을 파싱해 강제하는 job은 찾지 못했습니다.

## stale은 1년 뒤 즉시 닫는 설정이 아닙니다

`stale.yml`의 이름은 “Close stale PRs after 1 year of inactivity”이지만 설정은 다음 두 단계입니다.

```yaml
days-before-stale: 365
days-before-close: 30
operations-per-run: 100
remove-stale-when-updated: true
exempt-pr-labels: suspend-stale
```

활동이 없는 PR을 stale로 표시하고, 그 뒤에도 30일 동안 활동이 없으면 닫도록 의도한 설정입니다. 갱신되면 stale 표시를 제거하고 `suspend-stale` 라벨의 PR은 예외로 둡니다. cron은 `0 2 * * *`, 즉 매일 UTC 02:00(KST 11:00) 일정입니다. 제한값 100은 한 번의 API 관련 작업 예산이지 반드시 PR 100개를 닫는다는 뜻은 아닙니다.

— [stale.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/stale.yml) (확인: 2026-09-20)

— [actions/stale v9 — action.yml](https://github.com/actions/stale/blob/v9/action.yml) (확인: 2026-09-20)

예를 들어 stale 표시를 받은 PR에 작성자가 수정이나 댓글을 남기면 “365+30일이 지났으니 무조건 닫는다”는 설명과 맞지 않습니다. 매 실행의 API 처리 한도와 일정도 있으므로 정확한 종료 시각을 보장하는 타이머로 소개해서는 안 됩니다.

## `only-prs: true`는 v9의 지원 입력이 아닙니다

Zeppelin YAML에는 `only-prs: true`가 있지만 호출하는 `actions/stale@v9`의 `action.yml` inputs에는 이 이름이 없습니다. 아래는 해당 태그의 원문을 내려받아 대조한 명령입니다.

```bash
python3 - <<'PYCODE'
import urllib.request
text=urllib.request.urlopen('https://raw.githubusercontent.com/actions/stale/v9/action.yml').read().decode()
print('only-prs declared:', '\n  only-prs:' in text)
print('days-before-issue-stale declared:', '\n  days-before-issue-stale:' in text)
PYCODE
```

```text
only-prs declared: False
days-before-issue-stale declared: True
```

따라서 이 옵션을 근거로 “action이 PR만 대상으로 제한된다”고 확정하지 않습니다. v9에는 issue에 대한 `days-before-issue-stale`, `days-before-issue-close` 입력이 별도로 있고 비활성화 값 `-1`을 지원합니다. **PR만 처리하려는 의도와 실제 지원 입력은 다릅니다.** 다만 이 불일치만으로 실제 issue가 닫혔다고 결론 내릴 수도 없습니다. 실제 처리에는 issue 메시지 설정, 기존 라벨, token 권한, 실행 코드와 저장소 상태도 관여합니다.

— [stale.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/stale.yml) (확인: 2026-09-20)

— [actions/stale v9 — inputs](https://github.com/actions/stale/blob/v9/action.yml) (확인: 2026-09-20)

이 workflow는 `secrets.GITHUB_TOKEN`을 전달하지만 명시적인 `permissions` 블록이 없습니다. 그러므로 YAML만 읽고 PR 수정 권한이 충분하다거나 작업이 정상 동작한다고 단정하지 않습니다. 이번 작업은 문서 작성이므로 원본 Zeppelin의 workflow 설정은 수정하지 않았습니다.

— [stale.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/stale.yml) (확인: 2026-09-20)

## 확인하지 못한 것

- stale의 실제 경고 로그·PR 종료·issue 처리 여부는 **확인 필요**입니다 — action 입력 정의는 대조했지만 GitHub에서 실행하거나 운영 로그를 조회하지 않았습니다.
- token의 실효 권한은 **확인 필요**입니다 — 저장소·조직의 Actions 기본 권한 설정을 확인하지 않았습니다.
- PR 양식 강제 여부 전체는 **확인 필요**입니다 — `.github`에 보이는 파일을 확인했으며 외부 bot·조직 정책까지 조사하지 않았습니다.

*작성일: 2026-09-20*
