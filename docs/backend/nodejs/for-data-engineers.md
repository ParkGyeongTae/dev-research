---
sidebar_position: 6
---

# 데이터 엔지니어는 실무에서 Node.js를 어디서 만나는가

Node.js로 서비스를 짜지 않아도 Node는 계속 설치하게 됩니다. **내가 쓰는 도구가 Node 위에서 돌기 때문**입니다.

이 문서가 답하는 질문은 하나입니다 — **"Node를 직접 쓰지도 않는데 왜 계속 깔라고 하는가."** 설치 경로를 고르는 법이나 npm의 동작 자체는 여기서 다루지 않습니다.
답을 미리 요약하면, Node가 끼어드는 경로는 셋이고 **그중 무엇이냐에 따라 필요한 자리와 고정해야 할 강도가 다릅니다.**

## 확인 환경

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517), arm64 |
| Node | v22.21.1 (npm 10.9.4) |
| 확인 날짜 | 2026-09-06 |

아래 버전 정보는 각 프로젝트의 공식 문서와 **저장소의 `package.json`을 직접 조회한 결과**입니다. 조회 명령도 함께 적었습니다.

---

## 1. 경로 A — 도구의 런타임이 Node입니다

가장 많이 걸리는 경우입니다. **Python으로 인프라 코드를 짜는데 Node를 깔라고 합니다.**

AWS CDK 공식 문서 원문입니다 (출처: `https://docs.aws.amazon.com/cdk/v2/guide/prerequisites.html`, 확인 2026-09-05).

> All AWS CDK developers, regardless of the supported programming language that you will use, require Node.js 22.x or later. All supported programming languages use the same backend, which runs on Node.js.

읽어야 할 문장은 두 번째입니다. **모든 지원 언어가 같은 백엔드를 쓰고, 그 백엔드가 Node 위에서 돕니다.** Python으로 CDK 스택을 써도 실제 합성(synth)은 Node 프로세스가 합니다. 그래서 Python 버전만 맞춰 놓고 Node를 빼먹으면 `cdk synth`가 실행 자체를 못 합니다.

같은 구조가 반복되는 도구들이 있습니다 — CLI가 npm으로 배포되고, 사용하는 언어와 무관하게 Node 런타임을 요구합니다. npm 레지스트리를 직접 조회한 결과입니다.

```bash
$ for p in "@anthropic-ai/claude-code" "aws-cdk" "sql-formatter"; do … done
@anthropic-ai/claude-code -> 2.1.263
aws-cdk -> 2.1140.0
sql-formatter -> 15.8.2
```

**npm은 JavaScript 라이브러리 저장소이기 전에 CLI 배포 채널입니다.** Homebrew나 apt에 없는 도구가 npm에는 있는 경우가 흔하고, 그래서 "JavaScript를 안 쓰는데 npm이 필요한" 상황이 생깁니다.

이 경로에서 Node는 **실행할 때마다** 필요합니다. 빼면 도구가 안 돕니다.

---

## 2. 경로 B — 웹 UI를 가진 데이터 도구

우리가 매일 보는 데이터 도구의 화면은 대부분 Node로 빌드되고, **일부는 Node로 실행됩니다.** 이 둘은 성격이 완전히 다르므로 구분해야 합니다.

### 빌드에만 필요한 경우 — Apache Superset, Apache Airflow

저장소의 `package.json`을 직접 조회했습니다.

```bash
$ curl -s https://raw.githubusercontent.com/apache/superset/master/superset-frontend/package.json | grep -A6 '"engines"'
  "engines": {
    "node": "^24.16.0",
    "npm": "^11.13.0"
  },

$ curl -s https://raw.githubusercontent.com/apache/airflow/main/airflow-core/src/airflow/ui/package.json | head -c 300
{
  "name": "ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
```

- **Superset(master 브랜치, 조회 2026-09-06)** — 프런트엔드 빌드에 Node `^24.16.0`, npm `^11.13.0`을 요구합니다. **범위가 좁다**는 점을 눈여겨봅니다 — §4에서 이게 걸립니다.
- **Airflow(main 브랜치, 조회 2026-09-06)** — `airflow-core/src/airflow/ui`가 Vite 기반이고 Node `>=22`를 요구합니다.

