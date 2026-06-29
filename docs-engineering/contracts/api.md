# API Contracts

HTTP endpoints under `src/app/api/**/route.ts`. Handlers return a uniform envelope
via `src/lib/api.ts`.

## Response envelope

- **Success:** `ok(data)` → `{ ok: true, data }`, HTTP 200.
- **Failure:** `fail(message, status)` → `{ ok: false, message }`, HTTP `status`.
- **Method mismatch:** routes export only the methods they support; other verbs
  return 405 (e.g. POST-only routes answer GET with 405).

## Error handling rules

- Validation uses Zod; a schema failure returns 422 with a human message.
- Auth failures return 401 (no/invalid session) or 403 (authenticated but not
  allowed, e.g. admin-gated routes).
- Not-found returns 404. Conflicting state transitions return 409.
- External-service failures are isolated: the business write commits and the
  best-effort side effect is logged, not surfaced as a 5xx.

## Auth & identity

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/auth/session` | POST | Exchange a Firebase idToken for an httpOnly session cookie | Public (valid idToken) |
| `/api/auth/resolve-identifier` | POST | Resolve a WhatsApp number → login email (server-side) | Public |
| `/api/auth/me` | GET | Current authenticated user, Postgres-authoritative | Session |

## Bookings & payment lifecycle

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/bookings` | POST | Create a Job + PENDING Payment, snapshot fees, return Snap token. Accepts `Idempotency-Key` | Customer session |
| `/api/bookings/[id]/pay` | POST | Regenerate a Snap token to pay the DP from the dashboard | Customer (owner) |
| `/api/bookings/[id]/start` | POST | Provider starts work: `PAID → HELD`, job `IN_PROGRESS` | Provider (owns job) |
| `/api/bookings/[id]/mark-done` | POST | Provider marks finished: job `AWAITING_CONFIRMATION`, starts 72h clock | Provider (owns job) |
| `/api/bookings/[id]/complete` | POST | Customer confirms + rates: `releaseAndSettle` (`RELEASED` + payout) | Customer (owner) |
| `/api/bookings/[id]/refund` | POST | Customer requests refund/dispute; policy decides auto-refund vs dispute | Customer (owner) |
| `/api/bookings/[id]/receipt` | GET | Receipt data / PDF nota | Customer (owner) |

## Payments webhook & admin

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/webhooks/midtrans` | POST | Signature-verified, idempotency-ledgered payment status callback | Midtrans (signed) |
| `/api/admin/payments/[id]/force` | POST | Force REFUND/RELEASE with mandatory reason, audited | Admin |
| `/api/admin/refunds/[id]/resolve` | POST | Approve/reject a refund request | Admin |
| `/api/admin/metrics` | GET | Business metrics dashboard data | Admin (403 otherwise) |

## Marketplace & providers (public)

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/providers` | GET | Search providers; public fields only, coordinates fuzzed | Public |
| `/api/workers` | GET | Map markers for the worker map | Public |
| `/api/stats` | GET | Aggregate counts for the homepage | Public |
| `/api/contact` | POST | Support/contact form submission | Public |

## KYC, onboarding & uploads

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/onboarding` | POST | Create/update a ProviderProfile during onboarding | Session |
| `/api/upload` | POST | Generic asset upload | Session |
| `/api/upload/ktp` | POST | Private KYC document upload (Supabase, signed URLs) | Session |
| `/api/admin/providers/pending` | GET | KYC review queue | Admin |
| `/api/admin/providers/[id]` | GET | Provider detail for review | Admin |
| `/api/admin/providers/[id]/approve` | POST | Pass KYC; provider goes live | Admin |
| `/api/admin/providers/[id]/reject` | POST | Reject KYC with reason | Admin |

## Assistant & cron

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/ai/chat` | POST | AI assistant over provider RAG with deterministic fallback | Public/session |
| `/api/cron/auto-cancel` | GET | Expire `PENDING` payments older than 60m | Cron (Bearer `CRON_SECRET`) |
| `/api/cron/reconcile` | GET | Re-query Midtrans for stuck pending payments, self-heal | Cron |
| `/api/cron/auto-release` | GET | Release escrow 72h after `AWAITING_CONFIRMATION` | Cron |

The `dispatch-outbox` cron was removed with programmatic WhatsApp; see
[`modules/contact-and-notifications.md`](../modules/contact-and-notifications.md).
