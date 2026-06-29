# Module: Marketplace & Providers

Public discovery of workers and the customer-facing booking surface, with PII kept
behind a payment gate.

## Purpose

Let customers find and compare verified providers, while exposing only safe public
fields and withholding precise location/contact until a booking is paid.

## Responsibilities

- Serve searchable, filterable provider listings (public-safe projection).
- Provide map markers with fuzzed coordinates.
- Surface aggregate stats for the homepage.
- Gate a provider's exact contact/address behind the post-DP unlock.

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/providers.ts` | Provider query + public projection | _to add_ |
| `src/lib/authz.ts` | `isContactUnlocked`, ownership/PII guards | _to add_ |
| `src/app/api/providers/route.ts` | Search endpoint (fuzzed coords) | _to add_ |
| `src/app/api/workers/route.ts` | Map markers | _to add_ |
| `src/app/api/stats/route.ts` | Homepage aggregates | _to add_ |
| `src/components/dashboard/JobsTable.tsx` | Provider job list + customer wa.me contact | [`../mappings/JobsTable.md`](../mappings/JobsTable.md) |
| `src/components/dashboard/CustomerBookings.tsx` | Customer bookings + provider wa.me contact | [`../mappings/CustomerBookings.md`](../mappings/CustomerBookings.md) |

## Data flow

```
Search/Map pages ──> /api/providers, /api/workers ──> public projection (no PII)
Booking paid (DP) ──> isContactUnlocked == true
        ──> provider sees customer phone/address (JobsTable)
        ──> customer sees provider phone (CustomerBookings)  [wa.me click-to-chat]
```

## Invariants

- Public endpoints never return exact coordinates, full address, or phone.
- Contact between parties opens only when `isContactUnlocked(payment.status)` is
  true (DP paid), in both directions.

## Dependencies

PostgreSQL (`ProviderProfile`, `Job`, `Review`), `src/lib/authz.ts`, the wa.me
builder in `src/lib/utils.ts` ([`../mappings/utils.md`](../mappings/utils.md)).
