# Module: AI Assistant

A conversational helper that finds suitable providers from a natural-language
request, backed by retrieval over the provider catalogue.

## Purpose

Turn a free-text need ("butuh tukang AC di Bekasi besok") into a filtered,
ranked set of real providers, with a deterministic fallback when the model is
unavailable.

## Responsibilities

- Extract structured intent (category, area, constraints) from the message.
- Retrieve candidate providers via keyword + filter RAG over `ProviderProfile`
  (no embeddings).
- Produce a structured, grounded answer with the model, or a deterministic
  fallback ranking.
- Score for fraud/quality signals and persist the conversation.

## Key files

| File | Role | Mapping |
|------|------|---------|
| `src/lib/ai/chat.ts` | Orchestration of a chat turn | _to add_ |
| `src/lib/ai/extract.ts` | Message → structured intent | _to add_ |
| `src/lib/ai/search.ts` | Filter + keyword retrieval | _to add_ |
| `src/lib/ai/fraud.ts` | Fraud/quality scoring + badge | _to add_ |
| `src/lib/ai/prompt.ts` | Prompt construction | _to add_ |
| `src/lib/cache.ts` | Upstash response cache | _to add_ |
| `src/app/api/ai/chat/route.ts` | HTTP entry | _to add_ |

## Data flow

```
POST /api/ai/chat ──> extract intent ──> search.ts (filter+keyword over providers)
        ──> prompt.ts ──> Claude (structured) | deterministic fallback
        ──> fraud scoring ──> persist ChatSession ──> response (cached)
```

## Dependencies

Anthropic Claude (`claude-sonnet-4-6`, `@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`),
Upstash (cache), PostgreSQL (`ProviderProfile`, `ChatSession`). All are optional
at runtime — the deterministic path keeps the feature usable without the model.
