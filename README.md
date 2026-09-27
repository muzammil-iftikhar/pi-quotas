# @latentminds/pi-quotas

Quota monitoring for Pi. Shows remaining usage and rate limits for Anthropic, OpenAI Codex, GitHub Copilot, OpenRouter, Synthetic, Grok, Z.ai, OpenCode Go, Kimi Code, and Ollama Cloud — directly in your Pi session.

> **This is a fork** of [latentminds-ai/pi-quotas](https://github.com/latentminds-ai/pi-quotas).
> Follow the original repo for all the details — provider coverage, credential setup, and upstream
> release notes.

## What's different in this fork

- **OpenCode Go reads the usage API** (`https://opencode.ai/zen/go/v1/usage`) using the API key Pi
  already stores, instead of scraping the dashboard with a workspace id and session cookie. No
  `OPENCODE_GO_WORKSPACE_ID` / `OPENCODE_GO_AUTH_COOKIE` or config file needed.
- **Window labels are `5h` / `7d` / `30d`** — no `rolling` prefix, no spelled-out `Weekly`/`Monthly`.
  Compound labels (`Monthly Budget`, `Credits / week`, `Web / month`) are unchanged.
- **Removed the token-status footer widget** (local spend measured against guessed Go tier limits)
  and **quota warning notifications**, plus the `tokenStatus` / `quotaWarnings` settings. `/tokens`
  still works.
- **Footer reset time** renders `(↺ in 2h 19m)` instead of `(↺in 2h 19m)`.

Install this fork with `pi install git:github.com/muzammil-iftikhar/pi-quotas`; the npm package
`@latentminds/pi-quotas` is upstream.

## License

[MIT](LICENSE) © Latent Minds Pty Ltd

## Acknowledgements

This project was inspired by [@aliou/pi-synthetic](https://www.npmjs.com/package/@aliou/pi-synthetic).
