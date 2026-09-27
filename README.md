# @latentminds/pi-quotas

Quota monitoring for Pi. Shows remaining usage and rate limits for Anthropic, OpenAI Codex, GitHub Copilot, OpenRouter, Synthetic, Grok, Z.ai, OpenCode Go, Kimi Code, and Ollama Cloud — directly in your Pi session.

> **This is a fork.** The original project is
> [**latentminds-ai/pi-quotas**](https://github.com/latentminds-ai/pi-quotas) — follow it for all the
> details: provider coverage, credential setup, and upstream release history. Everything in this
> README describes upstream behaviour except where the section below says otherwise.
>
> The npm package `@latentminds/pi-quotas` is the **upstream** package, not this fork. To install
> this fork instead:
>
> ```bash
> pi install git:github.com/muzammil-iftikhar/pi-quotas
> ```

## What's different in this fork

Seven commits on top of upstream `cbbb388` (package version 0.5.0): **+296 / −752 lines** across 18
files. Everything else behaves as upstream.

### OpenCode Go reads the usage API instead of scraping the dashboard

Upstream scraped the SolidJS SSR payload from `https://opencode.ai/workspace/<id>/go`, which needed
two credentials Pi does not manage — a workspace id and an `auth` session cookie — supplied through
`OPENCODE_GO_WORKSPACE_ID` + `OPENCODE_GO_AUTH_COOKIE` or a config file at
`~/.config/opencode/opencode-quota/opencode-go.json`. When any of that was missing, expired, or the
dashboard markup changed, the footer showed only `usage unavailable`.

This fork calls a JSON endpoint instead:

```
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <opencode-go api key>

{"usage":{
  "rolling":{"status":"ok","percent":0, "resetsAt":"<iso>"},
  "weekly": {"status":"ok","percent":40,"resetsAt":"<iso>"},
  "monthly":{"status":"ok","percent":20,"resetsAt":"<iso>"}}}}
```

It authenticates with the provider API key Pi already stores in `~/.pi/agent/auth.json` for model
calls, so **no cookie, workspace id, or config file is required**. `src/providers/opencode-go-config.ts`
(127 lines) and the six scrape regexes are gone.

### Window labels are `5h` / `7d` / `30d`

Compact duration form, with no `rolling` prefix:

| Provider    | Upstream                          | This fork      |
| ----------- | --------------------------------- | -------------- |
| OpenCode Go | `5h Rolling`, `Weekly`, `Monthly` | `5h`, `7d`, `30d` |
| OpenRouter  | `Weekly`, `Monthly`               | `7d`, `30d`    |
| Kimi Code   | `Weekly`                          | `7d`           |

Compound labels are deliberately **unchanged**, because they name a different concept — and renaming
the budget one would give OpenRouter two `30d` windows: `Monthly Budget` (renders as `budget`),
`Credits / week` (Synthetic), `Web / month` (Z.ai), and Grok's `Week/Month (credits)`.

### Removed the token-status footer widget

Upstream added a second footer badge for `opencode-go*` models showing
`5h:$0.04 · wk:$0.07 · mo:$0.24` — your local session spend compared against hardcoded, guessed tier
limits (`GO_LIMITS = { rolling5h: 12, weekly: 30, monthly: 60 }`, commented "approximate, from
docs"). With the usage API reporting real utilisation that badge is redundant and contradictory: it
rendered `$0.04 spent` next to `100% left`.

`src/extensions/token-status/` and the `tokenStatus` setting are gone. The `/tokens` command still
works — it is a separate extension (`command-tokens`) that reads no configuration at all, despite
upstream's settings label claiming that toggle covered both.

### Removed quota warning notifications

`src/extensions/quota-warnings/` is gone, along with the `quotaWarnings` setting.

### Footer reset-time spacing

Renders `(↺ in 2h 19m)` instead of upstream's run-together `(↺in 2h 19m)`.

### Removed settings keys

`tokenStatus` and `quotaWarnings` no longer exist. An existing `quotas.json` containing them still
loads — the keys are simply ignored. The package loads 4 extensions instead of 6.

## Screenshots


| `/quotas` dashboard | Footer status |
| ------------------- | ------------- |
| Quotas dashboard    | Footer status |


## Install

**From npm** (recommended):

```bash
pi install npm:@latentminds/pi-quotas
```

**From source:**

```bash
git clone https://github.com/latentminds-ai/pi-quotas.git
pi install ./pi-quotas
```

**Try without installing:**

```bash
pi -e npm:@latentminds/pi-quotas
```

## Commands


| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `/quotas`            | Combined quota dashboard for all providers |
| `/anthropic:quotas`  | Anthropic quotas only                      |
| `/codex:quotas`      | OpenAI Codex quotas only                   |
| `/github:quotas`     | GitHub Copilot quotas only                 |
| `/openrouter:quotas` | OpenRouter quotas only                     |
| `/synthetic:quotas`  | Synthetic quotas only                      |
| `/grok:quotas`       | Grok quotas only                           |
| `/zai:quotas`        | Z.ai quotas only                           |
| `/opencode-go:quotas`| OpenCode Go quotas only                    |
| `/kimi:quotas`       | Kimi Code quotas only                      |
| `/ollama:quotas`     | Ollama Cloud quotas only                   |
| `/tokens`            | Cross-session token/cost usage            |
| `/quotas:settings`   | Toggle individual features on or off       |


## Features

### Quota dashboard

Run `/quotas` to open a bordered TUI view showing all providers side by side, with progress bars, used/remaining counts, and reset times. Press `r` to refresh, `q` or `Esc` to close.

The combined dashboard hides providers with no configured subscription, credentials that cannot report subscription usage, and successful responses with no quota windows. Provider-specific commands remain available and show detailed authentication or API errors for troubleshooting.

### Footer status widget

When your active model is from a supported provider, the Pi footer shows real-time quota headroom - updated every 60 seconds and on each turn. Colours shift from green → amber → red as usage climbs.

### Per-feature toggles

Use `/quotas:settings` to enable or disable:

- Combined `/quotas` command
- Per-provider commands (`/anthropic:quotas`, `/codex:quotas`, `/github:quotas`, `/openrouter:quotas`, `/synthetic:quotas`, `/grok:quotas`, `/zai:quotas`, `/opencode-go:quotas`, `/kimi:quotas`, `/ollama:quotas`)
- Footer status widget
- **Defer to Synthetic** — when both pi-quotas and [pi-synthetic](https://www.npmjs.com/package/@aliou/pi-synthetic) are loaded, pi-quotas hides its own Synthetic footer to avoid showing duplicate quota information. Enabled by default; disable if you prefer to see both footers.

Settings can be saved globally (`~/.pi/agent/extensions/quotas.json`) or per-project (`.pi/quotas.json`). Run `/reload` after changing command visibility.

## Supported providers


| Provider       | Windows                                                        | Details                                                                                             |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Anthropic      | 5h, 7d, per-model 7d, extra usage                              | Utilization percentages; optional overage budget in local currency                                  |
| OpenAI Codex   | 5h, 7d, credits, spend cap                                     | Rate-limit percentages; credit balance; spend-cap reached/OK                                        |
| GitHub Copilot | Premium/chat/completions per month                             | Remaining/entitlement counts with overage indicators                                                |
| OpenRouter     | Monthly budget, daily/7d/30d usage                             | USD spending tracking with cents precision; optional per-key budget limits; UTC-based period resets |
| Synthetic      | Subscription, search/hour, free tools, weekly tokens, 5h limit | Request counts and token budgets; five-hour rate limit; weekly token regen                          |
| Grok           | Weekly credits, per-product usage, on-demand spend              | SuperGrok credit usage from the xAI CLI billing endpoint                                             |
| Z.ai           | 5h, 7d, monthly web searches                                   | Token utilisation percentages (5h/7d windows); monthly web-search count limit                       |
| OpenCode Go    | 5h, 7d, 30d                                                   | Usage percentages and reset times from the OpenCode Go usage API; cross-session token/cost aggregation via the `/tokens` command |
| Kimi Code      | 5h, 7d                                                         | Coding Plan request allowances with reset times                                                     |
| Ollama Cloud   | 5h, 7d                                                         | Session (5h) and weekly (7d) usage fractions from the `/api/usage` endpoint                         |


## Credentials

pi-quotas reads existing Pi auth entries from `~/.pi/agent/auth.json`:

- `anthropic` — Anthropic OAuth token
- `openai-codex` — Codex access token (also reads `~/.codex/auth.json` for the account ID)
- `github-copilot` — GitHub Copilot OAuth token (falls back to `gh auth token` if needed)
- `openrouter` — OpenRouter API key (Bearer token)
- `synthetic` — Synthetic API key (set the `SYNTHETIC_API_KEY` environment variable)
- `xai` — Grok/xAI OAuth access token
- `zai` — Z.ai (Zhipu AI / GLM Coding Plan) API key
- `opencode-go` — OpenCode Go API key. Pi already stores this in `~/.pi/agent/auth.json` for model calls, so no extra setup is required. No dashboard cookie or workspace id is needed.
- `kimi-coding` — Kimi Code OAuth access token
- `ollama-cloud` — Ollama Cloud API key (also reads `OLLAMA_API_KEY` if set)

No additional setup is required - if Pi can use the provider, pi-quotas can check its quotas. For Synthetic, export `SYNTHETIC_API_KEY` in your shell or Pi environment.

## Requirements

- [Pi](https://github.com/mariozechner/pi) >= 0.61.0

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and recent changes.

## License

[MIT](LICENSE) © Latent Minds Pty Ltd

## Acknowledgements

This project was inspired by [@aliou/pi-synthetic](https://www.npmjs.com/package/@aliou/pi-synthetic).

