import assert from "node:assert/strict";
import { watchProperty } from "./property_change_watch.ts";

const responses = (text: string, messageId?: string): Response => new Response(JSON.stringify({ ok: true, data: messageId ? { message_id: messageId } : { content: text } }), { status: 200, headers: { "content-type": "application/json" } });
let calls = 0;
const fetcher = async (): Promise<Response> => { calls += 1; return calls === 1 ? responses("inspection due") : responses("inspection due", "msg-1"); };
const file = "/tmp/property-change-watch-test.txt";
const first = await watchProperty({ propertyUrl: "https://example.com/building", alertTo: "manager@example.com", subject: "Property page changed", snapshotFile: file }, fetcher);
assert.deepEqual(first, { changed: false });
const second = await watchProperty({ propertyUrl: "https://example.com/building", alertTo: "manager@example.com", subject: "Property page changed", snapshotFile: file }, fetcher);
assert.deepEqual(second, { changed: true, messageId: "msg-1" });
assert.equal(calls, 3);
console.log("property change decision: unchanged page is quiet; changed page sends one alert");
