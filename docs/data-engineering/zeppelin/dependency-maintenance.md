---
sidebar_position: 6
---

# Zeppelin은 의존성 수정안을 어떻게 만들고 검증하는가

> 원문 — [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml), [Apache Zeppelin 소스 2ee180ffa](https://github.com/apache/zeppelin/tree/2ee180ffab215aa18fd167815b65bc23fcc64d1f)
>
> 확인 날짜 — 2026-09-20

> Keep version updates disabled so this config only groups security updates.
>
> **번역** — 이 설정이 보안 업데이트만 그룹화하도록 버전 업데이트를 비활성화해 둡니다.
>
> — [dependabot.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/dependabot.yml) (확인: 2026-09-20)

이 커밋에는 두 경로가 있습니다. Dependabot은 설정된 ecosystem·디렉터리의 보안 업데이트를 그룹화하고, 별도 workflow는 `zeppelin-react`의 npm audit 실패를 lockfile 수정안으로 만듭니다. **문제 발견, 수정 생성, 테스트, PR 발행은 서로 다른 단계**이며 자동 병합까지 수행하는 구성은 아닙니다.

## 실행 환경과 검증 범위

대상은 `/Users/pgt0409/Desktop/git/zeppelin`의 **0.13.0-SNAPSHOT**, 커밋 `2ee180ffab215aa18fd167815b65bc23fcc64d1f`입니다. 확인 날짜는 2026-09-20이며, 로컬은 macOS 15.7.4 arm64, Python 3.9.6, Node.js 22.21.1입니다. 아래 파일 조회·설정 집계는 직접 실행했습니다. **GitHub hosted runner에서 workflow 실행은 미실행**입니다. 설정이 선언하는 작업과 실제 GitHub 실행 성공·저장소 설정을 구분합니다.

## Dependabot의 `0`은 보안 업데이트 전체 중지를 뜻하지 않습니다

모든 update 항목에는 다음 공통 설정이 있습니다.

```yaml
schedule:
  interval: weekly
open-pull-requests-limit: 0
groups:
  # 실제 이름은 대상별로 다릅니다.
  root-maven-security-updates:
    applies-to: security-updates
    patterns:
      - '*'
```

`open-pull-requests-limit: 0`은 일반 버전 업데이트 PR을 비활성화하는 값이며 보안 업데이트 PR에는 별도 제한이 적용됩니다. `weekly`를 “보안 문제가 있어도 반드시 일주일에 한 번만 처리한다”는 뜻으로 읽지 않습니다. 실제 보안 업데이트 동작에는 저장소의 해당 기능 활성화도 필요하므로 YAML 존재만으로 운영 중이라고 단정하지 않습니다.

— [Dependabot options reference — open-pull-requests-limit](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#open-pull-requests-limit) (확인: 2026-09-20)

| ecosystem | 선언된 directory |
| --- | --- |
| bundler | `/docs` |
| npm | `/zeppelin-web`, `/zeppelin-web-angular` |
| pip | `/dev` |
| maven | `/`, `/bigquery`, `/elasticsearch`, `/flink/flink-scala-2.12`, `/livy`, `/shell`, `/spark/interpreter`, `/spark/spark-scala-parent`, `/zeppelin-interpreter`, `/zeppelin-plugins/launcher/docker`, `/zeppelin-plugins/launcher/k8s-standard`, `/zeppelin-plugins/notebookrepo/s3` |

— [dependabot.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/dependabot.yml) (확인: 2026-09-20)

총 16개 update 항목이며 각각 자기 group 이름을 사용합니다. 이 표는 명시된 directory 목록이고 하위의 모든 package가 재귀적으로 검사된다는 증거는 아닙니다. 특히 React 하위 package의 lockfile은 다음 전용 workflow에서 명시적으로 검사합니다.

## React lockfile 수정 workflow의 진입 조건

`npm-audit-remediation.yml`은 매일 UTC 02:23(KST 11:23) 일정, 수동 `workflow_dispatch`, 자기 YAML을 변경하는 PR에 반응하도록 선언돼 있습니다. cron은 실행 예정 시각이며 정확히 그 시각에 실행이 시작됐다는 실측은 아닙니다. 고정 concurrency group을 쓰고 `cancel-in-progress: false`로 실행 중 작업을 자동 취소하지 않습니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

```text
prepare (contents: read, 30분 제한)
  검사할 SHA 기록
  lockfile 기반 high/critical audit
  필요하면 lockfile-only fix
  변경 파일 제한 검사
  설치·audit·lint·test·build
  patch artifact 업로드
          ↓ needs: prepare
publish (쓰기 권한, 10분 제한)
  취약점 수정 필요 + PR 이벤트 아님 + apache/zeppelin일 때만
  검사했던 SHA checkout
  patch 적용·변경 파일 재검사
  기존 PR의 lockfile과 비교
  branch 갱신·draft PR 생성 또는 기존 PR 갱신
```

PR 이벤트의 prepare는 `github.sha`, 그 외에는 `master`를 checkout합니다. 따라서 수동 실행 화면에서 다른 ref를 골랐다는 이유만으로 그 ref의 코드를 audit한다고 가정하면 안 됩니다. prepare가 기록한 `audited_sha`를 publish에 넘겨 **검사한 revision과 patch 적용 기준**을 연결합니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

## audit 실패를 곧바로 취약점으로 취급하지 않습니다

첫 검사는 다음 명령입니다. 실행 디렉터리는 React package입니다.

```bash
npm audit --package-lock-only --audit-level=high --json
```

종료 코드가 0이면 수정 불필요로 끝납니다. 0이 아니면 JSON의 `metadata.vulnerabilities`에서 high와 critical 개수를 확인합니다. 정상 report가 없거나 high/critical 합계가 0이면 수정 작업으로 넘기지 않고 오류로 끝납니다. 예를 들어 registry 통신 실패를 취약점 발견으로 오인해 PR을 생성하지 않도록 한 분기입니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

수정은 `npm audit fix --package-lock-only --ignore-scripts --audit-level=high`로 시도합니다. 이후 `git diff --name-only`가 **정확히 React package-lock.json 하나**인지 확인합니다. package.json 변경이 필요하거나 high/critical이 남아 수정 명령이 실패하면 다음 발행 단계로 진행하지 않습니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

## lockfile만 고쳐도 검증은 설치부터 다시 합니다

Angular 루트에서 `npm ci --ignore-scripts --no-audit`를 실행하고, React 디렉터리에서 다음을 실행합니다.

```bash
npm ci --ignore-scripts --no-audit
npm audit --audit-level=high
npm run lint
npm test
npm run build
```

이것은 **workflow에 선언된 검증 명령**이며 이번 조사에서 실행한 테스트 결과가 아닙니다. lockfile만 바뀌어도 설치되는 의존성이 달라지므로 lint·test·build를 다시 확인하는 구조입니다. 성공하면 binary diff 형식의 `fix.patch`와 최초 audit JSON을 artifact로 올립니다. 보존 기간은 1일입니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

## PR 발행은 조건과 권한이 다른 job입니다

prepare에는 `contents: read`, checkout에는 `persist-credentials: false`가 있습니다. publish는 `actions: read`, `contents: write`, `pull-requests: write`를 받으며 다음 세 조건을 모두 만족해야 합니다.

1. prepare가 수정 필요를 반환했습니다.
2. 이벤트가 `pull_request`가 아닙니다.
3. 저장소 이름이 `apache/zeppelin`입니다.

따라서 fork나 workflow 수정 PR에서 prepare가 돌아도 같은 경로로 쓰기 PR을 발행하지 않습니다. publish는 artifact를 적용한 뒤에도 변경 파일이 허용된 lockfile 하나인지 다시 확인합니다. 이 설명은 선언된 조건을 판독한 것이고 실제 token 권한·조직 정책은 별도입니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

고정 브랜치는 `automation/npm-audit-fix-zeppelin-react`, PR의 base는 `master`입니다. 최신 관련 PR을 열린 것뿐 아니라 닫힌 것까지 조회하고 lockfile blob을 비교합니다. 예를 들어 관리자가 닫은 PR과 **동일한 lockfile**이 다시 만들어지면 같은 수정안을 반복 발행하지 않습니다. 내용이 달라지면 새 제안을 만들 수 있으므로 “한 번 닫으면 영구 비활성”은 아닙니다.

열린 기존 PR에 lockfile 외 파일이 있으면 실패합니다. 기존 원격 브랜치를 갱신할 때는 조회한 SHA를 지정한 `--force-with-lease`를 사용합니다. PR이 이미 열려 있으면 브랜치를 갱신하고, 없으면 `gh pr create --draft`로 생성합니다. merge 명령은 없습니다.

— [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) (확인: 2026-09-20)

## 수정 PR이 있다는 사실이 보장하지 않는 것

발행 전 검증은 고정된 audited SHA에 적용한 patch를 대상으로 합니다. 이후 `master`가 바뀌었을 때의 통합 결과, 실제 배포 환경, Angular 루트 의존성 전체의 audit 결과까지 보장하지 않습니다. 실무에서는 PR의 검사 revision과 현재 base, 실제 check 결과를 함께 봐야 합니다.

또한 `GITHUB_TOKEN`으로 만든 변경은 이벤트 종류에 따라 후속 CI가 달라집니다. 확인일의 GitHub 문서는 이 token의 push 이벤트는 새 workflow를 실행하지 않지만, PR의 `opened`·`synchronize`·`reopened` 이벤트는 **승인이 필요한 상태의 workflow run**을 만들 수 있다고 설명합니다. 따라서 “자동 생성 PR에서는 CI가 절대 안 돈다”거나 “생성 즉시 모든 CI가 자동으로 끝난다”고 단정하지 않습니다. prepare에서 이미 실행한 검증과 PR 생성 뒤의 CI 실행·승인을 따로 확인해야 합니다.

— [Triggering a workflow — Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow#triggering-a-workflow-from-a-workflow) (확인: 2026-09-20)

## 확인하지 못한 것

- 실제 audit report·취약점 존재·수정 성공은 **미실행**입니다 — 이 문서는 자동화 흐름을 설명하며 의존성 취약점 진단을 수행하지 않았습니다.
- Dependabot 활성화와 security PR 생성 여부는 **확인 필요**입니다 — GitHub 저장소 설정과 실행 이력을 조회하지 않았습니다.
- artifact 전달·draft PR 생성·닫힌 PR 중복 억제는 **미실행**입니다 — 원격 브랜치나 PR을 변경하는 workflow를 호출하지 않았습니다.
- 자동 생성 PR의 필수 검사 충족 여부는 **확인 필요**입니다 — 실제 ruleset과 workflow run을 조회하지 않았습니다.

*작성일: 2026-09-20*
