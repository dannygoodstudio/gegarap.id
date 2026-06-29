# Mapping: src/lib/payout.ts

Provider settlement: escrow release and KYC-gated disbursement. Part of
[`../modules/payments-and-escrow.md`](../modules/payments-and-escrow.md).

## Constants

- `MIN_PAYOUT = 10_000` — below this accumulated amount, a payout is held/batched.
- `AUTO_RELEASE_HOURS = 72` — escrow auto-release window after a job is marked done.

## Type: SettleResult

`{ payoutId: string; status: 'SCHEDULED'|'PROCESSING'|'SUCCESS'|'FAILED'; reason?: string }`.

## Function: isPayoutEligible

- **Purpose:** Decide whether a provider may receive money now.
- **Input:** `{ kycStatus, payoutMethod, payoutDetails }`.
- **Output:** `boolean`.
- **Logic:** True only when `kycStatus === 'APPROVED'` and payout method + details
  are present.

## Function: settleProviderPayout

- **Purpose:** Create (if absent) and try to execute the provider payout for a
  RELEASED payment.
- **Input:** `paymentId: string`.
- **Output:** `Promise<SettleResult>`.
- **Flow:**
  - Load payment (+ provider); reuse a live payout or create one.
  - KYC gate fails → leave `SCHEDULED` (funds held, never lost).
  - Below `MIN_PAYOUT` → `SCHEDULED` (batched).
  - Else mark `PROCESSING`, call the disbursement provider, then `SUCCESS` (writes
    `disbursedAt/disbursedAmount`) or `FAILED` (pages ops after repeated failures).
- **Business reasoning:** An ineligible or sub-threshold payout is never dropped;
  it waits in `SCHEDULED` so money is conserved.

## Function: releaseAndSettle

- **Purpose:** Move a payment to RELEASED (stepping `PAID→HELD→RELEASED` as needed)
  and settle the provider.
- **Input:** `paymentId: string, triggeredBy: string, reason: string`.
- **Output:** `Promise<SettleResult>`.
- **Flow:** Validate current status → transition to RELEASED via the state machine
  → `settleProviderPayout`.
- **Callers:** `/api/bookings/[id]/complete`, `/api/cron/auto-release`,
  `/api/admin/refunds/[id]/resolve` (provider-sided), `/api/admin/payments/[id]/force`.

## Contract notes

Status-change notifications were removed; `releaseAndSettle` no longer takes a
`notify` option. Disbursement goes through the pluggable provider in
`src/lib/disbursement.ts` (mock unless `DISBURSEMENT_PROVIDER=gateway`).
