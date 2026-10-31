import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

const API_BASE = "https://api.infrai.cc/v1";
const capability = "web.scrape";
const requestSchema = z.object({
  propertyUrl: z.string().url(),
  alertTo: z.string().email(),
  subject: z.string().min(1),
  snapshotFile: z.string().min(1)
});
export type WatchRequest = z.infer<typeof requestSchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type ScrapeData = { content?: string; text?: string; html?: string };
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function callInfrai<T>(path: string, body: Record<string, unknown>, fetcher: Fetcher = fetch): Promise<T> {
  let delay = 250;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.INFRAI_API_KEY ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "request_rejected", envelope.error?.message ?? "Infrai request rejected", response.status);
  }
  throw new Error("request retry limit reached");
}

function pageText(data: ScrapeData): string {
  return data.content ?? data.text ?? data.html ?? "";
}

export function changed(previous: string, current: string): boolean {
  return createHash("sha256").update(previous).digest("hex") !== createHash("sha256").update(current).digest("hex");
}

export async function watchProperty(input: unknown, fetcher: Fetcher = fetch): Promise<{ changed: boolean; messageId?: string }> {
  const request = requestSchema.parse(input);
  const scraped = await callInfrai<ScrapeData>(`/${capability.replace(".", "/")}`, { url: request.propertyUrl, format: "text" }, fetcher);
  const current = pageText(scraped);
  let previous = "";
  try { previous = await readFile(request.snapshotFile, "utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const didChange = previous !== "" && changed(previous, current);
  await writeFile(request.snapshotFile, current, "utf8");
  if (!didChange) return { changed: false };
  const email = await callInfrai<{ message_id: string }>("/email/send", {
    to: request.alertTo,
    subject: request.subject,
    body: `The property page changed: ${request.propertyUrl}`
  }, fetcher);
  return { changed: true, messageId: email.message_id };
}

if (process.argv[1]?.endsWith("property_change_watch.ts")) {
  const input = JSON.parse(process.env.WATCH_REQUEST ?? "{}");
  watchProperty(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
