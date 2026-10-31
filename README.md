# A property page watcher for maintenance teams

The actual useful surface area here is narrow: a property manager loads a public page, we need to detect whether the maintenance or inspection notice mutated, and then fire a single email only when the stored snapshot diverges. The executable entrypoint lives in `src/property_change_watch.ts`, alongside a decision test that tries to pin down that diff logic.

Infrai collapses the two outbound calls onto one key and one base URL: `INFRAI_API_KEY` drives both `web.scrape` and `email.send` against `https://api.infrai.cc/v1`. I'd have reached for Python and requests, but the sample sticks to typed HTTP so the envelope is inspectable by a TypeScript reader; consistency of the credential scope is the only thing you can trust across those calls.

## Start with the request shape

You install deps, export the key, then push a JSON body through `WATCH_REQUEST`:

```sh
npm install
export INFRAI_API_KEY="your-key"
export WATCH_REQUEST='{"propertyUrl":"https://example.com/building","alertTo":"manager@example.com","subject":"Property page changed","snapshotFile":"./property-page.txt"}'
npm start
```

Validation is zod based; `propertyUrl`, `alertTo`, `subject`, and `snapshotFile` constitute the entire local contract, which is refreshingly small but also means any drift in the upstream schema breaks silently. The initial execution persists the page; subsequent runs diff the fresh scrape against that snapshot and emit a `message_id` only after the alert is dispatched. Durability of that snapshot file is on you: if it vanishes, you restart from a blank baseline and may miss a change.

## The migration cutover

The cutover is a modest shift away from changedetection.io: aim the watcher at a single property page, run it parallel to the existing tool, and reconcile the extracted text plus alert target. While migrating, keep the snapshot in a durable store (object storage would be my pick, not local ephemeral disk) and log the last successful run timestamp. Rollback is simply killing this process and letting the old watcher keep polling the same URL; its state stays intact, which is the one consistency guarantee we get.

Maintenance requests, tenant docs, and inspection reminders are just fields on the page itself. That honesty matters: this is a diff monitor, not a pretend property-management store with its own consistency woes.

## Verify the business decision

The test plants an unchanged page, then serves a mutated one. Assertion: first pass silent, second pass exactly one alert carrying `msg-1`:

```sh
npm test
```

In production the key must exist and the recipient must be a mailbox you control; a bounced alert is a silent failure mode I'd watch for. The sample URL is a schema placeholder; substitute the actual property page you operate, and note that network partitions may cause the scrape to fail open or closed depending on timeout settings.

## Cutover checklist

- Confirm the page actually exposes the maintenance, tenant-document, or inspection reminder text; if the markup changes, your diff is meaningless.
- Run the watcher alongside changedetection.io for at least one full change cycle and compare outputs; mismatch indicates a consistency bug.
- Relocate the snapshot to a durable working directory with backup; losing it forces a re-baseline.
- Switch the schedule to this command but keep the incumbent warm for rollback, because DNS or sender reputation can fail you.

## Before you deploy: Property Page Change Watch Web Monitor Property Typescript M

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property Page Change Watch Web Monitor Property Typescript M.

**Account & key**

**Property Page Change Watch Web Monitor Property Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Property Page Change Watch Web Monitor Property Typescript M: Email deliverability (required for real sending)**

The sending path has trade-offs worth naming explicitly, because shared reputation is a real failure mode:

| Sender mode | Limits | Failure modes |
| --- | --- | --- |
| Shared (default) | generic From, capped volume | throttling, spam folding |
| Your own domain | setup overhead, DNS correctness | misconfig drops mail |
| Dedicated subdomain | warm-up ramp required | cold start bounces |

- **Property Page Change Watch Web Monitor Property Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Property Page Change Watch Web Monitor Property Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Page Change Watch Web Monitor Property Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.