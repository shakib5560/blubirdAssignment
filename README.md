<div align="center">

# 🛒 E-Commerce Backend — AI-Powered Catalog Assistant

<p>
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
</p>

> **Production-grade REST API with an AI-powered conversational assistant** that can search products, place orders, and check order statuses — all through natural language via native LLM tool calling.

</div>

---

## 📖 Overview

A **three-phase** e-commerce backend built incrementally over three tasks:

| Task | Focus | What It Delivers |
|:----:|-------|-------------------|
| **0** | 🏗️ Foundation | RESTful CRUD for Customers, Products & Orders with atomic transactions |
| **1** | 🤖 AI Assistant | Catalog-grounded conversational AI with multi-model fallback orchestration |
| **2** | 🔧 Tool Calling | Native function calling — the AI dynamically searches, orders, and checks statuses via backend services |

```
POST /customers       →  Register a customer
GET  /products        →  Browse the catalog
POST /orders          →  Place an order (atomic, transactional)
GET  /orders/:id      →  View order with full line-item breakdown
POST /assistant/chat  →  Converse with the AI assistant (search, order, check status)
```

---

## 📌 Assumptions

### Task 0 — Foundation
- **Relational database** (PostgreSQL via Neon) was chosen to enforce data integrity through foreign keys, unique constraints, and cascade rules.
- **Docker** is used to guarantee a clean, reproducible startup on any machine.
- **`totalAmount` is always calculated server-side** — never trusted from the client request.
- **Stock deduction is atomic** — runs inside a Prisma `$transaction` to prevent race conditions and overselling.
- **Email uniqueness** is enforced at the database level via a unique index on `Customer.email`.
- **Decimal pricing** (`Prisma.Decimal`) is used instead of floats to ensure precision in financial calculations.

### Task 1 — AI Assistant
- The **system prompt is dynamically generated** from live database records on every request — the AI is never stale.
- **Multi-model fallback** is assumed necessary for production resilience: if Google Gemini is unavailable, the system transparently falls back to Meta Llama 3.3 70B via Groq with zero user-facing disruption.
- The AI is **strictly grounded** to the product catalog — it will not hallucinate products, prices, or inventory that do not exist in the database.

### Task 2 — Tool Calling
- **Native function calling** (not prompt-engineered JSON parsing) is the correct strategy — the LLM's built-in tool-use capability is leveraged directly via the Gemini SDK's `tools` parameter.
- The `place_order` tool **reuses the existing `OrderService`** transactional logic identically to the REST endpoint — there is a single source of truth for order placement, ensuring consistent stock validation and atomic inventory deduction regardless of whether the order originates from REST or AI chat.
- Tool responses are **deep-cloned to plain JSON** before being returned to the SDK to avoid `DataCloneError` caused by Prisma's `Decimal` type and the SDK's internal `structuredClone` call.

---

## 🚫 Exclusions

The following were **deliberately excluded** to remain focused on the assignment scope:

| Area | Reason |
|------|--------|
| JWT / OAuth Authentication | Out of scope — no auth layer was specified |
| Payment Gateway (Stripe, etc.) | Out of scope — orders are placed without payment processing |
| Rate Limiting / Throttling | Out of scope — not required for evaluation |
| Multi-tenant / RBAC | Out of scope — single-tenant system assumed |

---

## ⚠️ Incomplete Work

| Area | Status | Notes |
|------|--------|-------|
| Conversation History / Memory | ⏳ Not implemented | Each `/assistant/chat` call is stateless — the AI has no memory of prior turns. A session-based chat history would be a natural Task 3 extension. |
| Cursor-based Pagination | ⏳ Deferred | Basic `skip`/`take` offset pagination is implemented. Cursor-based pagination would improve performance on large datasets. |
| Streaming Responses | ⏳ Not implemented | The AI assistant returns a full response synchronously. Server-Sent Events (SSE) streaming would improve perceived latency for long tool-calling chains. |

> ✅ **No known bugs within the defined scope of Tasks 0, 1, and 2.** All features specified in the assignment are fully functional and tested.

---

## 🔧 Third-Party Services

