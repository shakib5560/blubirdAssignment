# 🛒 Task 0 — Foundation: Minimal E-Commerce Backend

> **Build a production-grade REST API and data layer for products, customers, and orders.**

---

## Overview

This project establishes the **foundation stage** of a four-part e-commerce backend assignment. It implements a clean, modular REST API with full CRUD operations for **Products**, **Customers**, and **Orders** — including transactional inventory management and server-side price calculation.

**Built with:**

- **NestJS** — TypeScript-first, modular backend framework
- **Prisma** — Type-safe ORM with migration and seeding support
- **PostgreSQL** (Neon) — Managed relational database
- **Docker** — Containerized, reproducible deployments
- **Swagger UI** — Interactive API documentation at `/api/docs`

---

## ⏱ Time Spent for task 0

| Phase                          | Duration   |
| ------------------------------ | ---------- |
| Setup & Infrastructure         | ~15 min    |
| Prisma Schema & DB Migrations  | ~10 min    |
| Core Business Logic & Services | ~35 min    |
| E2E & Adversarial Tests        | ~20 min    |
| Cleanup, Docs & Polish         | ~53 min    |
| **Total**                      | **2h 13m** |

---

## 📌 Assumptions

- A **relational database** (PostgreSQL) was chosen to ensure referential integrity across customers, orders, and products via foreign keys and cascade rules.
- The application relies on **Docker** to guarantee a clean-state, reproducible startup on any machine.
- `totalAmount` on orders is **always calculated server-side** from current database prices — client-submitted prices are never trusted.
- Stock deduction runs inside an **atomic Prisma `$transaction`** to prevent race conditions and overselling.
- Email uniqueness on customers is enforced at the database level via a unique index.

---

## 🚫 Exclusions & Incomplete Work

The following were **intentionally excluded** to keep the MVP focused on the core data model and business logic:

- **Authentication & Authorization** — JWT, OAuth, or session-based auth was not implemented.
- **Payment Gateway Integration** — No real payment processing (Stripe, PayPal, etc.) is wired up.
- **Advanced Pagination** — Basic `skip`/`take` is supported; cursor-based pagination is deferred.
- **Rate Limiting & Throttling** — No request-rate middleware is configured.

> **Note:** There are no known bugs or incomplete features within the defined scope of Task 0.

---

## 🔧 Third-Party Services

| Provider             | Purpose                              | Required For |
| -------------------- | ------------------------------------ | ------------ |
| **Neon (PostgreSQL)** | Managed cloud relational database   | Task 0       |
| **Docker**           | Containerized application deployment | Task 0       |
| **Prisma**           | ORM, migrations, and database seeding | Task 0       |
| **NestJS**           | Backend framework (TypeScript)       | Task 0       |
| **Swagger / OpenAPI** | Interactive API documentation       | Task 0       |

---

## 🚀 Bootstrapping

The **single command** to install dependencies, push the database schema, seed fixtures, build the project, and start the server from a clean state is documented in:

> 📄 **[`RUN.md`](../RUN.md)** — located at the root of the repository.

```bash
# Quick reference (see RUN.md for full details):
cd code && npm ci && npx prisma db push && npx prisma db seed && npm run build && npm run start:prod
```

Once the server is running, access the **Swagger UI** at:

> 🌐 **http://localhost:3000/api/docs**

---

## 📁 Project Structure

```
Assignment/
├── code/                  # NestJS application source
│   ├── src/
│   │   ├── customer/      # Customer module (controller, service, DTO)
│   │   ├── product/       # Product module (controller, service)
│   │   ├── order/         # Order module (controller, service, DTO)
│   │   ├── prisma/        # PrismaService (global DB access)
│   │   ├── filters/       # Global exception filter
│   │   └── main.ts        # App bootstrap with validation & Swagger
│   ├── prisma/
│   │   ├── schema.prisma  # Data models & relations
│   │   └── seed.ts        # Deterministic seeding script
│   └── Dockerfile         # Multi-stage production build
├── fixtures/              # JSON seed data (customers, products)
├── tests/                 # E2E & adversarial test cases
├── transcripts/           # Raw AI session logs
├── RUN.md                 # Single bootstrap command
├── README.md              # This file
└── .env                   # Environment variables (DATABASE_URL)
```

---

## 🧪 API Endpoints

| Method | Endpoint          | Description                                  |
| ------ | ----------------- | -------------------------------------------- |
| `GET`  | `/products`       | List all products (with optional search)     |
| `GET`  | `/products/:id`   | Get a single product by ID                   |
| `POST` | `/customers`      | Register a new customer                      |
| `GET`  | `/customers/:id`  | Get customer profile with recent orders      |
| `POST` | `/orders`         | Place an order (atomic stock decrement)       |
| `GET`  | `/orders/:id`     | Get order details with line items & customer |

---

*Built with precision for the BluBird Interactive engineering review.*
