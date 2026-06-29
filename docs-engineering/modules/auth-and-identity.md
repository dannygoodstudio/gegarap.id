# Module: Auth & Identity

Credential verification and session management. Hybrid: Firebase verifies
credentials, PostgreSQL is the source of truth for domain identity.

## Purpose

Let users register and sign in (email/password or Google), bridge a Firebase
session into an httpOnly server cookie, and expose a Postgres-authoritative
current-user lookup. WhatsApp is an identifier and contact field, never an OTP.

## Responsibilities

- Client sign-in via Firebase (`auth-actions.ts`), exchanged for a server cookie.
- Verify the session cookie server-side (`firebase/session.ts`).
- Resolve a WhatsApp number → login email without exposing Firestore to the client.
- Provide `getSession()` for route handlers and server components.

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/firebase/client.ts` | Browser Firebase app (public config, env-overridable) | _to add_ |
| `src/lib/firebase/admin.ts` | Admin SDK (service account) for verification | _to add_ |
| `src/lib/firebase/session.ts` | Cookie ↔ session bridge, `getSession()` | _to add_ |
| `src/lib/firebase/auth-actions.ts` | `loginWithGoogle`, `loginWithEmailPassword`, `resolveWhatsapp`, error mapping | _to add_ |
| `src/app/api/auth/session/route.ts` | idToken → httpOnly cookie | _to add_ |
| `src/app/api/auth/resolve-identifier/route.ts` | WA → email lookup | _to add_ |
| `src/app/api/auth/me/route.ts` | Current user from Postgres | _to add_ |
| `src/lib/validations/auth.ts` | `registerSchema` and friends | _to add_ |

## Data flow

```
Register form ──> registerUser action ──> Firebase user + Postgres User
        then loginWithEmailPassword ──> idToken
        ──> POST /api/auth/session ──> httpOnly cookie
Subsequent requests ──> getSession() ──> { user.id == Firebase uid }
WA-number login ──> POST /api/auth/resolve-identifier ──> email ──> Firebase sign-in
```

## Invariants

- `User.id` equals the Firebase uid.
- The client never queries Firestore for identity; resolution is server-side.
- No OTP exists in the auth path; there is no WhatsApp send.

## Dependencies

Firebase Auth + Admin SDK, PostgreSQL (`User`), the phone helpers in
`src/lib/whatsapp.ts` ([`../mappings/whatsapp.md`](../mappings/whatsapp.md)).
