# Mapping: src/lib/logger.ts

Structured JSON logging with an optional Sentry sink. Ops alerting is log/Sentry
only — the WhatsApp paging path was removed.

## Types

- `LogLevel = 'info' | 'warn' | 'error'`.
- `PaymentLogEvent` — the canonical event-name union (payment, webhook,
  disbursement, refund, reconciliation, fraud, ops).

## Function: logEvent

- **Purpose:** Emit one structured JSON line per event; forward `warn`/`error` to
  Sentry with trace tags.
- **Input:** `event: PaymentLogEvent | string`, `data = {}`, `level = 'info'`.
- **Output:** `void`.
- **Logic:** Serialize `{ ts, level, event, ...data }` to the matching console
  method; if not `info`, also `captureMessage` to Sentry tagged with
  paymentId/bookingId/order_id.

## Function: logAlert

- **Purpose:** Record a must-page anomaly at error level with a stable `alert` tag.
- **Input:** `alert: string`, `data = {}`.
- **Output:** `void`.
- **Logic:** `logEvent('webhook.anomaly', { alert, ...data }, 'error')`.

## Function: notifyOps

- **Purpose:** Surface the highest-severity alarms (financial mismatch, repeated
  signature/disbursement failures).
- **Input:** `alert: string`, `data = {}`.
- **Output:** `Promise<void>`.
- **Logic:** Emits an `ops.alerted` error-level event (→ stdout + Sentry).
- **Contract change:** Previously also messaged an ops WhatsApp number
  (`OPS_ALERT_PHONE`). Programmatic WhatsApp was removed, so it is now log/Sentry
  only; the signature is unchanged so callers (e.g. `payout.ts`) are untouched.

## Consumers

The payment/webhook/payout paths across `src/lib` and `src/app/api`. Pair
`notifyOps` with `logAlert` at the call site for the durable record.
