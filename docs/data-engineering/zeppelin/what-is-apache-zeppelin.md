---
sidebar_position: 1
---

# Apache Zeppelin이란 무엇인가

> 원문 — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html), [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html), [Download Apache Zeppelin](https://zeppelin.apache.org/download.html), 그리고 로컬 레포 `apache/zeppelin` 커밋 [`e816bf1b7`](https://github.com/apache/zeppelin/tree/e816bf1b76b50282cc32b284cdb8755f932f657e)
>
> 확인 날짜 — 2026-09-18 (2026-09-13 작성분을 로컬 소스와 대조해 개정했습니다.)
>
> 검증 상태 — 공식 문서로 정의를 확인하고, 그 정의가 현재 `master` 소스와 실제로 일치하는지 레포에서 대조했습니다. Zeppelin 프로세스를 기동해 Notebook을 실행하지는 않았습니다.

## 한 문장으로 말하면

Apache Zeppelin은 여러 언어와 데이터 처리 백엔드를 Interpreter로 연결하고, 코드·결과·설명을 Notebook 안에 함께 남기는 웹 기반 Notebook입니다.

> Multi-purpose notebook which supports 20+ language backends
>
> **번역** — 20개가 넘는 언어 백엔드를 지원하는 다목적 Notebook입니다.
>
> — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html) (확인: 2026-09-13)

Zeppelin 자체가 SQL 엔진이나 분산 처리 엔진인 것은 아닙니다. Zeppelin은 사용자의 Paragraph를 Interpreter에 전달하고 실행 결과를 Notebook에 표시·저장·공유하는 계층입니다. 이는 공식 정의를 바탕으로 한 해석입니다.

## 이 문서가 기준으로 삼는 소스

```text
레포:   /Users/pgt0409/Desktop/git/zeppelin-pgt
원격:   origin   https://github.com/ParkGyeongTae/zeppelin.git (fork)
        upstream git@github.com:apache/zeppelin.git
브랜치: upstream-master
커밋:   e816bf1b76b50282cc32b284cdb8755f932f657e (2026-09-14)
버전:   0.13.0-SNAPSHOT
```

`git branch -r --contains e816bf1b7`로 확인한 결과 이 커밋은 `upstream/master`, 즉 `apache/zeppelin`의 `master`에 포함되어 있습니다. 따라서 이 문서의 GitHub 링크는 fork가 아니라 Apache 본 레포에서 해석됩니다.

**버전 간격에 주의해야 합니다.** 공식 다운로드 페이지의 최신 릴리스는 0.12.1이고 `latest` 문서는 0.12.0 기준인 반면, 이 레포의 `master`는 **0.13.0-SNAPSHOT**입니다. 즉 릴리스보다 앞서 있습니다. 아래 "공식 문서와 현재 master가 어긋나는 곳"에서 이 차이가 실제로 문제가 되는 사례를 다룹니다.

## 핵심 구조

### Notebook — 실행 가능한 분석 문서

Notebook은 Paragraph를 담는 문서 단위입니다. 공식 UI 문서는 Paragraph를 코드 영역과 결과 영역을 가진 구성 요소로 설명합니다.

```text
Notebook: 일별 주문 데이터 점검

Paragraph 1 — 분석 목적과 기준일 설명
Paragraph 2 — 원천 데이터 조회
Paragraph 3 — 중복 주문 수 계산
Paragraph 4 — 결과 표와 해석
```

위 블록은 구조를 보여 주는 개념 예시이며 이번에 Zeppelin에서 실행한 결과가 아닙니다. SQL·Python·Markdown 등의 Paragraph를 섞을 수 있지만 서로 다른 Interpreter의 변수가 자동으로 공유된다고 가정하면 안 됩니다. 공유 범위는 Interpreter binding mode와 scope에 따라 달라집니다.

