import { afterEach, describe, expect, it, vi } from "vitest";
import { queryOpenCodeGoQuota } from "./opencode-go.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const FROZEN_NOW = new Date("2026-09-27T12:00:00.000Z");

function mockUsageResponse(body: unknown, status = 200) {
  const fetchSpy = vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    }),
  );
  globalThis.fetch = fetchSpy as any;
  return fetchSpy;
}

describe("queryOpenCodeGoQuota", () => {
  it("parses rolling, weekly and monthly windows from the usage API", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);

    const fetchSpy = mockUsageResponse({
      usage: {
        rolling: { status: "ok", percent: 0, resetsAt: "2026-09-27T16:49:34.989Z" },
        weekly: { status: "ok", percent: 40, resetsAt: "2026-09-28T00:00:00.000Z" },
        monthly: { status: "ok", percent: 20, resetsAt: "2026-10-26T18:21:46.000Z" },
      },
    });

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.rolling).toMatchObject({
      usagePercent: 0,
      percentRemaining: 100,
      resetTimeIso: "2026-09-27T16:49:34.989Z",
    });
    // 4h49m34.989s after the frozen clock, rounded to the nearest second
    expect(result.rolling?.resetInSec).toBe(17375);

    expect(result.weekly).toMatchObject({
      usagePercent: 40,
      percentRemaining: 60,
      resetInSec: 43200,
      resetTimeIso: "2026-09-28T00:00:00.000Z",
    });
    expect(result.monthly).toMatchObject({
      usagePercent: 20,
      percentRemaining: 80,
    });

    // Authenticates with a bearer token against the usage endpoint.
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://opencode.ai/zen/go/v1/usage");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer oc_sk_test",
    );
  });

  it("keeps partial responses instead of failing", async () => {
    mockUsageResponse({
      usage: { weekly: { status: "ok", percent: 12, resetsAt: "2026-09-28T00:00:00.000Z" } },
    });

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rolling).toBeUndefined();
    expect(result.monthly).toBeUndefined();
    expect(result.weekly?.usagePercent).toBe(12);
  });

  it("omits the reset time when the API sends an unusable resetsAt", async () => {
    mockUsageResponse({
      usage: { rolling: { status: "ok", percent: 5 } },
    });

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rolling?.usagePercent).toBe(5);
    expect(result.rolling?.resetInSec).toBe(0);
    // Epoch sentinel: consumers treat this as "no reset time" rather than "now".
    expect(new Date(result.rolling!.resetTimeIso).getTime()).toBe(0);
  });

  it("surfaces the HTTP status when the key is rejected", async () => {
    mockUsageResponse({ error: "unauthorized" }, 401);

    const result = await queryOpenCodeGoQuota("bad_key");

    expect(result).toMatchObject({ success: false });
    if (result.success) return;
    expect(result.error).toContain("401");
  });

  it("errors when the API returns no usable windows", async () => {
    mockUsageResponse({ usage: {} });

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result).toMatchObject({ success: false });
    if (result.success) return;
    expect(result.error).toContain("no usage windows");
  });

  it("errors when the body is not JSON", async () => {
    mockUsageResponse("<html>login page</html>", 200);

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result).toMatchObject({ success: false });
    if (result.success) return;
    expect(result.error).toContain("no usage windows");
  });

  it("ignores non-numeric percent values", async () => {
    mockUsageResponse({
      usage: {
        rolling: { status: "ok", percent: "unknown" },
        weekly: { status: "ok", percent: 40, resetsAt: "2026-09-28T00:00:00.000Z" },
      },
    });

    const result = await queryOpenCodeGoQuota("oc_sk_test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rolling).toBeUndefined();
    expect(result.weekly).toBeDefined();
  });
});
