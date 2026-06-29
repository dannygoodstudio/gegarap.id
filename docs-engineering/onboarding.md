# Onboarding Guide

How to understand gegarap.id quickly, in the order that builds the most context.

## 1. Read these first

1. [`system-overview.md`](system-overview.md) — the shape of the system.
2. This guide — entry points and the three flows that matter.
3. [`modules/payments-and-escrow.md`](modules/payments-and-escrow.md) — the heart
   of the product.

## 2. Run it locally

| Step | Command |
|------|---------|
| Install | `npm install` |
| Env | copy `.env.example` → `.env`, fill what you need (most external creds are mock-safe when blank) |
| DB up (local) | `npm run db:up` (Docker Postgres), then `npm run db:migrate:deploy` and seed |
| Dev server | `npm run dev` |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit` |
| Tests | `node node_modules/vitest/vitest.mjs run` |

Without external creds: payments are mocked, KYC upload no-ops, and WhatsApp is a
plain `wa.me` link, so the full flow is exercisable offline.

## 3. Entry points

- **Pages (App Router):** `src/app/(marketing)`, `src/app/(customer)`,
  `src/app/(provider)`, `src/app/admin`.
- **HTTP API:** `src/app/api/**/route.ts` — see
  [`contracts/api.md`](contracts/api.md).
- **Server actions:** `src/app/actions/*`.
- **Business logic:** `src/lib/**` (services in `src/lib/services`, the payment
  state machine in `src/lib/payment-state.ts`).

## 4. The three key flows

### Booking → DP payment
`POST /api/bookings` (`src/lib/services/booking.ts`) creates a `Job` + a `Payment`
in `PENDING`, snapshots fees from `FeeConfig`, and returns a Midtrans Snap token.
The customer pays the DP; Midtrans calls the webhook.

### Webhook → escrow → release
`POST /api/webhooks/midtrans` (`src/lib/services/midtrans-webhook.ts`) verifies
the signature, dedupes via `WebhookEvent`, and requests `PENDING → PAID`. Work
progresses `start` (`PAID → HELD`) → `mark-done` → customer `complete` or the 72h
`auto-release` cron, which runs `releaseAndSettle` (`RELEASED` + provider payout).

### Identity + contact
Login is Firebase email/password or Google; a WhatsApp number is resolved to an
email via `POST /api/auth/resolve-identifier`. The number is stored as a contact
and shown as a `wa.me` click-to-chat once the DP unlocks it — never used to send
messages.

## 5. Conventions

- API handlers return `ok(data)` / `fail(message, status)` from `src/lib/api.ts`.
- Authorization helpers live in `src/lib/authz.ts` and `src/lib/admin-guard.ts`.
- Money is integer Rupiah; format with `formatCurrency` in `src/lib/utils.ts`.
- Documentation goes in `docs-engineering/`, not in code comments
  ([`README.md`](README.md)).
