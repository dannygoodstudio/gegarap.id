# Module: Contact & Notifications

How parties reach each other. As of 2026-06-29 this is **direct contact only** —
there is no programmatic messaging.

## Purpose

Let a worker and a client contact each other directly once a booking is paid,
using the stored WhatsApp number as a click-to-chat link.

## Current design

- A user's WhatsApp number is a stored contact field (`User.phone`).
- It is surfaced as a `wa.me` deep link via `buildWALink()` in `src/lib/utils.ts`.
- Contact opens only after the DP is paid (`isContactUnlocked`), in both
  directions:
  - Provider → customer: the customer number in
    `src/components/dashboard/JobsTable.tsx`
    ([`../mappings/JobsTable.md`](../mappings/JobsTable.md)).
  - Customer → provider: a "Hubungi Tukang" button in
    `src/components/dashboard/CustomerBookings.tsx`
    ([`../mappings/CustomerBookings.md`](../mappings/CustomerBookings.md)).

## Responsibilities

- Build a correct `wa.me` URL (normalised Indonesian number + prefilled message).
- Respect the post-DP contact gate.
- Nothing else — no queue, no gateway, no retries, no credentials.

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/utils.ts` | `buildWALink`, phone-aware formatting | [`../mappings/utils.md`](../mappings/utils.md) |
| `src/lib/whatsapp.ts` | `normalizePhone`, `isValidIndonesianPhone` (no send) | [`../mappings/whatsapp.md`](../mappings/whatsapp.md) |

## What was removed (and why)

Programmatic WhatsApp — OTP and all automated notifications — was deleted. Removed:
`lib/notifications.ts`, `lib/outbox.ts`, the `dispatch-outbox` cron, the Meta Cloud
API transport in `whatsapp.ts`, the `notifyOps` WhatsApp page, and every
`notifyPaymentStatus`/`enqueueWhatsApp`/`sendWAMessage` call site.

Rationale: the product decision is that the number is contact-only, so there is no
dependency on a gateway, token, quota, or connected device. The `OutboxMessage`
table is intentionally left in the schema (unused) to avoid a production migration.

Full record: [`../decisions/2026-06-29-no-inline-comments-and-externalized-docs.md`](../decisions/2026-06-29-no-inline-comments-and-externalized-docs.md)
covers the docs policy; the WhatsApp removal itself shipped in commit `78453b0`.

## Dependencies

None external. `logger.ts` `notifyOps` is now log/Sentry-only.
