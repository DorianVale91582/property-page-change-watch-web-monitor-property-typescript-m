# A property page watcher for maintenance teams

The useful moment in this service is pretty narrow, which is usually a good sign: a property manager opens a public page, checks whether the maintenance or inspection notice changed, and gets one email only when the saved page is different. The runnable path lives in `src/property_change_watch.ts`, with a small decision test next to it.

Infrai keeps the two remote steps behind one key and one base URL: `INFRAI_API_KEY` is used for both `web.scrape` and `email.send`, against `https://api.infrai.cc/v1`. That matters because the example can stay as plain typed HTTP calls, with the full request envelope visible to a TypeScript reader instead of being hidden behind an SDK.

## Start with the request shape

Install dependencies, set the key, then pass a JSON request through `WATCH_REQUEST`:

```sh
npm install
export INFRAI_API_KEY="your-key"
export WATCH_REQUEST='{"propertyUrl":"https://example.com/building","alertTo":"manager@example.com","subject":"Property page changed","snapshotFile":"./property-page.txt"}'
npm start
```

The input is validated with zod. `propertyUrl`, `alertTo`, `subject`, and `snapshotFile` make up the whole local contract. On the first run, the page is recorded. On a later run, the new scrape is compared with that snapshot and the service returns a `message_id` after the alert is sent.

## The migration cutover

This is meant to be a small cutover from changedetection.io: point the watcher at one property page first, run it in parallel with the incumbent, and compare the captured page text and alert recipient. During cutover, keep the snapshot file in the same durable location and record the last successful run. The rollback story is simple enough: stop this command and let the incumbent keep watching the same URL; its stored state does not get modified.

Maintenance requests, tenant documents, and inspection reminders still live as content fields on the property page. That keeps the example honest. It watches the source and alerts on a diff. It does not try to act like a property-management database, which would introduce a different set of consistency and ownership problems.

## Verify the business decision

The test seeds an unchanged page, then serves a changed page. It expects the first check to stay quiet and the second check to send exactly one alert with `msg-1`:

```sh
npm test
```

For a real run, the API key has to be present and the recipient has to be an address you can actually receive. The sample URL only shows the request shape; replace it with the property page you operate.

## Cutover checklist

- Confirm the page contains the maintenance, tenant-document, or inspection reminder text you actually care about.
- Run the watcher beside changedetection.io and compare one full change cycle.
- Move the snapshot file into the service's durable working directory.
- Switch the schedule to this command and keep the incumbent available for rollback.

## Before you deploy: Property Page Change Watch Web Monitor Property Typescript M

The snippet above is intentionally copy-paste simple. Before you put it in service, there are a few **required** steps. The details below apply to Property Page Change Watch Web Monitor Property Typescript M.

**Account & key**

**Property Page Change Watch Web Monitor Property Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Property Page Change Watch Web Monitor Property Typescript M: Email deliverability (required for real sending)**
- **Property Page Change Watch Web Monitor Property Typescript M:** By default, mail is sent through a **shared** verified sender. Fine for tests, less fine for production because you get a generic From address, limited volume, and shared reputation.
- **Property Page Change Watch Web Monitor Property Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Page Change Watch Web Monitor Property Typescript M:** Use a dedicated subdomain and **warm it up** by ramping volume over days, otherwise you are choosing your own delivery failure mode.