| Provider | Purpose | Required For |
| -------- | ------- | ------------ |
| 🐘 **Neon (PostgreSQL)** | Managed cloud relational database | Task 0 |
| 🐳 **Docker** | Containerized deployment | Task 0 |
| 🔷 **Prisma** | ORM, schema migrations, DB seeding | Task 0 |
| 🦅 **NestJS** | TypeScript backend framework | Task 0 |
| 📄 **Swagger / OpenAPI** | Interactive API documentation | Task 0 |
| ✨ **Google Gemini 3.6 Flash** | Primary AI model (catalog grounding + tool calling) | Task 1 & 2 |
| 🦙 **Meta Llama 3.3 70B** | Fallback AI model for resilience | Task 1 |
| ⚡ **Groq** | Ultra-fast inference provider for fallback routing | Task 1 |
| 🧪 **Vitest** | Unit & E2E test runner | Task 0, 1 & 2 |

---

## ⏱️ Time Spent

### Task 0 — E-Commerce Foundation

| Phase | Duration |
| ----- | -------- |
| 🏗️ Setup & Infrastructure | ~15 min |
| 🗄️ Prisma Schema & DB Migrations | ~10 min |
| ⚙️ Core Business Logic & Services | ~35 min |
| 🧪 E2E & Adversarial Tests | ~20 min |
| 🧹 Cleanup, Docs & Polish | ~53 min |
| **⏳ Total** | **2h 13m** |

### Task 1 — AI Assistant (Catalog Grounding + Multi-Model)

| Phase | Duration |
| ----- | -------- |
| ⚙️ Implementation (AI Assistant) | ~33 min |
| 🧪 Testing (Unit & E2E) | ~11 min |
| **⏳ Total** | **44 min** |

### Task 2 — Native Tool Calling (Search, Order, Check Status)

| Phase | Duration |
| ----- | -------- |
| ⚙️ Implementation (Tool Calling) | ~19 min |
| 🧪 Testing (Unit & E2E) | ~17 min |
| **⏳ Total** | **36 min** |

### 🏁 Grand Total: **~3h 33m**

---

## 🚀 Bootstrapping

> 📄 The **single command** to start the system from a clean state is in **[`RUN.md`](../RUN.md)** at the repository root.

```bash
# From the repository root — installs deps, pushes schema, seeds DB, builds & runs:
cd code && npm ci && npx prisma db push && npx prisma db seed && npm run build && npm run start:prod
```

Once running, access the **interactive Swagger UI** at:

```
http://localhost:3000/api/docs
```

---

## 🧪 API Reference

| Method | Endpoint | Description |
| :----: | -------- | ----------- |
| `POST` | `/customers` | Register a new customer |
| `GET` | `/customers/:id` | Get customer profile |
| `GET` | `/products` | List all products (supports `?search=`) |
| `GET` | `/products/:id` | Get a single product by ID |
| `POST` | `/orders` | Place an order (atomic stock decrement) |
| `GET` | `/orders/:id` | Full order with line items & customer |
| `POST` | `/assistant/chat` | Converse with the AI — search, order, check status |

---

## 📁 Project Structure

```
code/                            # ← NestJS application root
├── 📂 src/
│   ├── 📂 customer/             # Customer module (controller, service, DTO)
│   ├── 📂 product/              # Product module (controller, service)
│   ├── 📂 order/                # Order module (controller, service, DTO)
│   ├── 📂 assistant/            # AI Assistant module (Task 1 & 2)
│   │   ├── 📄 catalog-assistant.service.ts  ← Tool calling logic
│   │   ├── 📄 assistant.controller.ts
│   │   ├── 📄 assistant.module.ts
│   │   └── 📂 dto/
│   ├── 📂 prisma/               # PrismaService — global DB connection
│   ├── 📂 filters/              # Global HTTP exception filter
│   └── 📄 main.ts               # App bootstrap (Swagger + ValidationPipe)
├── 📂 prisma/
│   ├── 📄 schema.prisma         # Data models, relations & indexes
│   └── 📄 seed.ts               # Deterministic fixture seeding script
├── 🐳 Dockerfile                # Multi-stage production build
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 .env.example              # Environment variable template
└── 🔒 .env                      # DATABASE_URL + API keys (not committed)
```

---

<div align="center">

*Built with precision for the **BluBird Interactive** engineering review.*

</div>
