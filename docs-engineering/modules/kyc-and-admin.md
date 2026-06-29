# Module: KYC & Admin

Provider verification (KYC) and the admin control surface for trust, payments, and
disputes.

## Purpose

Verify provider identity before they can take paid work, and give admins audited
tools to review KYC, resolve refunds/disputes, and inspect business health.

## Responsibilities

- Accept and privately store KYC documents (KTP) with signed-URL access.
- Drive a KYC review queue: pending → approve/reject (with reason).
- Provide admin-only refund resolution and forced payment actions.
- Expose business metrics; write an `AuditLog` entry for every privileged action.

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/storage.ts` | Supabase private upload + signed URLs | _to add_ |
| `src/lib/admin-guard.ts` | `requireAdmin` gate | _to add_ |
| `src/lib/audit.ts` | `recordAudit`, `AuditAction` | _to add_ |
| `src/lib/metrics.ts` | Aggregations for the admin dashboard | _to add_ |
| `src/app/api/upload/ktp/route.ts` | KYC document upload | _to add_ |
| `src/app/api/admin/providers/[id]/approve|reject/route.ts` | KYC decisions | _to add_ |
| `src/app/api/admin/refunds/[id]/resolve/route.ts` | Refund approve/reject | _to add_ |
| `src/app/api/admin/payments/[id]/force/route.ts` | Force REFUND/RELEASE | _to add_ |
| `src/app/api/admin/metrics/route.ts` | Business metrics (admin-gated) | _to add_ |

## Data flow

```
Provider onboarding ──> /api/upload/ktp ──> Supabase private bucket (signed URL)
Admin queue ──> /api/admin/providers/pending ──> approve|reject ──> kycStatus
Dispute ──> /api/admin/refunds/[id]/resolve ──> state machine + audit
```

## Invariants

- KYC documents are never public; access is via short-lived signed URLs.
- Every privileged action is gated by `requireAdmin` and written to `AuditLog`.
- A provider can be paid only after `kycStatus = APPROVED` (enforced in payout).

## Dependencies

Supabase Storage, PostgreSQL (`ProviderProfile`, `AuditLog`, `RefundRequest`,
`Payment`), the payment state machine, `src/lib/logger.ts`.

## Notes

KYC decisions previously notified providers over WhatsApp; that send was removed
(see [`contact-and-notifications.md`](contact-and-notifications.md)). The decision,
audit, and status change are unchanged.
