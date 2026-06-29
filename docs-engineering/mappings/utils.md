# Mapping: src/lib/utils.ts

Presentation helpers: class merging, currency/date formatting, time-slot labels,
and the `wa.me` deep-link builder.

## Function: cn

- **Purpose:** Merge conditional class names without Tailwind conflicts.
- **Input:** `...inputs: ClassValue[]`.
- **Output:** `string`.
- **Logic:** `twMerge(clsx(inputs))`.

## Function: formatCurrency

- **Purpose:** Render integer Rupiah as `Rp 1.234.567`.
- **Input:** `amount: number` (integer Rupiah).
- **Output:** `string`.
- **Logic:** `id-ID` locale grouping with an `Rp ` prefix.

## Function: formatBookingDate

- **Purpose:** Human booking date, e.g. `Senin, 23 Juni 2026`.
- **Input:** `Date | string | null | undefined`.
- **Output:** `string` (`-` for missing/invalid).

## Function: formatDateTime

- **Purpose:** Date + time, e.g. `23 Juni 2026, 10:32`.
- **Input/Output:** as `formatBookingDate`.

## Function: timeSlotStart

- **Purpose:** Concrete start time for a slot, e.g. `08:00 WIB`.
- **Input:** `slot: "pagi" | "siang" | "sore" | string | null`.
- **Output:** `string`.

## Function: timeSlotLabel

- **Purpose:** Slot as a window, e.g. `08:00–11:00 WIB`.
- **Input/Output:** as `timeSlotStart`.

## Function: buildWALink

- **Purpose:** Build a `wa.me` click-to-chat URL for direct contact.
- **Input:** `phone: string`, optional `message = ''`.
- **Output:** `https://wa.me/<digits>[?text=<encoded>]`.
- **Logic:** Strip non-digits, leading `0` → `62`, URL-encode the message.
- **Business reasoning:** This is the only contact mechanism after the
  programmatic-WhatsApp removal; the post-DP gate is enforced by callers, not here.

## Consumers

`buildWALink`: [`JobsTable.md`](JobsTable.md),
[`CustomerBookings.md`](CustomerBookings.md), the help/support page. Formatters are
used across dashboards, receipts, and booking pages.
