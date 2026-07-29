# Kâşif domain module

Kâşif is treated as an independent product domain. Platform code consumes it
through explicit entrypoints; internal files remain implementation details.

## Public entrypoints

- `@/lib/kasif` — client-safe domain contracts, labels, job-session helpers,
  packs and reporting helpers.
- `@/lib/kasif/server` — server-only orchestration used by routes and actions.

Code inside `src/lib/kasif`, `src/app/api/kasif` and `src/components/kasif` may
use internal modules directly. Other production code must use one of the
public entrypoints.

## Dependency direction

```text
Platform UI ───────────────→ @/lib/kasif
Platform routes/actions ───→ @/lib/kasif/server
                                  │
                                  ↓
                    Kâşif internal domain modules
                                  │
                       adapters (catalog, DB, LLM)
```

Kâşif can depend on platform capabilities only through adapter-oriented
modules such as `retrieval`, `integrations`, `addToolQueue` and
`packAccessServer`. Pure intent, ranking, funnel and job modules must not
import database or framework clients.

`__tests__/lib/kasif-module-boundary.test.js` enforces the outward-facing
import boundary.
