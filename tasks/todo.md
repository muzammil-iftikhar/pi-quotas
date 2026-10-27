# OpenAI subscription quota footer

Approved scope: use the saved same-account Codex OAuth login for the footer when the active provider is OpenAI with stored OAuth credentials. Do not change model selection, authentication, quota commands, or OpenCode Go behavior. Account association is user-confirmed, not automatically verifiable from token-sharing credentials.

- [x] Add footer-only OpenAI OAuth → Codex quota routing with a ChatGPT/Codex label.
- [x] Test OAuth routing, API-key exclusion, missing credentials, and OpenCode Go switching (including in-flight responses).
- [x] Run tests, typecheck, lint, and review the diff.

## Review
All 147 tests passed (including six new routing/regression cases); typecheck, lint, and git diff --check passed. Read-only live Codex quota GET returned HTTP 200: 5h 11% used, 7d 2% used. OpenCode Go source/fetcher/formatting and model/auth configuration unchanged. Interactive rendering requires /reload; not directly observed in a running Pi UI. Documented same-account prerequisite in README.
