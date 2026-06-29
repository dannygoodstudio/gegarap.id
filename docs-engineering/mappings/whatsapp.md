# Mapping: src/lib/whatsapp.ts

Indonesian phone-number helpers. After the WhatsApp-messaging removal this file is
transport-free — it only normalises and validates numbers. See
[`../modules/contact-and-notifications.md`](../modules/contact-and-notifications.md).

## Function: normalizePhone

- **Purpose:** Convert any Indonesian phone input to canonical `628xxxxxxxxxx`.
- **Input:** `raw: string` (may contain spaces, `+`, leading `0` or `62`).
- **Output:** `string` in `628…` form.
- **Logic:** Strip non-digits → a leading `0` becomes `62` → ensure a `62`
  prefix. Pure and total (always returns a string).

## Function: isValidIndonesianPhone

- **Purpose:** Validate a normalised number as a plausible Indonesian mobile.
- **Input:** `phone: string` (expected already normalised).
- **Output:** `boolean`.
- **Logic:** Matches `^628[1-9][0-9]{7,11}$`. Callers normalise first.

## Consumers

`src/lib/validations/auth.ts`, `src/lib/validations/index.ts` (registration/booking
validation). The display side uses `buildWALink` in
[`utils.md`](utils.md), not this file.

## Contract notes

No network calls, no credentials, no side effects. Removing either export breaks
phone validation in the auth and booking schemas.
