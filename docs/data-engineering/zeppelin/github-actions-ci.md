---
sidebar_position: 5
---

# Zeppelin의 GitHub Actions는 변경 사항을 어떻게 검증하는가

> 원문 — [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml), [Apache Zeppelin 소스 2ee180ffa](https://github.com/apache/zeppelin/tree/2ee180ffab215aa18fd167815b65bc23fcc64d1f)
>
> 확인 날짜 — 2026-09-20

> A workflow is a configurable automated process that will run one or more jobs.
>
> **번역** — workflow는 하나 이상의 job을 실행하는, 설정 가능한 자동화 프로세스입니다.
>
> — [Workflows — GitHub Docs](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows) (확인: 2026-09-20)

Zeppelin의 CI는 하나의 전체 테스트 명령이 아닙니다. `.github/workflows` 안에서 빠른 검사, Java/Interpreter 검사, 브라우저 검사, 문서 검사를 나눕니다. 각 YAML의 **event → job → matrix → step → 실패 처리**를 읽어야 “이 PR에서 무엇을 검증했는가”에 답할 수 있습니다.

## 실행 환경과 검증 범위

대상은 `/Users/pgt0409/Desktop/git/zeppelin`의 **0.13.0-SNAPSHOT**, 커밋 `2ee180ffab215aa18fd167815b65bc23fcc64d1f`입니다. 확인 날짜는 2026-09-20이며, 로컬은 macOS 15.7.4 arm64, Python 3.9.6, Node.js 22.21.1입니다. 아래 파일 조회·설정 집계는 직접 실행했습니다. **GitHub hosted runner에서 workflow 실행은 미실행**입니다. 설정이 선언하는 작업과 실제 GitHub 실행 성공·저장소 설정을 구분합니다.

## `.github`의 파일 구성을 먼저 확인합니다

```bash
git ls-files .github
```

```text
.github/PULL_REQUEST_TEMPLATE
.github/actions/tune-runner-vm/action.yml
.github/dependabot.yml
.github/workflows/core.yml
.github/workflows/docs.yml
.github/workflows/frontend.yml
.github/workflows/npm-audit-remediation.yml
.github/workflows/quick.yml
.github/workflows/stale.yml
```

`workflows/*.yml`은 실행 entrypoint이고 `actions/tune-runner-vm/action.yml`은 다른 workflow에서 부르는 composite action입니다. `dependabot.yml`은 Dependabot 설정, `PULL_REQUEST_TEMPLATE`은 작성 양식이므로 같은 방식으로 job이 실행되는 파일이 아닙니다.

— [action.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/actions/tune-runner-vm/action.yml) (확인: 2026-09-20)
— [dependabot.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/dependabot.yml) (확인: 2026-09-20)
— [PULL_REQUEST_TEMPLATE](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/PULL_REQUEST_TEMPLATE) (확인: 2026-09-20)

| 파일 | 주요 역할 | 근거 |
| --- | --- | --- |
| `quick.yml` | RAT 라이선스·Maven validate | [quick.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/quick.yml) |
| `core.yml` | Java·Interpreter·통합 테스트와 기본 빌드 | [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) |
| `frontend.yml` | React npm audit·Playwright·classic UI·Selenium | [frontend.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/frontend.yml) |
| `docs.yml` | Jekyll 빌드·내부 링크 검사 | [docs.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/docs.yml) |
| `npm-audit-remediation.yml` | React lockfile 수정안을 검증해 draft PR 생성 | [npm-audit-remediation.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/npm-audit-remediation.yml) |
| `stale.yml` | 오래 비활성인 PR 정리 설정 | [stale.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/stale.yml) |

표의 모든 소스는 확인 날짜 2026-09-20, 위 고정 커밋 기준입니다. 아래는 네 개 CI workflow의 검증 범위를 설명합니다.

## PR의 대상 브랜치와 push 브랜치를 구분합니다

`core`, `frontend`, `quick`은 push에서 `dependabot/**`를 제외하고, PR에서는 대상 브랜치 `master` 또는 `branch-*`에 반응하도록 선언돼 있습니다. `docs`는 여기에 `docs/**` 또는 자기 workflow 파일 변경이라는 path 조건이 추가됩니다.

```yaml
on:
  push:
    branches-ignore:
      - 'dependabot/**'
  pull_request:
    branches:
      - master
      - 'branch-*'
```

예를 들어 `dependabot/...` 브랜치의 push가 제외돼도 그 브랜치에서 `master`로 여는 PR 이벤트는 별도입니다. 또한 `docs/a.md`만 고치는 PR도 세 일반 workflow에는 path 제외가 없으므로 **문서 workflow만 실행되는 구성은 아닙니다.** 이 예시는 YAML 조건 판독이며 실제 PR 실행 기록이 아닙니다.

— [quick.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/quick.yml) (확인: 2026-09-20)
— [docs.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/docs.yml) (확인: 2026-09-20)

— [Workflow syntax — on.pull_request.branches](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpull_requestpull_request_targetbranchesbranches-ignore) (확인: 2026-09-20)

네 CI workflow의 권한 선언은 `contents: read`입니다. 이 설정만으로 병합 필수 검사 목록은 알 수 없습니다. 어떤 check가 merge를 막는지는 저장소 ruleset/branch protection도 확인해야 합니다.

— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

## `quick`: 빠른 검사도 POM 실행을 포함합니다

Ubuntu 24.04와 Temurin 11에서 두 job을 실행합니다.

```bash
# CI에 선언된 명령 — 전체 명령은 로컬 미실행
./mvnw apache-rat:check -Prat -B --no-transfer-progress
./mvnw validate -Pinclude-hadoop -B --no-transfer-progress
```

첫 명령은 라이선스 검사를, 두 번째는 validate phase를 수행합니다. 이름이 quick이라고 해서 파일 이름만 확인하는 검사는 아닙니다. 예를 들어 Spark POM의 다운로드 goal은 validate에 연결돼 있습니다. 실행 시간을 추정할 때 phase 이름과 실제 plugin binding을 함께 봐야 합니다.

— [quick.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/quick.yml) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/spark/interpreter/pom.xml#L234-L255) (확인: 2026-09-20)

## `core`: job별로 설치와 테스트를 나눕니다

대부분 job은 Ubuntu 24.04, Temurin 11·17 matrix, `fail-fast: false`를 사용합니다. 이것은 matrix 한 조합이 실패했을 때 다른 조합을 즉시 취소하지 않는 설정이지, 실패를 성공으로 바꾸는 설정이 아닙니다.

| job | 환경·조합 | 실제 검증 경계 |
| --- | --- | --- |
| `core-modules` | Java 11·17 | 일부 모듈을 먼저 install, plugins package, Spark 테스트를 제외한 core verify |
| `interpreter-test-non-core` | Java 11·17 | 15개 Interpreter 모듈 install 후 verify |
| `interpreter-test-jupyter-python` | Java 11·17, Python 3.9 | Python·Jupyter 모듈 install 후 test |
| `zeppelin-integration-test` | Java 11·17, MySQL | 지정된 client·session·shell·JDBC 통합 테스트 |
| `flink-test-and-flink-integration-test` | Java 11/Flink 1.19, Java 17/Flink 1.20, Python 3.9 | `include`에 열거된 두 조합의 Flink verify |
| `spark-integration-test` | Java 11·17 | 이름을 지정한 Spark 3.2·3.3 관련 통합 테스트 |
| `spark-test` | Java 11·17, Python 3.9 | Spark·Scala 조합별 순차 verify |
| `livy-0-8-with-spark-3-2-under-python39` | Java 11, Python 3.9 | Livy 0.8.0-incubating, Spark 3.2.4를 내려받아 verify |
| `default-build` | Java 11·17 | profile 없이 `clean verify -DskipTests` |
| `windows-build` | Windows latest, Java 17 | `mvnw.cmd clean package -DskipTests` |

— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

`default-build`의 녹색은 기본 빌드 경로를 통과했다는 신호이며 테스트를 실행했다는 뜻은 아닙니다. 또 여러 job은 `install -DskipTests`로 의존 산출물을 로컬 Maven 저장소에 준비한 뒤 별도 `test`/`verify`를 수행합니다. 앞 단계가 테스트를 생략했다고 뒤 단계까지 생략한다고 읽으면 안 됩니다.

`-pl`은 대상 모듈 선택, `-am`은 필요한 reactor 의존 모듈 추가, `-amd`는 선택 모듈에 의존하는 프로젝트 추가입니다. `core`의 plugins 단계는 `-amd`를 쓰므로 `-am`과 바꿔 읽으면 실행 범위가 달라집니다.

— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

— [Maven CLI Options](https://maven.apache.org/ref/3.9.9/maven-embedder/cli.html) (확인: 2026-09-20)

Spark job 안의 명령은 병렬 matrix 축이 아니라 **각 job 내부의 순차 step**입니다.

| Spark profile | Scala profile | Java 조건 |
| --- | --- | --- |
| 3.3 | 2.12 | 11·17 |
| 3.3 | 2.13 | 11·17 |
| 3.4 | 2.13 | 11·17 |
| 3.5 | 2.13 | 11·17 |
| 4.0 | 2.13 | 17만 |

— [core.yml — spark-test](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

따라서 Java 11에서 Spark 4.0 step이 생략되는 것은 테스트 성공과 다릅니다. 테스트 클래스가 실제로 몇 개 실행됐는지도 report를 확인해야 합니다. 루트 Surefire에는 `failIfNoTests=false`, `failIfNoSpecifiedTests=false`가 있어 명령 성공만으로 특정 테스트 존재·실행을 증명할 수 없습니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/pom.xml#L680-L691) (확인: 2026-09-20)

## runner 준비와 캐시는 실행 조건입니다

`core`는 기본 run shell을 `bash -l {0}`로 설정해 conda 사용 환경을 준비합니다. Maven 캐시는 `.m2/repository`와 Spark·Python 관련 캐시를 포함하되 `org/apache/zeppelin` 산출물을 제외합니다. key는 OS와 POM hash 기반이고 Java 버전은 별도 key 요소에 없습니다. 이 설정은 의존 다운로드 재사용을 보여 줄 뿐 캐시가 항상 hit하거나 모든 조합이 독립적이라는 뜻은 아닙니다.

— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

`tune-runner-vm`은 Linux에서 `eth0`의 IP, hostname의 전체·짧은 이름을 `/etc/hosts`에 추가합니다. 이름과 달리 CPU·메모리·커널 파라미터를 튜닝하지 않습니다. 이 action의 최소 효과는 runner 자신의 hostname 역조회에 필요한 주소 항목을 추가하는 것입니다. macOS에서 같은 효과가 나는 action으로 소개하면 틀립니다. 이번에는 시스템 파일을 변경하는 action을 실행하지 않았습니다.

— [action.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/actions/tune-runner-vm/action.yml) (확인: 2026-09-20)

## `frontend`: 인증 모드와 저장소 종류를 나눠 검사합니다

`npm-audit` job은 `.nvmrc`의 Node 버전을 사용하고 `zeppelin-web-angular/projects/zeppelin-react`에서 `npm ci --ignore-scripts`와 `npm audit --audit-level=high`를 실행합니다. Angular 루트 전체 audit은 향후 작업으로 주석에 남아 있습니다. 따라서 이 job을 전체 프런트엔드의 의존성 안전성 검사라고 설명하면 범위가 과장됩니다.

— [frontend.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/frontend.yml) (확인: 2026-09-20)
— [.nvmrc](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-web-angular/.nvmrc) (확인: 2026-09-20)

Playwright job의 matrix는 anonymous/auth와 Python 3.9입니다. Java 11을 쓰고 일반 E2E는 `VFSNotebookRepo`를 사용합니다. auth 조합은 Shiro template을 복사하고 테스트 사용자 role을 조정합니다. anonymous 조합에서만 WebSocket 계약·Notebook parity 시나리오 검사와 classic UI 단위 테스트를 실행합니다. classic UI E2E도 anonymous 조합에 한정됩니다.

이어 revision isolation step에서는 **GitNotebookRepo로 바꾸고 별도 임시 Notebook 디렉터리**에서 서버를 직접 시작합니다. **추측:** 일반 VFS 테스트만으로 Git revision 동작을 검증할 수 없기 때문에 분리한 것으로 해석할 수 있습니다. workflow는 이 step에 cleanup trap도 둡니다.

— [frontend.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/frontend.yml) (확인: 2026-09-20)

Playwright report 업로드와 로그 출력은 `if: always()`이며 report 보존 기간은 3일입니다. Selenium/Spark 3.5 job도 별도로 남아 있어 “모든 브라우저 테스트가 Playwright로 교체됐다”고 읽으면 안 됩니다. 실제 실패 조사는 실패 step, 해당 인증 조합 report, Zeppelin 로그를 함께 봐야 합니다.

— [frontend.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/frontend.yml) (확인: 2026-09-20)

## `docs`: 링크 검사가 있어도 깨진 링크를 막지는 않습니다

Ruby 3.3으로 Jekyll 사이트를 빌드한 뒤 html-proofer 5.2.2를 실행합니다. 배포 시에만 생기는 `JB.BASE_PATH` 접두사를 제거해 내부 파일 경로를 검사합니다. 외부 링크와 내부 fragment 검사는 끄고, `href` 없는 anchor도 허용합니다.

가장 중요한 조건은 링크 검사 step의 **`continue-on-error: true`**입니다. 예를 들어 내부 페이지 링크가 깨졌더라도 해당 step 오류만으로 job이 실패하는 구성은 아닙니다. 반면 앞의 Jekyll build step에는 이 옵션이 없습니다. 이 문서 저장소의 Docusaurus 빌드 규칙과 Zeppelin 저장소의 Jekyll CI를 혼동해서는 안 됩니다.

— [docs.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/docs.yml) (확인: 2026-09-20)

## 확인하지 못한 것

- GitHub Actions의 실제 성공·실패, test count, 소요 시간은 **미실행**입니다 — 이번 작업은 YAML·POM 판독과 로컬 파일 검사입니다.
- 병합 필수 check와 fork PR 승인 조건은 **확인 필요**입니다 — 저장소 ruleset과 Actions 운영 설정을 조회하지 않았습니다.
- Jekyll 링크 오류 report와 Playwright report 내용은 **확인 필요**입니다 — 특정 workflow run의 artifact를 내려받지 않았습니다.
- 캐시 효과·runner hostname 변경 효과는 **미측정**입니다 — Linux hosted runner를 실행하지 않았습니다.

*작성일: 2026-09-20*