둘 다 **런타임은 Python**입니다. Node는 정적 자산을 만들 때만 필요하고, 배포된 산출물을 쓰는 쪽은 Node가 없어도 됩니다. 그래서 **소스에서 빌드할 때만** 마주칩니다 — PyPI 휠이나 공식 이미지를 쓰면 아예 안 만납니다.

이 성질은 컨테이너 이미지를 짤 때 바로 쓰입니다. **빌드 단계와 런타임 단계를 나누면**(멀티스테이지) 정적 산출물만 최종 이미지에 복사하면 되고, 런타임 이미지에는 Node가 없어도 됩니다. 반대로 이 구분을 모르면 `python:3.12-slim` 베이스에서 자산 빌드를 시도하다 `node: command not found`로 CI가 죽습니다 — 그 이미지에는 Node가 없습니다.

**확인 필요:** 위 두 값은 각 프로젝트의 개발 브랜치 기준입니다. 특정 릴리스 태그에서의 요구 버전은 그 태그의 `package.json`을 따로 봐야 합니다.

### 실행 자체가 Node인 경우 — Kibana

Kibana는 다릅니다. 공식 문서 원문입니다 (출처: `https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana`, 확인 2026-09-05).

> Because Kibana runs on Node.js, we include the necessary Node.js binaries for these platforms.
>
> Running Kibana against a separately maintained version of Node.js is not supported.

즉 **Kibana 서버 프로세스 자체가 Node 애플리케이션**이고, Elastic이 Node 바이너리를 배포판에 넣어 보냅니다. 저장소에서 확인한 고정 버전입니다.

```bash
$ curl -s https://raw.githubusercontent.com/elastic/kibana/main/package.json | grep -A5 '"engines"'
  "engines": {
    "node": "24.19.0",
    "yarn": "^1.22.19"
  },

$ curl -s https://raw.githubusercontent.com/elastic/kibana/main/.node-version
24.19.0
```

**범위가 아니라 정확히 한 버전입니다**(`24.19.0`, main 브랜치 조회 2026-09-06). §1의 CDK가 `22.x or later`로 열어 둔 것과 대조적입니다.

인용문의 두 번째 줄이 실무 규칙으로 이어집니다. 취약점 스캐너가 Kibana 배포판 **내부의** Node 버전을 지적하는 일이 있는데, 거기서 바이너리를 손으로 바꾸면 지원 대상에서 벗어나고 기동이 깨질 수 있습니다. **Node를 바꾸는 게 아니라 Kibana 버전을 올립니다.**

그래서 **"Node 보안 패치 나왔으니 올려라"는 요청이 오면, 그 Node가 누구 것인지부터 확인해야 합니다.** 내가 설치한 Node인지, 도구가 안에 싣고 온 Node인지에 따라 대응이 정반대입니다.

---

## 3. 경로 C — 문서 사이트·사내 포털

데이터 팀이 데이터 카탈로그·런북·의사결정 기록을 정적 사이트로 두는 경우가 많습니다. 그 생성기(Docusaurus, VitePress 등)가 Node 위에 있습니다.

이 저장소가 그 예입니다. `package.json`을 직접 확인했습니다.

```bash
$ grep -A2 '"engines"' package.json
  "engines": {
    "node": ">=20.0"
  },
```

빌드 산출물은 정적 HTML이므로 **서빙하는 쪽에는 Node가 필요 없습니다.** 경로 B의 Superset·Airflow와 같은 성격입니다 — CI 이미지에는 있어야 하고 웹 서버에는 없어도 됩니다.

---

## 4. 세 경로에 공통으로 걸리는 것

경로가 무엇이든 "Node가 있다"만으로는 부족합니다. **버전이 맞아야 하고, 그걸 확인해 주는 장치가 약합니다.**

### `engines`는 설치를 막지 않습니다

