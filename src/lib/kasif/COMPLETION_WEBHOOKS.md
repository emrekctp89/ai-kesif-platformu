# Verified completion protocol

`POST /api/kasif/completion-claim` issues a one-time, 24-hour opaque claim for an
allowlisted partner tool. Put the returned token into the partner OAuth state or
job metadata; never log or persist the raw token outside that handoff.

Partners send `POST /api/kasif/completion-webhook/{tool-slug}` with:

- `x-kasif-timestamp`: Unix seconds
- `x-kasif-signature`: `sha256=` plus HMAC-SHA256 of
  `{timestamp}.{raw request body}`
- JSON: `{ eventId, eventType: "job.completed", claimToken, occurredAt }`

Secrets live only in `KASIF_PARTNER_WEBHOOK_SECRETS_JSON`. Webhook timestamps
expire after five minutes, event IDs and claims are one-time, and the database
records the evidence atomically. Raw payloads and claim tokens are not stored.

Self-reported completion remains available, but analytics must use
`verifiedJobDone` / `verifiedDoneOfStated` for externally defensible claims.
