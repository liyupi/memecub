export interface Meme {
  id: string;
  title: string;
  title_zh: string | null;
  url: string;
  thumb_url: string;
  page_url: string;
  width: number;
  height: number;
  kind: string;
  license: { code: string; name: string; commercial_use: boolean; attribution_required: boolean; remix_allowed: boolean };
  attribution: string | null;
  review_status: string;
  private: boolean;
  profane: boolean;
  markdown: string;
}

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
  kind?: string;
  category?: string;
  noCredit?: boolean;
  commercialOnly?: boolean;
  privateOnly?: boolean;
  /** Include memes whose captions contain swearing. */
  profanity?: boolean;
  /** Minimum width and height in pixels. */
  minSize?: number;
}

export class MemecubClient {
  constructor(
    readonly baseUrl = process.env.MEMECUB_API_URL ?? "https://memecub.com",
    readonly apiKey = process.env.MEMECUB_API_KEY,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
    return data as T;
  }

  search(p: SearchParams) {
    const qs = new URLSearchParams({ q: p.q, limit: String(p.limit ?? 10) });
    if (p.offset) qs.set("offset", String(p.offset));
    if (p.kind) qs.set("kind", p.kind);
    if (p.category) qs.set("category", p.category);
    if (p.noCredit) qs.set("no_credit", "1");
    if (p.commercialOnly) qs.set("commercial", "1");
    if (p.privateOnly) qs.set("private", "1");
    if (p.profanity) qs.set("profanity", "1");
    if (p.minSize) qs.set("min_size", String(p.minSize));
    return this.request<{ data: Meme[]; total: number; backfill_queued: boolean }>(`/api/v1/search?${qs}`);
  }

  get(id: string) {
    return this.request<{ data: Meme & { source_url: string | null; author: string | null } }>(
      `/api/v1/memes/${encodeURIComponent(id)}`,
    );
  }

  match(text: string, opts: { count?: number; noCredit?: boolean; commercialOnly?: boolean; profanity?: boolean } = {}) {
    return this.request<{
      data: {
        markdown: string;
        slots: { anchor: string; emotion: string; reason: string; meme?: Meme; alternatives: Meme[]; placed: boolean }[];
      };
    }>("/api/v1/match", {
      method: "POST",
      body: JSON.stringify({
        text,
        count: opts.count ?? 4,
        no_credit: opts.noCredit ?? false,
        commercial: opts.commercialOnly ?? false,
        profanity: opts.profanity ?? false,
      }),
    });
  }

  categories() {
    return this.request<{ data: { slug: string; name: string; name_zh: string; count: number }[] }>("/api/v1/categories");
  }
}
