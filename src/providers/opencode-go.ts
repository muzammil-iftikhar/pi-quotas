/**
 * OpenCode Go client.
 *
 * Reads usage from the OpenCode Go usage API, authenticated with the same
 * provider API key Pi already stores for model calls. No dashboard scraping,
 * session cookie, or workspace id is involved.
 *
 *   GET https://opencode.ai/zen/go/v1/usage
 *   Authorization: Bearer <opencode-go api key>
 *
 *   { "usage": {
 *       "rolling": { "status": "ok", "percent": 0,  "resetsAt": "<iso>" },
 *       "weekly":  { "status": "ok", "percent": 40, "resetsAt": "<iso>" },
 *       "monthly": { "status": "ok", "percent": 20, "resetsAt": "<iso>" } } }
 */

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const REQUEST_TIMEOUT_MS = 10_000;

const WINDOW_KEYS = ["rolling", "weekly", "monthly"] as const;

export interface OpenCodeGoWindow {
  usagePercent: number;
  resetInSec: number;
  percentRemaining: number;
  resetTimeIso: string;
}

export interface OpenCodeGoQuotaResult {
  success: true;
  rolling?: OpenCodeGoWindow;
  weekly?: OpenCodeGoWindow;
  monthly?: OpenCodeGoWindow;
}

export interface OpenCodeGoQuotaError {
  success: false;
  error: string;
}

export type OpenCodeGoResult = OpenCodeGoQuotaResult | OpenCodeGoQuotaError;

function parseWindow(raw: unknown, now: number): OpenCodeGoWindow | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const usagePercent = Number(record.percent);
  if (!Number.isFinite(usagePercent)) return undefined;

  // A window with no usable reset time still reports usage; fall back to the
  // epoch sentinel so consumers omit the reset tag rather than render "now".
  const resetMs =
    typeof record.resetsAt === "string" ? Date.parse(record.resetsAt) : NaN;
  const hasReset = Number.isFinite(resetMs);

  return {
    usagePercent: Math.max(0, usagePercent),
    resetInSec: hasReset ? Math.max(0, Math.round((resetMs - now) / 1000)) : 0,
    percentRemaining: 100 - Math.max(0, usagePercent),
    resetTimeIso: new Date(hasReset ? resetMs : 0).toISOString(),
  };
}

export async function queryOpenCodeGoQuota(
  apiKey: string,
  signal?: AbortSignal,
): Promise<OpenCodeGoResult> {
  const signals: AbortSignal[] = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (signal) signals.push(signal);
  const combined = AbortSignal.any(signals);

  try {
    const response = await fetch(USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: combined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: `OpenCode Go usage API error ${response.status}: ${text.slice(0, 120)}`,
      };
    }

    const data = (await response.json().catch(() => null)) as {
      usage?: Record<string, unknown>;
    } | null;

    const now = Date.now();
    const windows: { [K in (typeof WINDOW_KEYS)[number]]?: OpenCodeGoWindow } = {};
    for (const key of WINDOW_KEYS) {
      const parsed = parseWindow(data?.usage?.[key], now);
      if (parsed) windows[key] = parsed;
    }

    if (Object.keys(windows).length === 0) {
      return {
        success: false,
        error: "OpenCode Go usage API returned no usage windows",
      };
    }

    return { success: true, ...windows };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { success: false, error: "Request timed out" };
    }
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Request cancelled" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
