# Mapping: src/components/dashboard/CustomerBookings.tsx

Customer-facing bookings view: status tabs, a progress stepper, cost breakdown,
DP payment, completion + rating, and a click-to-chat link to the provider.

## Type: CustomerBooking

`{ id, providerName, providerWaNumber: string|null, category, description,
address, district, status, scheduledDate, timeSlot, estimatedDays, totalFee,
dpAmount, paymentStatus, reviewRating, createdAt }`. `providerWaNumber` is `null`
until the DP unlocks contact.

## Derivations (pure helpers)

- `isPaid(b)` — payment is `PAID|HELD|RELEASED`.
- `deriveStatus(b)` — `{ label, variant, icon, stage }` for the badge + stepper.
- `needsPayment(b)` / `canComplete(b)` — gate the DP and completion CTAs.

## Component: CustomerBookings

- **Purpose:** Render and act on a customer's bookings.
- **Input:** `{ bookings: CustomerBooking[] }`.
- **Output:** Tabbed list of booking cards plus payment and rating modals.
- **Key flows:**
  - **Pay DP:** confirm modal → `POST /api/bookings/[id]/pay` → Snap popup (or a
    mock success in dev).
  - **Complete + rate:** `POST /api/bookings/[id]/complete` (releases escrow).
  - **Contact provider:** when `providerWaNumber` is set, a "Hubungi Tukang"
    `wa.me` link with a prefilled message referencing the booking ref.
- **Constants:** `PAY_TTL_MS = 60 * 60 * 1000` drives the auto-cancel countdown.

## Dependencies

`buildWALink` ([`utils.md`](utils.md)); `providerWaNumber` is gated upstream in
`src/app/(customer)/dashboard/page.tsx` via `isContactUnlocked`. Payment uses the
Midtrans Snap global. See
[`../modules/payments-and-escrow.md`](../modules/payments-and-escrow.md).
