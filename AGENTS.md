# Instructions for AI assistants

This repository is a collaborative QA practice space using Playwright and TypeScript. Follow the contributor's requested scope and keep each change small and reviewable.

## Context before editing

- Read `README.md`, `CONTRIBUTING.md` and `docs/AI_WORKFLOW.md`.
- Use English for repository documentation, shared prompts, issues, pull requests and learning notes. Help contributors practice clear English; perfect grammar is not required.
- For coverage changes, consult `TEST_CASES.md` and the decisions in `STRATEGY.md`.
- Inspect the relevant spec and helpers before proposing code. Identify unresolved assumptions and distinguish historical evidence from current observations.
- For documentation tasks, edit only documentation. Do not change code, configuration, dependencies or lockfiles unless the request includes them.

## Suite conventions

- E2E tests use `test` and `expect` from `src/fixtures/test.ts`. Isolated unit tests can import from `@playwright/test`.
- Reuse `src/pages`, `src/components`, `src/flows`, `src/data` and `src/support`; add an abstraction only when the change needs it.
- Derive selectors from DOM evidence. Do not invent elements, endpoints or method signatures.
- Assert verifiable outcomes using the test's own data, rather than only element presence or changes in global counters.
- Preserve relevant assertions. Investigate failures before proposing sleeps, longer timeouts, additional retries or weaker expectations.

## Isolation and data

- Do not modify or delete other people's data or seed rooms 101, 102 and 103.
- Use existing factories and register created entities with `janitor`.
- For bookings, reuse `workerRoom` and `bookableStay`. Register the booking with its guest when cleanup must also remove the admin notification.
- Do not publish `.env`, tokens, cookies or private credentials. Inspect evidence and redact sensitive content before sharing artifacts.
- Propose explorations that affect global state or generate load in an issue, and use your own deployment to run them.

## Validation and delivery

- Documentation: verify links, paths, scripts and examples against real files. Do not run the full E2E suite for a text change.
- TypeScript and tests: run `npm run typecheck`, `npx playwright test --grep @unit` and affected specs, initially with `--workers=1 --retries=0`.
- Shared changes: expand validation to affected groups as described in `CONTRIBUTING.md`.
- Update cases and the coverage map when the suite changes; preserve the dates of historical measurements.
- Report changed files, reasons, executed commands and actual results. Say when you did not run a check; never invent results or evidence.
