---
sidebar_position: 1
---

# Databricks란 무엇인가

> 원문 — [What is Databricks?](https://docs.databricks.com/aws/en/introduction)
>
> 확인 날짜 — 2026-09-10

## 한 문장으로 말하면

Databricks는 클라우드 오브젝트 스토리지에 있는 데이터를 대상으로 **수집·변환·분석·머신 러닝·AI를 하나의 플랫폼에서 수행하도록 묶은 관리형 데이터·AI 플랫폼**입니다.

Databricks 공식 문서는 Databricks를 다음과 같이 정의합니다.

> Databricks is a unified, open analytics platform for building, deploying, sharing, and maintaining enterprise-grade data, analytics, and AI solutions at scale.
>
> **번역** — Databricks는 대규모 엔터프라이즈급 데이터·분석·AI 솔루션을 만들고, 배포하고, 공유하고, 유지하기 위한 통합 개방형 분석 플랫폼입니다.
>
> — [What is Databricks?](https://docs.databricks.com/aws/en/introduction) (확인: 2026-09-10)

여기서 핵심은 Databricks를 단순한 **Apache Spark 실행 서비스**나 **데이터 웨어하우스**로만 보면 안 된다는 점입니다. Spark 기반의 분산 처리뿐 아니라 저장 형식, 데이터 거버넌스, 작업 실행, SQL 분석, 머신 러닝과 AI 작업을 같은 플랫폼 안에서 연결합니다.

## 왜 만들어졌는가

전통적인 데이터 시스템에서는 원천 데이터를 데이터 레이크에 저장하고, BI용 데이터는 별도의 데이터 웨어하우스로 옮기며, 머신 러닝용 데이터는 다시 다른 저장소나 처리 환경에서 준비하는 일이 생깁니다. 같은 데이터가 시스템마다 복사되고, 변환 로직과 권한 정책도 나뉘므로 다음 문제가 발생합니다.

- 어느 시스템의 데이터가 최신인지 판단하기 어렵습니다.
- 같은 데이터를 여러 번 저장하고 변환합니다.
- 데이터 엔지니어·분석가·데이터 사이언티스트가 서로 다른 데이터 사본을 봅니다.
- 데이터가 어떻게 만들어졌고 누가 접근했는지 추적하기 어렵습니다.

Databricks가 제시하는 해법은 **lakehouse**입니다. Data Lake의 저렴하고 개방적인 저장 방식과 Data Warehouse의 관리·신뢰성·분석 기능을 하나의 구조에서 결합하는 방식입니다.

> A data lakehouse is a data management system that combines the benefits of data lakes and data warehouses.
>
> **번역** — 데이터 레이크하우스는 데이터 레이크와 데이터 웨어하우스의 장점을 결합한 데이터 관리 시스템입니다.
>
> — [What is a data lakehouse?](https://docs.databricks.com/aws/en/lakehouse/) (확인: 2026-09-10)

따라서 Databricks의 중심 질문은 “Spark를 어디서 실행하는가?”가 아니라 **“같은 데이터를 여러 작업이 어떻게 신뢰하면서 함께 사용하는가?”**에 가깝습니다.

## Databricks의 기본 구성

Databricks를 이해할 때는 제품 이름을 외우기보다 다음 네 층을 분리해서 보는 편이 좋습니다.

### 1. Cloud storage — 데이터가 실제로 놓이는 곳

Databricks는 데이터가 들어 있는 클라우드 계정의 저장소와 통합됩니다. 데이터 파일과 테이블 데이터는 클라우드 오브젝트 스토리지에 놓이고, Databricks의 Compute가 그 데이터를 읽고 처리합니다.

이 구조는 저장소와 Compute를 분리합니다. Compute를 새로 만들거나 없애도 데이터 자체의 생명주기는 Compute와 분리할 수 있습니다. 다만 “저장소와 Compute가 분리되어 있으니 비용과 운영이 자동으로 해결된다”는 뜻은 아닙니다. Compute 실행 시간, 저장 용량, 네트워크, 쿼리 패턴을 별도로 관리해야 합니다.

### 2. Apache Spark — 대규모 처리 엔진

Databricks의 분산 처리 기반에는 Apache Spark가 있습니다. 공식 문서는 Databricks가 Spark를 최적화한 플랫폼이며, Databricks Runtime에는 Spark를 확장하는 최적화와 기능이 포함된다고 설명합니다.

> Apache Spark is at the heart of the Databricks Data + AI Platform.
>
> **번역** — Apache Spark는 Databricks Data + AI Platform의 중심에 있습니다.
>
> — [Apache Spark on Databricks](https://docs.databricks.com/aws/en/spark/faq) (확인: 2026-09-10)

그래서 Python·SQL·Scala 등을 사용해 배치와 스트리밍 처리를 작성할 수 있습니다. 그러나 Databricks와 Spark는 같은 것이 아닙니다.

- **Apache Spark**는 분산 데이터 처리 엔진이자 오픈 소스 프로젝트입니다.
- **Databricks**는 Spark를 포함해 Compute, Notebook, SQL, 작업 오케스트레이션, 저장 계층, 거버넌스와 운영 기능을 제공하는 플랫폼입니다.

이 차이를 놓치면 Databricks를 “비싼 Spark 클러스터”로만 이해하게 됩니다. 그러면 Unity Catalog의 권한·계보 관리나 Delta Lake의 트랜잭션 같은 플랫폼의 핵심을 설명할 수 없습니다.

### 3. Delta Lake — 데이터 레이크에 신뢰성을 더하는 저장 계층

데이터 레이크에 Parquet 파일만 쌓으면 파일 집합은 생기지만, 여러 작업이 동시에 읽고 쓰는 상황에서 트랜잭션·스키마·버전 관리가 자동으로 해결되지는 않습니다. Databricks Lakehouse에서는 Delta Lake가 이 저장 계층을 담당합니다.

공식 문서는 Databricks Lakehouse에서 Delta Lake를 **ACID 트랜잭션과 스키마 적용을 지원하는 최적화된 저장 계층**으로 설명합니다. 이 때문에 데이터 엔지니어는 단순히 파일을 덮어쓰는 대신, 테이블 변경의 원자성·스키마 검증·버전 이력을 고려할 수 있습니다.

가장 작은 개념 예시는 다음과 같습니다.

```text
원천 파일 수집
    ↓
Delta 테이블로 기록
    ↓  스키마 검사와 트랜잭션 경계
정제 작업이 읽음
    ↓
분석가와 downstream 작업이 같은 테이블을 읽음
```

이 흐름은 개념 예시이며 이 저장소에서 실행한 결과가 아닙니다. 실제로 Delta 테이블을 만들고 동시 쓰기나 스키마 변경을 확인하려면 Databricks Compute 또는 호환 환경이 필요합니다.

### 4. Unity Catalog — 데이터와 AI 자산의 거버넌스 계층

Unity Catalog는 Databricks 안의 데이터와 AI 자산에 대한 통합 거버넌스 계층입니다. 테이블·뷰·볼륨·모델·함수 같은 자산에 권한을 부여하고, 계보와 감사 기록을 관리하는 역할을 합니다.

> Unity Catalog is the unified governance layer for data and AI built into Databricks.
>
> **번역** — Unity Catalog는 Databricks에 내장된 데이터와 AI를 위한 통합 거버넌스 계층입니다.
>
> — [What is Unity Catalog?](https://docs.databricks.com/aws/en/data-governance/unity-catalog/) (확인: 2026-09-10)

Unity Catalog의 객체는 다음과 같은 세 단계 네임스페이스로 접근합니다.

```text
catalog.schema.object
```

예를 들면 다음과 같습니다.

```sql
SELECT *
FROM production.sales.orders;
```

이 예시에서 `production`은 catalog, `sales`는 schema, `orders`는 table입니다. 이 SQL은 문법을 보여 주는 예시일 뿐이며, 이 저장소에서 실행하지 않았습니다. 실제로 실행하려면 해당 이름의 Unity Catalog 객체와 접근 권한이 필요합니다.

따라서 테이블의 위치를 아는 것만으로는 충분하지 않습니다. 누가 읽을 수 있는지, 어떤 컬럼을 볼 수 있는지, 데이터가 어느 upstream에서 만들어졌는지까지 플랫폼의 거버넌스 모델 안에서 다뤄야 합니다.

## 데이터가 처리되는 모습

Databricks 공식 문서는 Lakehouse의 일반적인 데이터 흐름을 수집, 처리·정제·통합, 제공의 단계로 설명합니다. 데이터 엔지니어 관점에서는 다음처럼 이해할 수 있습니다.

```text
원천 시스템
  ├─ 파일·로그·API·데이터베이스
  ↓
수집
  ├─ 배치 또는 스트리밍
  ↓
Bronze
  ├─ 원천에 가깝게 보존
  ↓
Silver
  ├─ 스키마 검증·중복 제거·정제
  ↓
Gold
  └─ 분석·리포팅·ML에 맞춘 데이터
```

이 Bronze·Silver·Gold 구조를 **medallion architecture**라고 부릅니다. 중요한 점은 이름 자체가 아니라, 데이터가 단계별로 점진적으로 정제되고 각 계층의 책임과 품질 기준이 달라진다는 것입니다.

> The medallion architecture describes a series of data layers that denote the quality of data stored in the lakehouse.
>
> **번역** — 메달리온 아키텍처는 레이크하우스에 저장된 데이터의 품질을 나타내는 일련의 데이터 계층을 설명합니다.
>
> — [What is the medallion lakehouse architecture?](https://docs.databricks.com/aws/en/lakehouse/medallion) (확인: 2026-09-10)

예를 들어 주문 데이터를 처리한다면 다음처럼 역할을 나눌 수 있습니다.

- Bronze에는 원천 주문 이벤트를 가능한 한 원형에 가깝게 보존합니다.
- Silver에서는 이벤트 중복 제거, 타입 변환, 필수 컬럼 검증을 수행합니다.
- Gold에서는 일별 매출·고객별 주문 수처럼 소비자가 바로 사용할 집계 모델을 제공합니다.

이 구조의 결과는 “테이블을 세 종류로 나눈다”가 아닙니다. Bronze에서 Silver와 Gold를 다시 만들 수 있도록 원천에 가까운 데이터를 보존하고, 각 단계의 데이터 품질과 책임을 명시하는 것입니다. Bronze를 잘못 설계하면 이후 계층을 재생성할 근거가 사라집니다.

## Databricks는 무엇이 아닌가

### Databricks는 Apache Spark의 다른 이름이 아닙니다

Spark는 실행 엔진이고, Databricks는 Spark를 포함한 관리형 플랫폼입니다. 로컬이나 자체 클러스터에서 Spark 애플리케이션을 실행할 수 있다고 해서 Databricks의 Workspace·Unity Catalog·Jobs·SQL·운영 모델을 사용하고 있는 것은 아닙니다.

### Databricks는 데이터 웨어하우스만이 아닙니다

Databricks SQL을 사용해 웨어하우스형 쿼리와 BI 작업을 수행할 수 있지만, 데이터 엔지니어링·스트리밍·머신 러닝·AI 작업도 같은 Lakehouse에서 다룹니다. 웨어하우스처럼 사용할 수 있다는 것과 웨어하우스만 제공한다는 것은 다릅니다.

### Databricks는 데이터 레이크 자체도 아닙니다

데이터 레이크는 보통 클라우드 오브젝트 스토리지에 다양한 형식의 데이터를 저장하는 저장 방식 또는 시스템을 가리킵니다. Databricks는 그 저장소 위에서 처리·테이블·거버넌스·분석·운영을 제공하는 플랫폼입니다. 저장소와 플랫폼을 구분해야 비용, 권한, 장애 범위를 정확히 판단할 수 있습니다.

## 데이터 엔지니어에게 중요한 판단 지점

Databricks를 도입하거나 사용할 때는 기능 목록보다 다음 질문이 먼저입니다.

1. **데이터의 원본은 어디에 보존할 것인가?** Bronze를 다시 만들 수 있는 형태로 유지할 것인지 결정해야 합니다.
2. **테이블의 신뢰성은 무엇으로 보장할 것인가?** Delta Lake의 트랜잭션, 스키마 검사, 변경 이력을 데이터 흐름에 어떻게 사용할지 정해야 합니다.
3. **누가 어떤 데이터에 접근할 수 있는가?** Unity Catalog의 catalog·schema·object 구조와 권한 모델을 조직 경계에 맞춰 설계해야 합니다.
4. **어떤 작업이 어떤 Compute에서 실행되는가?** 대화형 분석, 배치 작업, 스트리밍, SQL 쿼리의 실행 자원과 비용을 분리해서 봐야 합니다.
5. **실패하면 어디부터 재실행하는가?** 계층별 저장과 작업 의존성을 설계하지 않으면 재실행 때 중복·누락·부분 반영이 발생할 수 있습니다.

Databricks가 이 문제들을 자동으로 없애 주는 것은 아닙니다. Databricks는 판단에 필요한 실행·저장·거버넌스 기능을 한 플랫폼으로 제공하지만, 데이터 계약·계층 책임·재처리 전략·비용 정책을 정하는 일은 여전히 데이터 엔지니어의 설계 영역입니다.

## 실행 환경

이 문서에는 Databricks Workspace, Compute 또는 Unity Catalog가 없어 직접 실행한 출력이 없습니다. SQL과 데이터 흐름 예시는 개념을 설명하기 위한 미실행 예시입니다.

## 확인하지 못한 것

- Databricks Workspace에서 실제로 생성한 테이블과 권한을 검증하지 못했습니다 — 이 머신에 Databricks 계정과 Compute 연결이 없습니다.
- 특정 클라우드의 네트워크·Compute 요금·성능은 확인하지 않았습니다 — 이 문서는 AWS 공식 문서의 공통 개념을 중심으로 작성했으며, 환경별 값은 배포 방식과 시점에 따라 달라집니다.

*작성일: 2026-09-10*