— [Explore Apache Zeppelin UI](https://zeppelin.apache.org/docs/latest/quickstart/explore_ui.html) (확인: 2026-09-13)

### Paragraph — 실행과 결과의 경계

Paragraph는 코드와 그 실행 결과가 함께 표시되는 실행 단위입니다.

```text
%spark.pyspark

orders = spark.table("sales.orders")
orders.groupBy("order_date").count().show()
```

이 코드는 `spark.pyspark` Interpreter를 선택하는 문법 예시일 뿐이며 이 저장소에서는 실행하지 않았습니다. 실제 실행에는 Spark 환경과 해당 테이블이 필요합니다.

Paragraph 하나가 실행될 때 서버 안에서 무슨 일이 일어나는지는 [Paragraph 실행 흐름 문서](./paragraph-execution-flow.md)에서 소스 기준으로 추적했습니다.

### Interpreter — 코드와 백엔드를 연결하는 플러그인

> A Zeppelin interpreter is a plug-in which enables Zeppelin users to use a specific language/data-processing-backend.
>
> **번역** — Zeppelin Interpreter는 사용자가 특정 언어나 데이터 처리 백엔드를 사용할 수 있게 하는 플러그인입니다.
>
> — [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-13)

각 Paragraph의 첫 부분에 `%interpreter_group.interpreter_name` 형식으로 Interpreter를 지정합니다.

```text
%jdbc(postgresql)

SELECT order_date, COUNT(*)
FROM orders
GROUP BY order_date;
```

실행에는 JDBC Interpreter 설정, PostgreSQL JDBC driver, 접속 정보와 권한이 별도로 필요합니다. 예시만으로 실제 데이터베이스에 접속되는 것은 아닙니다.

### Interpreter Group — JVM 프로세스와 Interpreter의 묶음

같은 Interpreter Group의 Interpreter들은 하나의 JVM 프로세스에서 동작하며 함께 시작·중지될 수 있습니다.

소스에서 이 관계는 `ManagedInterpreterGroup`이 확정합니다. 이 클래스는 group 하나당 `remoteInterpreterProcess` 필드를 **하나만** 가지며, 이미 있으면 재사용하고 없을 때만 생성합니다.

```java
synchronized (interpreterProcessCreationLock) {
  if (remoteInterpreterProcess == null) {
    remoteInterpreterProcess = interpreterSetting.createInterpreterProcess(id, userName, properties);
    remoteInterpreterProcess.start(userName);
  }
  return remoteInterpreterProcess;
}
```

즉 "Interpreter Group = Interpreter JVM 하나"는 비유가 아니라 자료 구조 수준의 사실입니다. 같은 그룹으로 묶으면 프로세스 수를 줄일 수 있지만, 하나의 Interpreter JVM 장애가 같은 그룹의 여러 실행에 영향을 줍니다.

— [ManagedInterpreterGroup.java#L66-L91](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/ManagedInterpreterGroup.java#L66-L91) (확인: 2026-09-18)

## 이 레포에 실제로 들어 있는 Interpreter

"20+ language backends"라는 공식 문구가 이 레포에서 어떤 숫자인지 확인했습니다. 각 모듈의 `src/main/resources/interpreter-setting.json`을 모두 읽은 결과 **Interpreter Group 23개, Interpreter 40개**가 선언되어 있습니다.

| Group | Interpreter |
| --- | --- |
| `spark` | `spark`, `sql`, `pyspark`, `ipyspark` |
| `flink` | `flink`, `bsql`, `ssql`, `pyflink`, `ipyflink` |
| `python` | `python`, `ipython`, `sql`, `conda`, `docker` |
| `livy` | `spark`, `sql`, `pyspark`, `pyspark3`, `shared` |
| `jdbc` | `sql` |
| `sh` | `sh`, `terminal` |
| `angular` | `angular`, `ng` |
| `md` | `md` |
| 그 외 15개 그룹 | `bigquery`, `cassandra`, `dev`, `elasticsearch`, `file`(`hdfs`), `flink-cmd`, `groovy`, `hbase`, `influxdb`, `java`, `jupyter`, `mongodb`, `neo4j`, `spark-submit`, `sparql` 각 1개 |

`dev` 그룹(`helium-dev` 모듈)은 기본 빌드에 포함되지 않고 `-Phelium-dev` profile에서만 빌드됩니다. 빌드 대상 모듈이 profile에 따라 달라지는 문제는 [Maven 빌드 명령 문서](./maven-build-command.md)에서 다룹니다.

## 공식 문서와 현재 master가 어긋나는 곳

공식 `latest` 문서(0.12.0)를 그대로 읽고 이 레포의 `master`에 적용하면 틀리는 지점이 있습니다. 확인한 사례는 다음과 같습니다.

### SparkR과 R Interpreter는 master에 없습니다

공식 문서와 이전 판 문서는 Spark 그룹에 SparkR이 포함된다고 설명하지만, 현재 `master`의 `spark` 그룹은 `spark`, `sql`, `pyspark`, `ipyspark` 네 개뿐입니다. SparkR과 R Interpreter는 커밋 `0f0a2d59b` **[ZEPPELIN-6430] Remove SparkR and R interpreter** (2026-07-07)에서 제거되었습니다. 레포에 남아 있는 `rlang/` 디렉터리는 `target/`만 남은 빌드 잔재이며 루트 POM의 `<modules>`에도 없습니다.

```bash
$ grep -rn 'SparkRInterpreter' --include='*.java' .
# (결과 없음)
```

### 기본 UI는 new UI입니다

`ZEPPELIN_DEFAULT_UI`의 기본값은 `new`입니다. 따라서 서버 context path에는 Angular 기반 new UI가 붙고, classic UI는 `/classic`으로 밀려납니다. 그리고 classic UI 모듈인 `zeppelin-web`은 **기본 빌드 대상이 아니며** `-Pweb-classic` profile에서만 빌드됩니다.

```text
ZEPPELIN_DEFAULT_UI("zeppelin.default.ui", "new")
ZEPPELIN_ANGULAR_WAR("zeppelin.angular.war", "zeppelin-web-angular/dist/zeppelin")
ZEPPELIN_WAR("zeppelin.war", "zeppelin-web/dist")
```

— [ZeppelinConfiguration.java#L1006-L1010](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L1006-L1010) (확인: 2026-09-18)

### 결론

**공식 문서는 "무엇을 하려는 기능인가"의 근거로 쓰고, "지금 이 코드에 있는가"는 레포에서 다시 확인해야 합니다.** 이 레포에는 공식 문서의 소스인 `docs/` 디렉터리가 그대로 들어 있으므로, 웹사이트 대신 `docs/usage/interpreter/overview.md`처럼 해당 커밋의 문서를 읽으면 버전 간격 문제를 줄일 수 있습니다.

## Interpreter Binding Mode와 scope

공식 문서는 binding mode와 scope를 구분합니다.

- `shared`, `scoped`, `isolated` — Interpreter 인스턴스와 프로세스를 어떻게 공유하는가
- `per user`, `per note` — 그 공유 범위를 사용자 또는 Notebook 중 어디에 적용하는가

아래 표는 `per note` scope 기준입니다.

| mode | 실행 관계 | 직접 공유 | 주요 영향 |
| --- | --- | --- | --- |
| `shared` | 모든 Note가 하나의 Interpreter JVM과 하나의 session을 공유 | 가능 | 상태와 프로세스 장애 영향 범위가 큽니다. |
| `scoped` | Note마다 별도 session을 사용하지만 Interpreter JVM은 공유 | 불가. `ResourcePool`을 통한 객체 공유는 가능합니다. | session은 분리되지만 JVM 장애는 공유됩니다. |
| `isolated` | Note마다 별도 Interpreter process와 session을 사용 | 불가. `ResourcePool` 예외는 있습니다. | 격리는 강하지만 프로세스·자원·시작 비용이 커집니다. |

`per user` scope에서는 위 관계가 Note가 아니라 사용자 단위로 적용됩니다. 예를 들어 `scoped + per user`에서는 서로 다른 사용자의 Note가 같은 JVM 장애 영향을 받을 수 있습니다. 따라서 "scoped이면 항상 Note별 프로세스가 분리된다"라고 읽으면 안 됩니다.

— 레포 내 문서 [docs/usage/interpreter/interpreter_binding_mode.md#L78-L85](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/docs/usage/interpreter/interpreter_binding_mode.md#L78-L85) (확인: 2026-09-18)

### 이 표가 소스에서 어떻게 구현되는가

binding mode 분기는 프로세스를 만드는 쪽이 아니라 **식별자를 만드는 쪽**에 있습니다. `InterpreterSetting`은 실행 맥락으로부터 두 개의 문자열을 계산하고, 그 문자열이 달라지는지 여부가 곧 격리 수준입니다.

```text
getInterpreterGroupId(ctx)     → 어떤 Interpreter JVM을 쓸 것인가
  isolated + per user   → "<id>-<user>"
  isolated + per note   → "<id>-<noteId>"
  그 외                 → "<id>-shared_process"

getInterpreterSessionId(ctx)   → 그 JVM 안에서 어떤 session을 쓸 것인가
  scoped + per user&note → "<user>:<noteId>"
  scoped + per user      → "<user>"
  scoped + per note      → "<noteId>"
  그 외                  → "shared_session"
```

- `isolated`는 **group id**를 갈라 서로 다른 `ManagedInterpreterGroup`을 만들고, 그 결과 프로세스가 분리됩니다.
- `scoped`는 group id가 `shared_process`로 같으므로 **프로세스는 하나**이고, **session id**만 갈라집니다.
- `shared`는 둘 다 고정값이므로 프로세스와 session이 모두 하나입니다.

이 `sessionId`는 나중에 Thrift `interpret(sessionId, className, script, context)` 호출의 첫 인자로 그대로 전달됩니다.

— [InterpreterSetting.java#L405-L448](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/InterpreterSetting.java#L405-L448) (확인: 2026-09-18)

## 데이터 엔지니어링에서의 사용 범위

```text
데이터 소스
  ↓
JDBC·Spark·Flink·Python 등의 Interpreter
  ↓
Notebook의 Paragraph에서 조회·변환·검증
  ↓
표·그래프·Markdown 설명
  ↓
팀과 Notebook 공유 또는 결과 게시
```

이 흐름은 공식 문서가 제시하는 데이터 수집·탐색·변환·분석·시각화/협업 범위를 구체화한 것입니다. 예를 들어 이벤트 데이터 품질 Notebook은 다음처럼 구성할 수 있습니다. 이는 권장 설계 예시이지 실행 결과가 아닙니다.

1. JDBC 또는 Spark로 최근 적재 구간을 조회합니다.
2. 필수 컬럼의 NULL 비율과 예상 범위를 확인합니다.
3. 중복 키와 분포를 계산합니다.
4. 결과를 표와 그래프로 표시합니다.
5. 실패한 검증과 원인을 Markdown으로 남깁니다.

Notebook은 탐색과 설명에는 유용하지만 운영 파이프라인의 재처리·멱등성·알림·배포·관측성을 자동으로 보장하지는 않습니다. 예약 실행을 사용하더라도 이 설계는 별도로 필요합니다.

**예약 실행에는 전제가 하나 더 있습니다.** cron scheduler는 설정만으로 켜지지 않고 인증이 함께 켜져 있어야 합니다. 자세한 조건은 [서버 시작 흐름 문서](./startup-flow.md)에서 다룹니다.

## Apache Zeppelin이 아닌 것

### Apache Spark 자체가 아닙니다

Spark는 분산 데이터 처리 엔진이고 Zeppelin은 Spark를 포함한 여러 백엔드에 연결하는 Notebook입니다.

### Jupyter와 동일한 실행 모델이 아닙니다

Zeppelin은 Interpreter Group·Interpreter·Paragraph의 연결을 중심으로 확장합니다. Jupyter의 kernel 동작을 Zeppelin의 동작으로 그대로 추측해서는 안 됩니다. 이 비교는 확장 모델의 개괄이며 Jupyter의 전체 내부 구현을 검증한 것은 아닙니다.

참고로 이 레포에는 `zeppelin-jupyter`와 `zeppelin-jupyter-interpreter` 모듈이 있고 `jupyter` Interpreter Group도 선언되어 있습니다. 즉 Zeppelin은 Jupyter의 대체재이면서 동시에 Jupyter kernel을 호출하는 경로도 갖고 있습니다.

### SQL 클라이언트에 한정되지 않습니다

JDBC Interpreter로 SQL을 실행할 수 있지만, 위의 Interpreter 표처럼 Spark·Flink·Python·Shell 등 여러 Interpreter가 별도로 존재합니다.

## 운영 전에 결정할 것

- 누가 실행하는가 — 인증·사용자 식별과 Note 권한을 결정해야 합니다. `conf/shiro.ini`의 존재 여부가 인증 활성화의 기준이며, 여기에 REST API 필터와 cron scheduler가 함께 딸려옵니다.
- 어떤 자격 증명으로 접근하는가 — Credential 관리와 데이터 소스 권한을 사용해야 합니다.
- 어떤 binding mode와 scope를 사용하는가 — 위의 group id·session id 계산 규칙이 곧 상태 공유와 장애 격리 범위입니다.
- Notebook을 어디에 저장하고 어떻게 버전 관리하는가 — 레포의 `zeppelin-plugins/notebookrepo/` 아래에 `filesystem`, `github`, `s3`, `gcs`, `azure`, `oss`, `mongo` 일곱 개 구현이 plugin으로 들어 있습니다.
- 탐색과 운영을 어떻게 나누는가 — 예약 실행만으로 운영 파이프라인의 신뢰성이 생기지는 않습니다.

## 설치와 버전 기준

2026-09-13에 확인한 공식 다운로드 페이지의 최신 릴리스는 **0.12.1**이며 2026-06-12에 릴리스되었습니다.

```bash
docker run -p 8080:8080 --rm --name zeppelin apache/zeppelin:0.12.1
```

이 저장소에서는 위 명령을 실행하지 않았습니다. 앞에서 정리한 대로 릴리스(0.12.1) · 공식 `latest` 문서(0.12.0) · 이 레포의 `master`(0.13.0-SNAPSHOT)는 서로 다른 세 지점입니다. 셋을 같은 것으로 읽지 않아야 합니다.

— [Download Apache Zeppelin](https://zeppelin.apache.org/download.html) (확인: 2026-09-13)

## 실행 환경

이 문서에서 실제로 실행한 Zeppelin 명령은 없습니다. 소스 대조는 아래 환경에서 했습니다.

```text
OS:   macOS 15.7.4 (24G517) arm64
Java: OpenJDK 11.0.31 (Homebrew)
확인: 2026-09-18
```

## 확인하지 못한 것

- 실제 Spark·Flink 클러스터에 연결한 Interpreter 실행 결과는 확인하지 못했습니다 — 이 환경에 해당 클러스터와 Zeppelin Workspace가 없습니다.
- `shared`·`scoped`·`isolated`의 성능 차이는 측정하지 않았습니다 — group id·session id 계산 규칙까지만 소스로 확인했고, Interpreter 종류·Notebook 수·데이터 크기에 따른 실측은 하지 않았습니다.
- 40개 Interpreter 각각의 동작은 확인하지 못했습니다 — `interpreter-setting.json`의 선언만 집계했습니다.
- 0.12.1과 `master` 사이의 모든 변경 사항을 대조하지는 못했습니다 — SparkR 제거처럼 이 문서의 서술에 직접 영향을 주는 항목만 확인했습니다.
- Jupyter의 kernel 내부 구현과 Zeppelin의 모든 Interpreter 구현을 비교하지 않았습니다 — 이 문서의 비교는 확장 모델의 개괄에 한정합니다.

*작성일: 2026-09-13 · 개정일: 2026-09-18 (로컬 레포 `e816bf1b7` 대조)*
