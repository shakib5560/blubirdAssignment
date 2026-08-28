<div align="center">

# 🛒 Task 0 — E-Commerce Backend Foundation

<p>
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" />
</p>

> **Production-grade REST API and data layer for a minimal e-commerce system.**  
> Customers · Products · Orders — with transactional inventory and atomic price calculation.

</div>

---

## 📖 Overview

This project establishes the **foundation stage** of a four-part e-commerce backend assignment. It delivers a clean, modular REST API implementing full CRUD operations for **Products**, **Customers**, and **Orders** — including server-side total calculation and atomic stock deduction via Prisma transactions.

```
POST /customers  →  Register a customer
GET  /products   →  Browse the catalog
POST /orders     →  Place an order (atomic, transactional)
GET  /orders/:id →  View order with full line-item breakdown
```

---

## ⏱️ Time Spent — Task 0

| Phase                              | Duration   |
| ---------------------------------- | ---------- |
| 🏗️ Setup & Infrastructure          | ~15 min    |
| 🗄️ Prisma Schema & DB Migrations   | ~10 min    |
| ⚙️ Core Business Logic & Services  | ~35 min    |
| 🧪 E2E & Adversarial Tests         | ~20 min    |
| 🧹 Cleanup, Docs & Polish          | ~53 min    |
| **⏳ Total**                        | **2h 13m** |

---

## ⏱️ Time Spent — Task 1

| Phase                              | Duration   |
| ---------------------------------- | ---------- |
| ⚙️ Implementation (AI Assistant)   | ~33 min    |
| 🧪 Testing (Unit & E2E)            | ~11 min    |
| **⏳ Total**                        | **44 min** |

---

## ⏱️ Time Spent — Task 2

| Phase                              | Duration   |
| ---------------------------------- | ---------- |
| ⚙️ Implementation (Tool Calling)   | ~19 min    |
| 🧪 Testing (Unit & E2E)            | ~17 min    |
| **⏳ Total**                        | **36 min** |

---

## 📌 Assumptions

- **Relational database** (PostgreSQL via Neon) was chosen to enforce data integrity through foreign keys, unique constraints, and cascade rules.
- **Docker** is used to guarantee a clean, reproducible startup on any machine.
- **`totalAmount` is always calculated server-side** — never trusted from the client request.
- **Stock deduction is atomic** — runs inside a Prisma `$transaction` to prevent race conditions and overselling.
- **Email uniqueness** is enforced at the database level via a unique index on `Customer.email`.
- **Decimal pricing** (`Prisma.Decimal`) is used instead of floats to ensure precision in financial calculations.

---

## 🚫 Exclusions & Incomplete Work

The following were **intentionally excluded** to stay focused on the core MVP data model:

| Area | Status | Reason |
|------|--------|--------|
| JWT / OAuth Authentication | ❌ Excluded | Out of scope for Task 0 |
| Payment Gateway (Stripe etc.) | ❌ Excluded | Out of scope for Task 0 |
| Cursor-based Pagination | ⏳ Deferred | Basic skip/take implemented |
| Rate Limiting / Throttling | ❌ Excluded | Out of scope for Task 0 |

> ✅ **No known bugs or incomplete features within the defined scope of Task 0.**

---

## 🔧 Third-Party Services

| Provider | Purpose | Required For |
| -------- | ------- | ------------ |
| 🐘 **Neon (PostgreSQL)** | Managed cloud relational database | Task 0 |
| 🐳 **Docker** | Containerized deployment | Task 0 |
| 🔷 **Prisma** | ORM, schema migrations, DB seeding | Task 0 |
| 🦅 **NestJS** | TypeScript backend framework | Task 0 |
| 📄 **Swagger / OpenAPI** | Interactive API documentation | Task 0 |
| ✨ **Google Gemini 3.6 Flash** | Primary AI assistant model | Task 1 |
| 🦙 **Meta Llama 3.3 70B (via Groq)** | Fallback AI assistant model | Task 1 |
| ⚡ **Groq** | Fast AI inference and fallback routing | Task 1 |

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
| `POST` | `/assistant/chat` | Ask the AI assistant a catalog question |

---

## 📁 Project Structure

```
code/                            # ← Repository root
├── 📂 src/
│   ├── 📂 customer/             # Customer module
│   │   ├── 📄 customer.controller.ts
│   │   ├── 📄 customer.service.ts
│   │   ├── 📄 customer.module.ts
│   │   └── 📂 dto/
│   │       └── 📄 create-customer.dto.ts
│   ├── 📂 product/              # Product module
│   │   ├── 📄 product.controller.ts
│   │   ├── 📄 product.service.ts
│   │   └── 📄 product.module.ts
│   ├── 📂 order/                # Order module
│   │   ├── 📄 order.controller.ts
│   │   ├── 📄 order.service.ts
│   │   ├── 📄 order.module.ts
│   │   └── 📂 dto/
│   │       └── 📄 create-order.dto.ts
│   ├── 📂 assistant/            # AI Assistant module (Task 1)
│   │   ├── 📄 assistant.controller.ts
│   │   ├── 📄 assistant.module.ts
│   │   ├── 📄 catalog-assistant.service.ts
│   │   └── 📂 dto/
│   │       └── 📄 chat.dto.ts
│   ├── 📂 prisma/               # Global DB service
│   │   └── 📄 prisma.module.ts
│   ├── 📂 filters/              # Global HTTP exception filter
│   │   └── 📄 all-exceptions.filter.ts
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
