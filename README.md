<div align="center">

<br/>

# E C O M M E R C E&nbsp;&nbsp;B A C K E N D

<p><strong>AI-Powered Catalog Assistant</strong></p>

<br/>

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
</p>

<br/>

*Production-grade REST API with an AI-powered conversational assistant that can search products, place orders, and check order statuses — all through natural language via native LLM tool calling.*

<br/>

**[Overview](#i-overview)** &nbsp;·&nbsp; **[Assumptions](#ii-assumptions)** &nbsp;·&nbsp; **[Exclusions](#iii-exclusions)** &nbsp;·&nbsp; **[Incomplete Work](#iv-incomplete-work)** &nbsp;·&nbsp; **[Services](#v-third-party-services)** &nbsp;·&nbsp; **[Time Spent](#vi-time-spent)** &nbsp;·&nbsp; **[Bootstrapping](#vii-bootstrapping)** &nbsp;·&nbsp; **[API](#viii-api-reference)** &nbsp;·&nbsp; **[Structure](#ix-project-structure)**

<br/>

</div>

---

## I. Overview

A **four-phase** e-commerce backend, built incrementally across four milestones:

| Task | Focus | What It Delivers |
|:----:|-------|-------------------|
| `⓪` | Foundation | RESTful CRUD for Customers, Products & Orders with atomic transactions |
| `①` | AI Assistant | Catalog-grounded conversational AI with multi-model fallback orchestration |
| `②` | Tool Calling | Native function calling — the AI dynamically searches, orders, and checks statuses via backend services |
| `③` | Bulk Import Pipeline | Ingests product data from an external URL (HTML / JSON / CSV) via LLM extraction, with Zod validation and idempotent upserts |

```text
POST /customers             →  Register a customer
GET  /products               →  Browse the catalog
POST /orders                 →  Place an order (atomic, transactional)
GET  /orders/:id             →  View order with full line-item breakdown
POST /assistant/chat         →  Converse with the AI assistant (search, order, check status)
POST /products/bulk-import   →  Bulk ingest products from a URL via LLM
```

---

## II. Assumptions

### ⓪ Foundation — Task 0

- **Relational database** (PostgreSQL via Neon) was chosen to enforce data integrity through foreign keys, unique constraints, and cascade rules.
- **Docker** is used to guarantee a clean, reproducible startup on any machine.
- **`totalAmount` is always calculated server-side** — never trusted from the client request.
- **Stock deduction is atomic** — runs inside a Prisma `$transaction` to prevent race conditions and overselling.
- **Email uniqueness** is enforced at the database level via a unique index on `Customer.email`.
- **Decimal pricing** (`Prisma.Decimal`) is used instead of floats to ensure precision in financial calculations.

### ① AI Assistant — Task 1

- The **system prompt is dynamically generated** from live database records on every request — the AI is never stale.
- **Multi-model fallback** is assumed necessary for production resilience: if Google Gemini is unavailable, the system transparently falls back to Meta Llama 3.3 70B via Groq with zero user-facing disruption.
- The AI is **strictly grounded** to the product catalog — it will not hallucinate products, prices, or inventory that do not exist in the database.

### ② Tool Calling — Task 2

- **Native function calling** (not prompt-engineered JSON parsing) is the correct strategy — the LLM's built-in tool-use capability is leveraged directly via the Gemini SDK's `tools` parameter.
- The `place_order` tool **reuses the existing `OrderService`** transactional logic identically to the REST endpoint — there is a single source of truth for order placement, ensuring consistent stock validation and atomic inventory deduction regardless of whether the order originates from REST or AI chat.
- Tool responses are **deep-cloned to plain JSON** before being returned to the SDK to avoid `DataCloneError` caused by Prisma's `Decimal` type and the SDK's internal `structuredClone` call.

### ③ Bulk Import Pipeline — Task 3

- **URL Handling**: It is assumed that the provided URL returns textual data (HTML, JSON, or CSV). For HTML pages, we safely strip extraneous tags (`script`, `style`, `svg`, `img`, etc.) to maximize LLM context window efficiency.
- **Data Integrity & Corruption**: If the LLM produces corrupted data or misses core required fields (like `name` or `price`), the Zod validation layer intercepts it and the batch item is skipped safely. The pipeline operates idempotently (upserting via product `name`) to prevent duplication.

---

## III. Exclusions

The following were deliberately excluded to remain focused on the assignment scope:

`✕` Out of Scope

| Area | Reason |
|------|--------|
| JWT / OAuth Authentication | No auth layer was specified |
| Payment Gateway (Stripe, etc.) | Orders are placed without payment processing |
| Rate Limiting / Throttling | Not required for evaluation |
| Multi-tenant / RBAC | Single-tenant system assumed |

---

## IV. Incomplete Work

`○` Pending &nbsp;&nbsp;&nbsp; `✓` Shipped

| Area | Status | Notes |
|------|:------:|-------|
| Conversation History / Memory | ○ Not Implemented | Each `/assistant/chat` call is stateless — the AI has no memory of prior turns. A session-based chat history would be a natural future extension. |
| Cursor-based Pagination | ○ Deferred | Basic `skip` / `take` offset pagination is implemented. Cursor-based pagination would improve performance on large datasets. |
| Streaming Responses | ○ Not Implemented | The AI assistant returns a full response synchronously. Server-Sent Events (SSE) streaming would improve perceived latency for long tool-calling chains. |

> `✓` **No known bugs within the defined scope of Tasks 0, 1, and 2.** All features specified in the assignment are fully functional and tested.

---

## V. Third-Party Services

`◆` Core Infrastructure &nbsp;&nbsp;&nbsp; `▸` AI / ML &nbsp;&nbsp;&nbsp; `▪` Testing & Tooling

| Provider | Purpose | Required For |
|----------|---------|---------------|
| `◆` **Neon (PostgreSQL)** | Managed cloud relational database | Task 0 |
| `◆` **Docker** | Containerized deployment | Task 0 |
| `◆` **Prisma** | ORM, schema migrations, DB seeding | Task 0 |
| `◆` **NestJS** | TypeScript backend framework | Task 0 |
| `◆` **Swagger / OpenAPI** | Interactive API documentation | Task 0 |
| `▸` **Google Gemini 3.6 Flash** | Primary AI model (catalog grounding + tool calling) | Task 1 & 2 |
| `▸` **Meta Llama 3.3 70B** | Fallback AI model for resilience | Task 1 |
| `▸` **Groq** | Ultra-fast inference provider for fallback routing | Task 1 & 3 |
| `▪` **Vitest** | Unit & E2E test runner | Task 0, 1, 2 & 3 |
| `▪` **Cheerio** | HTML parsing and DOM manipulation | Task 3 |
| `▪` **ipaddr.js** | IP address manipulation for SSRF protection | Task 3 |
| `▪` **Zod** | TypeScript-first schema validation for LLM outputs | Task 3 |

---

## VI. Time Spent

### ⓪ Task 0 — E-Commerce Foundation

| Phase | Duration |
| ----- | -------: |
| Setup & Infrastructure | ~15 min |
| Prisma Schema & DB Migrations | ~10 min |
| Core Business Logic & Services | ~35 min |
| E2E & Adversarial Tests | ~20 min |
| Cleanup, Docs & Polish | ~53 min |
| **Total** | **2h 13m** |

### ① Task 1 — AI Assistant (Catalog Grounding + Multi-Model)

| Phase | Duration |
| ----- | -------: |
| Implementation (AI Assistant) | ~33 min |
| Testing (Unit & E2E) | ~11 min |
| **Total** | **44 min** |

### ② Task 2 — Native Tool Calling (Search, Order, Check Status)

| Phase | Duration |
| ----- | -------: |
| Implementation (Tool Calling) | ~19 min |
| Testing (Unit & E2E) | ~17 min |
| **Total** | **36 min** |

### ③ Task 3 — Bulk Import Pipeline

| Phase | Duration |
| ----- | -------: |
| Implementation (Bulk Import Pipeline) | 37 min |
| Testing (Unit & E2E) | 22 min |
| **Total** | **59 min** |

> **Grand Total — ~4h 32m**

---

## VII. Bootstrapping

> The single command to start the system from a clean state is in **[`RUN.md`](../RUN.md)** at the repository root.

```bash
# From the repository root — installs deps, pushes schema, seeds DB, builds & runs:
cd code && npm ci && npx prisma db push && npx prisma db seed && npm run build && npm run start:prod
```

Once running, access the interactive Swagger UI at:

```text
http://localhost:3000/api/docs
```

---

## VIII. API Reference

| Method | Endpoint | Description |
| :----: | -------- | ----------- |
| `POST` | `/customers` | Register a new customer |
| `GET` | `/customers/:id` | Get customer profile |
| `GET` | `/products` | List all products (supports `?search=`) |
| `GET` | `/products/:id` | Get a single product by ID |
| `POST` | `/products/bulk-import` | Bulk ingest products from a URL via LLM |
| `POST` | `/orders` | Place an order (atomic stock decrement) |
| `GET` | `/orders/:id` | Full order with line items & customer |
| `POST` | `/assistant/chat` | Converse with the AI — search, order, check status |

---

## IX. Project Structure

```text
code/                                    # NestJS application root
├── src/
│   ├── customer/                        # controller · service · DTO
│   ├── product/                         # controller · service
│   ├── order/                           # controller · service · DTO
│   ├── assistant/                       # AI assistant module — Task 1 & 2
│   │   ├── catalog-assistant.service.ts     # tool-calling logic
│   │   ├── assistant.controller.ts
│   │   ├── assistant.module.ts
│   │   └── dto/
│   ├── prisma/                          # PrismaService — global DB connection
│   ├── filters/                         # global HTTP exception filter
│   └── main.ts                          # app bootstrap — Swagger + ValidationPipe
├── prisma/
│   ├── schema.prisma                    # data models, relations & indexes
│   └── seed.ts                          # deterministic fixture seeding script
├── Dockerfile                           # multi-stage production build
├── package.json
├── tsconfig.json
├── .env.example                         # environment variable template
└── .env                                 # DATABASE_URL + API keys — not committed
```

---

<div align="center">

—

*Built with precision for the **BluBird Interactive** engineering review.*

—

</div>
