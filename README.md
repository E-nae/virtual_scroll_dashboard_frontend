## High-Performance Admin Dashboard (10k+ Rows)

> **"10,000건 이상의 대용량 데이터를 60FPS로 렌더링하는 고성능 어드민 대시보드"**
>
> Next.js(Client)와 Node.js(Server), Supabase(DB)를 분리한 아키텍처로 구축되었으며, TanStack Virtual을 활용한 가상화(Virtualization) 기술과 URL 기반 상태 동기화(URL Sync)를 통해 최상의 UX를 구현했습니다.

## Tech Stack

### Frontend (Client)
| Tech | Usage |
| :--- | :--- |
| **Next.js 14** | App Router 기반의 프론트엔드 프레임워크 |
| **TypeScript** | 정적 타입 시스템을 통한 안정성 확보 |
| **TanStack Query** | 서버 상태 관리 (Caching, Refetching) |
| **TanStack Virtual** | **[Key Tech]** 대용량 데이터 가상 스크롤(Windowing) 구현 |
| **Nuqs** | URL Query String과 React State의 양방향 동기화 |
| **Recharts** | 데이터 시각화 (인터랙티브 차트) |
| **Tailwind CSS** | 유틸리티 퍼스트 스타일링 |
| **shadcn/ui** | 재사용 가능한 컴포넌트 시스템 구축 |

### Backend (Server)
| Tech | Usage |
| :--- | :--- |
| **Node.js (Express)** | REST API 서버 구축 |
| **Supabase** | PostgreSQL 기반의 관리형 데이터베이스 |
| **dotenv** | 환경 변수 및 보안 키 관리 |

---

## Key Technical Challenges & Solutions

이 프로젝트의 핵심은 **"데이터가 많아져도 느려지지 않는 사용자 경험"**입니다. 개발 과정에서 마주친 문제와 해결책은 다음과 같습니다.

### 1. 대용량 데이터 렌더링 성능 최적화 (DOM Virtualization)
* **문제 상황:** 10,000건의 데이터를 일반적인 `<table>`로 렌더링 시, DOM 노드 과다 생성으로 브라우저 메모리가 급증하고 스크롤이 끊기는 현상(Jank) 발생.
* **해결 방법:** **TanStack Virtual**을 도입하여 "화면에 보이는 영역(Viewport)"에 해당하는 약 15~20개의 행(Row)만 동적으로 렌더링하는 **Windowing 기법** 적용.
* **성과:** 데이터가 10만 건으로 늘어나도 초기 로딩 속도와 스크롤 성능(60FPS) 유지.

### 2. URL 기반의 필터 상태 동기화 (Deep Linking)
* **문제 상황:** 사용자가 필터링한 상태에서 새로고침하거나 링크를 공유하면 검색 조건이 초기화되는 UX 문제.
* **해결 방법:** `nuqs` 라이브러리를 활용하여 필터 상태(`search`, `status`)를 **URL Query String**과 실시간 동기화.
* **성과:** 동료에게 링크 공유 시 보고 있던 화면 그대로 전달 가능, 브라우저 뒤로 가기/앞으로 가기 완벽 지원.

### 3. API 요청 최적화 및 UX 개선 (Debouncing)
* **문제 상황:** 검색어 입력 시 매 키보드 입력마다 API를 호출하여 서버 부하 발생 및 UI 깜빡임.
* **해결 방법:** **Debouncing (500ms)** 기법을 적용하여 입력이 멈춘 뒤 요청을 전송하도록 개선. 동시에 `isFetching` 상태와 로컬 입력 상태를 조합하여 끊김 없는 로딩 인디케이터(Loading) 구현.

### 4. Supabase 연동 및 대량 데이터 Seeding
* **문제 상황:** 테스트를 위한 10,000건의 Mock Data를 DB에 넣어야 했으며, Supabase의 API 요청 제한(Global Limit) 이슈 발생.
* **해결 방법:**
    * Node.js 기반의 **Seeding Script**를 작성하여 CSV 변환 및 Bulk Insert 구현.
    * Supabase의 API 설정을 튜닝(`Max Rows`)하고, 서버 쿼리에서 `.range()`를 조정하여 페이지네이션 없이 대량 데이터 전송 파이프라인 구축.
    * UUID 기반의 Primary Key 마이그레이션 진행.

---

## Architecture Overview

```mermaid
graph LR
    User[User / Browser] -->|Interaction| Client[Next.js Client]
    Client -->|API Request (Filter/Sort)| NodeServer[Node.js Server]
    NodeServer -->|SQL Query| DB[(Supabase PostgreSQL)]
    DB -->|JSON Data| NodeServer
    NodeServer -->|Filtered JSON| Client
    Client -->|Virtual Render| User


### Getting Started
1. Installation & Setup

Bash

# 1. Frontend Setup (Port 3000)
cd client
pnpm install
pnpm run dev

# 2. Backend Setup (Port 4000)
cd server
pnpm install
pnpm start


## Retrospective (배운 점)
1. 가상화의 중요성: 대시보드 개발 시 데이터 양에 따른 렌더링 전략 수립이 필수적임을 체감했습니다.
2. 서버/클라이언트 역할 분리: Next.js만 사용할 때보다 Node.js 서버를 분리함으로써 비즈니스 로직을 명확히 하고, 향후 확장성(MSA 등)을 고려한 구조를 설계할 수 있었습니다.
3. DB 핸들링: Supabase의 RLS 정책과 대량 데이터 처리 시의 한계점(Payload Limit)을 직접 겪으며 해결하는 과정에서 백엔드 이해도가 높아졌습니다.
