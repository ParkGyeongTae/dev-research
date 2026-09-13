---
sidebar_position: 1
---

# Apache Zeppelin이란 무엇인가

> 원문 — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html), [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html), [Interpreter Binding Mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html), [Download Apache Zeppelin](https://zeppelin.apache.org/download.html)
>
> 확인 날짜 — 2026-09-13 (문서 URL은 `latest`이지만 문서 내용은 0.12.0 기준이며, 공식 다운로드 페이지의 최신 릴리스는 0.12.1입니다.)
>
> 검증 상태 — Apache Zeppelin 공식 문서와 다운로드 페이지를 읽어 정리했습니다. 로컬에서 Zeppelin Notebook·Interpreter·JDBC를 실행하지 않았으므로 실행 결과를 포함하지 않았습니다.

## 한 문장으로 말하면

Apache Zeppelin은 여러 언어와 데이터 처리 백엔드를 Interpreter로 연결하고, 코드·결과·설명을 Notebook 안에 함께 남기는 웹 기반 Notebook입니다.

> Multi-purpose notebook which supports 20+ language backends
>
> **번역** — 20개가 넘는 언어 백엔드를 지원하는 다목적 Notebook입니다.
>
> — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html) (확인: 2026-09-13)

Zeppelin 자체가 SQL 엔진이나 분산 처리 엔진인 것은 아닙니다. Zeppelin은 사용자의 Paragraph를 Interpreter에 전달하고 실행 결과를 Notebook에 표시·저장·공유하는 계층입니다. 이는 공식 정의를 바탕으로 한 해석입니다.

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

공식 문서에 따르면 같은 Interpreter Group의 Interpreter들은 하나의 JVM 프로세스에서 동작하며 함께 시작·중지될 수 있습니다. Spark 그룹에는 Scala Spark, PySpark, IPySpark, SparkR, Spark SQL 등이 포함될 수 있습니다.

— [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-13)

같은 그룹으로 묶으면 프로세스 수를 줄일 수 있지만, 하나의 Interpreter JVM 장애가 같은 그룹의 여러 실행에 영향을 줄 수 있습니다. 이는 공식 프로세스 구조에서 도출한 운영상 해석입니다.

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

`per user` scope에서는 위 관계가 Note가 아니라 사용자 단위로 적용됩니다. 예를 들어 `scoped + per user`에서는 서로 다른 사용자의 Note가 같은 JVM 장애 영향을 받을 수 있습니다. 따라서 “scoped이면 항상 Note별 프로세스가 분리된다”라고 읽으면 안 됩니다.

— [Interpreter Binding Mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html) (확인: 2026-09-13)

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

## Apache Zeppelin이 아닌 것

### Apache Spark 자체가 아닙니다

Spark는 분산 데이터 처리 엔진이고 Zeppelin은 Spark를 포함한 여러 백엔드에 연결하는 Notebook입니다.

### Jupyter와 동일한 실행 모델이 아닙니다

Zeppelin은 Interpreter Group·Interpreter·Paragraph의 연결을 중심으로 확장합니다. Jupyter의 kernel 동작을 Zeppelin의 동작으로 그대로 추측해서는 안 됩니다. 이 비교는 확장 모델의 개괄이며 Jupyter의 전체 내부 구현을 검증한 것은 아닙니다.

### SQL 클라이언트에 한정되지 않습니다

JDBC Interpreter로 SQL을 실행할 수 있지만, 공식 문서에는 Spark·Flink·Python·R·Shell 등 여러 Interpreter가 별도로 나열되어 있습니다. [지원 Interpreter 목록](https://zeppelin.apache.org/docs/latest/index.html) (확인: 2026-09-13)

## 운영 전에 결정할 것

- 누가 실행하는가 — 인증·사용자 식별과 Note 권한을 결정해야 합니다.
- 어떤 자격 증명으로 접근하는가 — Credential 관리와 데이터 소스 권한을 사용해야 합니다.
- 어떤 binding mode와 scope를 사용하는가 — 상태 공유와 장애 격리 범위를 결정합니다.
- Notebook을 어디에 저장하고 어떻게 버전 관리하는가 — 공식 문서는 Git·S3·Azure·Google Cloud·MongoDB 저장소를 별도로 다룹니다.
- 탐색과 운영을 어떻게 나누는가 — 예약 실행만으로 운영 파이프라인의 신뢰성이 생기지는 않습니다.

## 설치와 버전 기준

2026-09-13에 확인한 공식 다운로드 페이지의 최신 릴리스는 **0.12.1**이며 2026-06-12에 릴리스되었습니다.

```bash
docker run -p 8080:8080 --rm --name zeppelin apache/zeppelin:0.12.1
```

이 저장소에서는 위 명령을 실행하지 않았습니다. 공식 다운로드 페이지는 0.12.1을 최신 릴리스로 표시하지만 `https://zeppelin.apache.org/docs/latest/` 문서의 내용은 0.12.0 기준입니다. 따라서 0.12.1의 변경 사항까지 이 문서가 모두 설명한다고 가정하면 안 됩니다.

— [Download Apache Zeppelin](https://zeppelin.apache.org/download.html) (확인: 2026-09-13)

## 실행 환경

이 문서에서 실제로 실행한 Zeppelin 명령은 없습니다. 로컬의 Docker·Java 설치 여부는 이전 조사에서 확인했지만, Notebook 실행 결과는 확인하지 않았습니다.

## 확인하지 못한 것

- 실제 Spark·Flink 클러스터에 연결한 Interpreter 실행 결과는 확인하지 못했습니다 — 이 환경에 해당 클러스터와 Zeppelin Workspace가 없습니다.
- `shared`·`scoped`·`isolated`의 성능 차이는 측정하지 않았습니다 — Interpreter 종류, Notebook 수, 데이터 크기와 설정에 따라 달라집니다.
- Apache Zeppelin 0.12.1의 모든 변경 사항은 대조하지 못했습니다 — 공식 `latest` 문서가 0.12.0 내용을 제공하므로 0.12.1 Release Note와 별도 대조가 필요합니다.
- Jupyter의 kernel 내부 구현과 Zeppelin의 모든 Interpreter 구현을 비교하지 않았습니다 — 이 문서의 비교는 확장 모델의 개괄에 한정합니다.

*작성일: 2026-09-13*
