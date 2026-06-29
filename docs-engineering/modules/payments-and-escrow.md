# Module: Payments & Escrow

The financial core: charging the DP, holding funds in escrow, releasing to the
provider, and refunds/disputes.

## Purpose

Move money correctly and irreversibly-safely through a guarded lifecycle, so a
customer's funds are never lost and a provider is paid only for confirmed work.

## Responsibilities

- Own the `Payment` state machine and its 11 states.
- Compute fees and the DP from configurable `FeeConfig` rules.
- Ingest Midtrans webhooks safely (signed, idempotent, in-order).
- Hold funds (escrow), then release + settle the provider payout.
- Evaluate refunds/disputes against a declarative policy.
- Emit an append-only audit (`PaymentEvent`, `AuditLog`).

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/payment-state.ts` | Allowed-transition map + guarded `transitionPayment` | _to add_ |
| `src/lib/calculations.ts` + `src/lib/fee-config.ts` | Percent-based fee/DP rules | _to add_ |
| `src/lib/services/booking.ts` | Create Job + Payment, snapshot fees, Snap token | _to add_ |
| `src/lib/services/midtrans-webhook.ts` | Verify + dedupe + request transition | _to add_ |
| `src/lib/payout.ts` | `releaseAndSettle`, KYC-gated `settleProviderPayout` | [`../mappings/payout.md`](../mappings/payout.md) |
| `src/lib/refund-policy.ts` | Declarative refund/dispute matrix | _to add_ |
| `src/lib/disbursement.ts` | Pluggable disbursement provider (mock/gateway) | _to add_ |
| `src/lib/midtrans.ts` | Snap charge + gateway refund | _to add_ |

## Data flow

```
POST /api/bookings ──> booking.ts ──> Job + Payment(PENDING) + Snap token
        customer pays DP
Midtrans ──> POST /api/webhooks/midtrans ──> verify+dedupe ──> PENDING→PAID
        provider works
/start (PAID→HELD) ──> /mark-done (AWAITING_CONFIRMATION, 72h clock)
        customer confirms OR 72h elapses
/complete | cron/auto-release ──> releaseAndSettle ──> RELEASED + Payout
```

Refund path: `POST /api/bookings/[id]/refund` → `refund-policy.ts` decides
auto-refund vs dispute → state machine → optional gateway refund.

## State lifecycle

`DRAFT | PENDING | PAID | HELD | RELEASED | REFUND_REQUESTED | REFUNDED |
REFUND_REJECTED | DISPUTED | EXPIRED | FAILED`. Only `payment-state.ts` mutates
`Payment.status`; every change writes a `PaymentEvent`.

## Invariants

- Money is integer Rupiah; the provider is never short-changed (`floor` fees).
- A webhook can never force an out-of-order transition; duplicates are no-ops.
- A payout for an un-KYC'd provider stays `SCHEDULED` (held, not lost).

## Dependencies

PostgreSQL (Prisma), Midtrans (charge + webhook + refund), the disbursement
provider (Iris/gateway, mockable), `src/lib/logger.ts` for observability.

## Notes

Status change notifications used to fan out over WhatsApp; that path was removed
(see [`contact-and-notifications.md`](contact-and-notifications.md)). The state
machine and audit trail are unchanged.
