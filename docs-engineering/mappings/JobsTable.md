# Mapping: src/components/dashboard/JobsTable.tsx

Provider-facing table of incoming jobs, with search, sort, pagination, and a
click-to-chat link to the customer once contact is unlocked.

## Type: JobRow

`{ id, customerName, customerWaNumber: string|null, customerAddress: string|null,
estimatedDays, totalFee, status, createdAt }`. `customerWaNumber` and
`customerAddress` are `null` until the DP is paid (PROTECTED tier).

## Component: CustomerWa (internal)

- **Purpose:** Render the customer's WhatsApp as a `wa.me` click-to-chat link, or
  the locked hint when withheld.
- **Input:** `{ number: string | null; name: string }`.
- **Output:** an anchor to `buildWALink(number, prefilledMessage)` (opens in a new
  tab; stops row-click propagation), or italic locked text.
- **Business reasoning:** The provider reaches the client directly; there is no
  server-side messaging.

## Component: JobsTable

- **Purpose:** The full provider job list.
- **Input:** `{ jobs: JobRow[] }`.
- **Output:** Desktop table + mobile cards, with toolbar search, `createdAt`/
  `totalFee` sort, and pagination (`PAGE_SIZE = 5`).
- **Notable behaviour:** Empty state when no jobs; an in-memory "Terima"
  acknowledgement per row (client-only); both layouts render `CustomerWa`.

## Dependencies

`buildWALink` ([`utils.md`](utils.md)); the unlock decision is computed upstream in
`src/app/(provider)/provider/dashboard/page.tsx` via `isContactUnlocked`. See
[`../modules/marketplace-and-providers.md`](../modules/marketplace-and-providers.md).
