---
sidebar_position: 1
---

# Apache Zeppelin이란 무엇인가

> 원문 — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html)
>
> 확인 날짜 — 2026-09-10 (문서 URL은 `latest`이지만 페이지 내용은 0.12.0 기준, 최신 릴리스는 0.12.1)
>
> 검증 상태 — Apache Zeppelin 공식 문서와 공식 다운로드 페이지를 읽고 정리했습니다. 로컬에 Zeppelin이 설치되어 있지 않아 Notebook·Interpreter 실행 결과는 포함하지 않았습니다.

## 한 문장으로 말하면

Apache Zeppelin은 SQL·Scala·Python·R 등을 데이터 처리 백엔드에 연결해 실행하고, 그 코드와 결과·설명을 하나의 웹 문서에서 공유하는 **웹 기반 다목적 Notebook**입니다.

Apache Zeppelin 공식 문서는 다음과 같이 설명합니다.

> Multi-purpose notebook which supports 20+ language backends
>
> **번역** — 20개가 넘는 언어 백엔드를 지원하는 다목적 Notebook입니다.
>
> — [Apache Zeppelin 0.12.0 Documentation](https://zeppelin.apache.org/docs/latest/index.html) (확인: 2026-09-10)

공식 홈페이지는 Zeppelin을 데이터 중심의 대화형 분석과 협업 문서를 가능하게 하는 웹 기반 Notebook으로 소개합니다.

> Web-based notebook that enables data-driven, interactive data analytics and collaborative documents with SQL, Scala, Python, R and more.
>
> **번역** — SQL·Scala·Python·R 등을 사용해 데이터 중심의 대화형 분석과 협업 문서를 작성할 수 있게 하는 웹 기반 Notebook입니다.
>
> — [Apache Zeppelin](https://zeppelin.apache.org/) (확인: 2026-09-10)

여기서 중요한 단어는 **Notebook**보다 **backend**입니다. Zeppelin 자체가 SQL 엔진이나 분산 처리 엔진인 것은 아닙니다. Zeppelin은 사용자가 작성한 문단을 적절한 Interpreter에 전달하고, 그 결과를 화면에 보여 주는 실행·표현·협업 계층입니다.

## 무엇을 해결하는가

데이터 작업은 코드만 실행하면 끝나지 않습니다. 실행한 쿼리, 사용한 파라미터, 결과 표와 그래프, 그 결과를 해석한 설명이 함께 남아야 다른 사람이 분석 과정을 이해하고 다시 실행할 수 있습니다.

일반적인 스크립트 실행은 다음을 따로 관리하게 만듭니다.

- 코드는 파일이나 명령줄에 있습니다.
- 실행 결과는 터미널이나 별도 대시보드에 있습니다.
- 결과를 만든 데이터 소스와 실행 환경은 문서화되지 않을 수 있습니다.
- 다른 사람이 같은 코드를 실행하려면 의존성과 연결 정보를 다시 알아내야 합니다.

Zeppelin은 이 작업을 Notebook이라는 문서 단위에 묶습니다. Notebook 안에는 실행 순서를 가진 여러 Paragraph가 있고, 각 Paragraph에는 코드와 실행 결과가 함께 놓입니다. 결과를 표·텍스트·HTML·그래프로 표현할 수 있으며, Notebook을 다른 사용자와 공유할 수 있습니다.

그러므로 Zeppelin의 역할은 “분산 처리를 대신하는 제품”이라기보다 **데이터 처리 엔진을 사람이 탐색하고 설명하고 공유할 수 있는 문서형 인터페이스로 묶는 것**입니다.

## 핵심 구조

### Notebook — 실행 가능한 분석 문서

Notebook은 Zeppelin에서 작업을 저장하는 큰 단위입니다. 하나의 Notebook에는 1개 이상의 Paragraph가 들어가며, Notebook 단위로 코드를 실행·저장·공유·내보내기할 수 있습니다.

공식 UI 문서는 Notebook을 Paragraph의 컨테이너로 설명합니다. 각 Paragraph에는 코드를 입력하는 `code section`과 실행 결과를 보는 `result section`이 있습니다. 이 구조 덕분에 다음과 같은 문서가 가능합니다.

```text
Notebook: 일별 주문 데이터 점검

Paragraph 1 — 분석 목적과 기준일 설명
Paragraph 2 — 원천 데이터 조회
Paragraph 3 — 중복 주문 수 계산
Paragraph 4 — 결과 표와 해석
```

이 예시는 문서 구조를 보여 주는 개념 예시이며, 이번에 실제 Zeppelin에서 실행한 결과가 아닙니다.

Notebook은 단순한 코드 파일과도 다릅니다. Paragraph마다 다른 Interpreter를 선택할 수 있기 때문에 하나의 문서에서 SQL로 데이터를 조회하고, Python으로 후처리하고, Markdown으로 결과를 설명하는 흐름을 구성할 수 있습니다. 다만 언어 사이에서 변수가 자동으로 공유된다고 가정하면 안 됩니다. 실제 공유 범위는 Interpreter와 binding mode 설정에 따라 달라집니다.

— [Explore Apache Zeppelin UI](https://zeppelin.apache.org/docs/latest/quickstart/explore_ui.html) (확인: 2026-09-10)

### Paragraph — 실행과 결과의 경계

Paragraph는 Zeppelin에서 실행되는 가장 작은 문서 단위입니다. Paragraph 안의 코드를 실행하면 그 결과가 같은 Paragraph의 result section에 표시됩니다. Notebook의 모든 Paragraph를 표시 순서대로 순차 실행할 수도 있고, 개별 Paragraph만 실행할 수도 있습니다.

이 경계는 데이터 엔지니어링에서 중요합니다. Paragraph 하나가 하나의 변환·검증·조회 단계를 나타내면 실패한 단계를 찾기 쉽습니다. 반대로 한 Paragraph에 수백 줄의 수집·변환·검증 로직을 넣으면 Notebook이 문서처럼 보여도 재실행 단위와 실패 원인을 파악하기 어려워집니다.

### Interpreter — 코드와 백엔드를 연결하는 플러그인

Interpreter는 Zeppelin이 특정 언어 또는 데이터 처리 백엔드와 통신하도록 해 주는 플러그인입니다. 공식 문서에는 Scala·Python·Spark SQL·Hive·JDBC·Markdown·Shell 등의 Interpreter가 예시로 나옵니다.

> A Zeppelin interpreter is a plug-in which enables Zeppelin users to use a specific language/data-processing-backend.
>
> **번역** — Zeppelin Interpreter는 사용자가 특정 언어나 데이터 처리 백엔드를 사용할 수 있게 하는 플러그인입니다.
>
> — [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-10)

Paragraph의 첫 부분에는 사용할 Interpreter를 지정합니다.

```text
%spark.pyspark

orders = spark.table("sales.orders")
orders.groupBy("order_date").count().show()
```

위 예시에서 `%spark.pyspark`는 이 Paragraph를 Spark의 PySpark Interpreter로 실행하라는 뜻입니다. `sales.orders`를 실제로 조회하려면 해당 Spark 세션에 접근 가능한 테이블과 실행 환경이 필요하므로 이 저장소에서는 실행하지 않았습니다.

SQL을 JDBC 데이터 소스에 보내는 경우처럼 다른 백엔드를 선택할 수도 있습니다.

```text
%jdbc(postgresql)

SELECT order_date, COUNT(*)
FROM orders
GROUP BY order_date;
```

이 예시에서 `%jdbc(postgresql)`의 의미는 Zeppelin의 JDBC Interpreter에 PostgreSQL 연결 설정을 바탕으로 실행하라는 것입니다. 실제 접속 정보·자격 증명·권한·드라이버가 없으면 코드가 있어도 실행되지 않습니다. Notebook에 비밀번호를 직접 적는 것은 안전하지 않으며 Zeppelin의 Credential 관리와 데이터 소스 권한 설정을 별도로 검토해야 합니다.

### Interpreter Group — JVM 프로세스의 묶음

Interpreter는 개별 설정만으로 끝나지 않고 Interpreter Group에 속합니다. 같은 그룹의 Interpreter들은 하나의 JVM 프로세스에서 실행되며 함께 시작·중지될 수 있습니다. 예를 들어 Spark Interpreter Group에는 Scala Spark, PySpark, IPySpark, SparkR, Spark SQL Interpreter가 포함될 수 있습니다.

이 구조는 자원 사용과 상태 공유에 영향을 줍니다. 같은 프로세스에 묶인 Interpreter는 시작 비용을 줄일 수 있지만, 하나의 프로세스 장애가 여러 실행에 영향을 줄 수 있습니다. 반대로 Notebook마다 완전히 분리된 프로세스를 사용하면 격리는 강해지지만 자원과 시작 비용이 커집니다.

— [Interpreter in Apache Zeppelin](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-10)

## Interpreter Binding Mode가 바꾸는 것

Zeppelin은 Interpreter 실행 범위를 `shared`, `scoped`, `isolated`로 나눌 수 있습니다. 이 설정은 단순한 성능 옵션이 아니라 **상태와 장애가 어디까지 공유되는지**를 결정합니다.

| 모드 | 기본 실행 관계 | 얻는 것 | 잃는 것 |
| --- | --- | --- | --- |
| `shared` | 여러 Notebook·사용자가 하나의 Interpreter 인스턴스를 공유합니다 | 자원 사용량이 낮고 Notebook 사이에서 상태를 공유하기 쉽습니다 | Interpreter 프로세스 장애가 여러 Notebook에 영향을 줄 수 있습니다 |
| `scoped` | 범위별로 별도 세션을 쓰지만 Interpreter 프로세스는 공유할 수 있습니다 | `shared`보다 상태 격리가 강하면서 프로세스 수를 줄일 수 있습니다 | 프로세스 장애의 영향 범위가 완전히 분리되지는 않습니다 |
| `isolated` | 범위별로 별도 Interpreter 프로세스를 실행합니다 | Notebook 간 실행 상태를 강하게 격리할 수 있습니다 | 자원 사용량과 시작 비용이 커지고 상태 공유가 어려워집니다 |

예를 들어 `isolated per note`에서는 Notebook마다 별도의 Interpreter 프로세스를 만들 수 있습니다. 한 Notebook에서 만든 Python 변수나 Spark 세션을 다른 Notebook에서도 사용할 수 있다고 가정하면 안 됩니다. 실행 상태를 공유해야 하는지, 사용자·Notebook별 격리가 필요한지에 따라 binding mode를 선택해야 합니다.

— [Interpreter Binding Mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html) (확인: 2026-09-10)

## 데이터 엔지니어링에서의 사용 흐름

Apache Zeppelin은 다음과 같은 탐색·검증 흐름에 잘 맞습니다.

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

예를 들어 새로 적재한 이벤트 데이터의 품질을 확인할 때 다음 순서로 Notebook을 구성할 수 있습니다.

1. JDBC 또는 Spark로 최근 적재 구간을 조회합니다.
2. 필수 컬럼의 NULL 비율과 예상 범위를 확인합니다.
3. Python 또는 Spark로 중복 키와 분포를 계산합니다.
4. 결과를 표와 그래프로 표시합니다.
5. 실패한 검증과 원인에 대한 설명을 Markdown으로 남깁니다.

이렇게 만든 Notebook은 탐색적 분석과 데이터 품질 점검의 기록으로 유용합니다. 그러나 Notebook이 곧 운영 파이프라인은 아닙니다. 정해진 시각에 반복 실행하고 실패를 감지해야 하는 작업은 실행 스케줄, 재시도, 알림, 배포 방식을 별도로 설계해야 합니다. Zeppelin에는 Notebook 전체를 CRON 방식으로 예약 실행하는 기능이 있지만, 예약 실행이 데이터 파이프라인의 재처리·멱등성·관측성 문제를 자동으로 해결해 주지는 않습니다.

## Apache Zeppelin은 무엇이 아닌가

### Apache Spark가 아닙니다

Apache Spark는 분산 데이터 처리 엔진이고, Zeppelin은 그 Spark를 포함한 여러 백엔드에 연결하는 Notebook입니다. Zeppelin에서 Spark를 실행할 수 있다는 사실이 Zeppelin 자체가 Spark라는 뜻은 아닙니다.

### Jupyter와 완전히 같은 제품이 아닙니다

둘 다 Notebook 인터페이스를 제공하지만, 기본적인 확장 모델과 백엔드 연결 방식이 다릅니다. Zeppelin은 Interpreter를 중심으로 언어·데이터 처리 백엔드를 연결하고, 한 Notebook의 각 Paragraph에 실행 대상을 지정하는 모델을 갖습니다. 따라서 Jupyter의 실행 커널·확장 기능을 그대로 Zeppelin의 동작으로 추측하면 안 됩니다.

### SQL 클라이언트만이 아닙니다

JDBC Interpreter를 사용하면 PostgreSQL·MySQL·Hive 같은 데이터 소스에 SQL을 보낼 수 있지만, Zeppelin의 범위는 JDBC 조회에 한정되지 않습니다. Spark·Flink·Python·R·Shell 등 여러 실행 백엔드를 하나의 문서에 연결하고 결과를 시각화·공유할 수 있다는 점이 핵심입니다.

## 운영할 때 먼저 판단할 것

Apache Zeppelin을 실제 환경에 배치할 때는 Notebook을 만들 수 있는지보다 다음 경계를 먼저 정해야 합니다.

- **누가 실행하는가** — 기본 설정의 익명 사용자와 운영 환경의 인증·사용자 식별은 다릅니다.
- **어떤 자격 증명으로 데이터에 접근하는가** — Notebook에 비밀번호를 넣지 않고 Credential 관리와 데이터 소스 권한을 사용해야 합니다.
- **Interpreter 프로세스를 어디까지 공유하는가** — `shared`는 자원 사용량과 상태 공유에 유리하지만 장애와 오염의 영향 범위가 넓어질 수 있습니다.
- **Notebook을 어떻게 저장·버전 관리하는가** — 공식 문서는 기본 Notebook 저장 위치와 Git·S3·Azure Blob Storage 같은 저장 방식을 별도로 다룹니다.
- **탐색과 운영을 어떻게 나누는가** — Notebook은 설명 가능한 탐색과 협업에 좋지만, 운영 파이프라인에는 재시도·멱등성·모니터링·배포 전략이 필요합니다.

이 판단을 하지 않고 Zeppelin을 설치하면 “코드는 실행되지만 누가 어떤 권한으로 어떤 데이터에 접근했는지 설명할 수 없는” 환경이 될 수 있습니다. 특히 `shared` Interpreter에서 사용자의 상태가 섞이는 문제와 Notebook에 포함된 민감한 출력·자격 증명 유출을 별도로 확인해야 합니다.

## 설치와 버전

2026-09-10에 확인한 Apache Zeppelin 공식 다운로드 페이지의 최신 릴리스는 **0.12.1**이며, 2026-06-12에 릴리스되었습니다. 공식 Docker 이미지는 다음 형태로 실행할 수 있다고 안내합니다.

```bash
docker run -p 8080:8080 --rm --name zeppelin apache/zeppelin:0.12.1
```

이 명령은 공식 문서의 예시를 옮긴 것이며, 이 저장소에서는 실행하지 않았습니다. 이 머신에는 Docker와 Java 11이 있지만 `apache/zeppelin:0.12.1` 이미지가 로컬에 없고, 이미지를 내려받아 실행하는 것은 수백 MB의 외부 다운로드와 Docker 실행 환경을 필요로 합니다.

공식 문서 URL의 `latest`는 현재 Apache Zeppelin 0.12.0 문서 내용을 보여 주므로, 0.12.1에서의 변경 사항까지 이 문서가 모두 설명한다고 가정하면 안 됩니다. 버전에 따라 달라지는 기능·설정·보안 수정은 해당 릴리스의 문서와 Release Note를 다시 확인해야 합니다.

— [Download Apache Zeppelin](https://zeppelin.apache.org/download.html) (확인: 2026-09-10)

## 실행 환경

이번 문서 작성에서 확인한 로컬 환경은 다음과 같습니다.

```text
Java: OpenJDK 11.0.31
Docker: /usr/local/bin/docker 존재
Apache Zeppelin: 로컬 설치 및 Docker 이미지 없음
```

실행한 확인 명령은 `command -v docker`, `java -version`, `docker image inspect apache/zeppelin:0.12.1`이며, Zeppelin Notebook·Interpreter·JDBC 연결은 실행하지 않았습니다.

## 확인하지 못한 것

- 실제 Spark·Flink 클러스터에 연결한 Interpreter 실행 결과는 확인하지 못했습니다 — 이 머신에 해당 클러스터와 Zeppelin Workspace가 없습니다.
- `shared`·`scoped`·`isolated` 모드의 성능 차이는 측정하지 않았습니다 — 차이는 Interpreter 종류, Notebook 수, 데이터 크기와 설정에 따라 달라집니다.
- Apache Zeppelin 0.12.1의 모든 변경 사항은 대조하지 못했습니다 — 공식 `latest` 문서가 0.12.0 내용을 제공하므로 0.12.1 Release Note를 별도로 확인해야 합니다.

*작성일: 2026-09-10*