§2의 Superset처럼 `"node": "^24.16.0"`으로 좁게 잠근 프로젝트를 Node 22로 빌드하면 어떻게 되는지, 같은 조건을 만들어 직접 확인했습니다 (Node v22.21.1 / npm 10.9.4, 2026-09-06).

```bash
$ cat package.json
{ "name": "engtest", "version": "1.0.0", "engines": { "node": "^24.16.0" }, "dependencies": { "sql-formatter": "15.8.2" } }

$ npm install --no-audit --no-fund
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'engtest@1.0.0',
npm warn EBADENGINE   required: { node: '^24.16.0' },
npm warn EBADENGINE   current: { node: 'v22.21.1', npm: '10.9.4' }
npm warn EBADENGINE }

added 9 packages in 976ms
```

`warn`이 찍히고 **설치는 성공합니다.** 즉 **`npm install`이 지나간 것은 버전이 맞다는 증거가 아닙니다.** CI 로그에서 이 경고는 다른 출력에 묻히기 쉽고, 그다음에 빌드가 이해할 수 없는 오류로 죽거나 산출물이 미묘하게 달라집니다.

그래서 프로젝트를 처음 빌드할 때는 루트의 `.nvmrc`·`.node-version`·`package.json`의 `engines`를 **먼저 읽고** 그 버전으로 맞춥니다. §2에서 Kibana의 `.node-version`을 확인한 것이 그 절차입니다.

### `npx`는 버전을 고정하지 않습니다

`npx <패키지>`는 로컬에 없으면 레지스트리에서 받아 **그 시점의 최신 버전을** 실행합니다. 그래서 없던 도구가 갑자기 돌아가고, 몇 달 뒤 다른 결과를 냅니다.

§1에서 본 대로 npm은 CLI 배포 채널이므로 이 편의가 자주 쓰이는데, **재현성이 필요한 자리에서는 그대로 위험이 됩니다.** CI에서 쓰는 도구는 `npx tool@1.2.3`처럼 버전을 박거나 `devDependencies`에 넣습니다.

---

## 5. 그래서 Node로 직접 짜게 되는 것은 무엇인가

**의견입니다.** 데이터 엔지니어가 Node로 새로 짤 만한 것은 좁습니다. I/O만 하고 CPU를 거의 안 쓰는 얇은 계층입니다.

- **웹훅 수신기** — 외부 SaaS가 쏘는 이벤트를 받아 검증하고 Kafka/큐에 넣는 정도.
- **여러 API를 합치는 조회 계층** — 팬아웃 호출이 대부분이고 응답 합치는 일만 하는 경우.
- **팀 내부용 작은 화면** — 이미 프런트엔드 코드가 JavaScript면 서버까지 같은 언어로 두는 편이 유지보수가 싸다는 판단이 설 때.

반대로 **파이프라인 본체(추출·변환·적재)를 Node로 짜는 선택은 권하지 않습니다.** 이유는 두 가지이고 둘 다 취향 문제가 아닙니다.

1. **64비트 정수가 조용히 깨집니다.** JavaScript의 `number`는 IEEE 754 double 하나뿐이라 2^53을 넘는 정수가 유실됩니다. 직접 돌려본 결과입니다 (Node v22.21.1, 2026-09-06).

   ```bash
   $ node -e "console.log(JSON.parse('{\"id\":9007199254740993}').id, Number.MAX_SAFE_INTEGER)"
   9007199254740992 9007199254740991
   ```

   에러도 경고도 없이 `…993`이 `…992`가 됩니다. Snowflake ID·Kafka offset·`BIGINT` 기본키를 JSON으로 중계하면 키가 충돌합니다.

2. **수치·데이터프레임 생태계가 얇습니다.** pandas·Arrow·Polars에 해당하는 성숙한 대체재가 없습니다.

즉 §1~§3처럼 **도구가 요구해서 Node를 까는 것**과, 파이프라인을 Node로 짜는 것은 전혀 다른 결정입니다. 앞의 것은 선택지가 없고, 뒤의 것은 거의 항상 다른 선택지가 있습니다.

---

*작성일: 2026-09-06*
