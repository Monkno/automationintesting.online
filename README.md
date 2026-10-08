# automationintesting.online

A collaborative project for practicing QA with AI, Playwright and TypeScript against [automationintesting.online](https://automationintesting.online), the Restful Booker Platform Bed & Breakfast demo.

Whether you work in manual QA and want to start automating, are learning TypeScript, or have experience to share, you can contribute here. Start by improving an instruction, proposing a test case or reviewing an assertion. We want to learn through small changes that other people can understand, run and discuss.

AI can help explore risks, explain code and propose tests. Each contribution needs QA judgment and evidence: what behavior it checks, why that matters and what happened when you ran it. Use your preferred assistant, or contribute without AI.

## Your first contribution

1. Follow the setup instructions and run the unit tests below.
2. Choose a case from [TEST_CASES.md](TEST_CASES.md) and find its implementation in `tests/`.
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) to prepare your change and open a pull request.
4. To practice with an assistant, try the examples in [AI_WORKFLOW.md](docs/AI_WORKFLOW.md).

Questions help too. If a step is unclear, [open an issue](https://github.com/Monkno/automationintesting.online/issues/new/choose) and explain where you got stuck. Use English for documentation, issues, pull requests and shared learning notes so contributors can practice QA communication in English. Simple English is welcome; you do not need perfect grammar to participate.

### Recommended QA Automation agents

You can also practice with [Monkno's](https://github.com/Monkno) QA Automation agents. To use them, [ask about access and setup](https://github.com/Monkno/automationintesting.online/issues/new/choose). Share the case you are working on and this repository's instructions with the agent, then verify its proposal yourself. These agents are optional; you can use another assistant or work without AI.

## Install and run

You need Git, Node.js and npm. The current `package-lock.json` requires at least Node.js 20 and npm 9. For a new setup, choose a Node version supported by the [current Playwright requirements](https://playwright.dev/docs/intro#system-requirements).

### Bash (Linux, macOS or Git Bash)

```bash
git clone https://github.com/Monkno/automationintesting.online.git
cd automationintesting.online
npm ci
npx playwright install --with-deps chromium
cp .env.example .env
npm run typecheck
npx playwright test --grep @unit
```

### Windows PowerShell

```powershell
git clone https://github.com/Monkno/automationintesting.online.git
Set-Location automationintesting.online
npm ci
npx playwright install chromium
Copy-Item .env.example .env
npm run typecheck
npx playwright test --grep '@unit'
```

To contribute, fork the repository first and replace the clone URL with your fork's URL. The `@unit` tests check the price parsers without opening a browser or accessing the site; they are a first local check. Installing Chromium prepares your environment for E2E tests.

For a small first E2E run:

```bash
npx playwright test tests/public/catalog.spec.ts --workers=1 --retries=0
```

To run the whole suite:

```bash
npm test
```

The full suite creates bookings, messages and rooms on a shared demo. Read the isolation rules below before running it or adding coverage.

### Configuration

Copying `.env.example` provides the public demo credentials. Fixtures that need an admin session fail if `ADMIN_USER` or `ADMIN_PASS` is missing. Git ignores `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `https://automationintesting.online` | System under test |
| `ADMIN_USER` | Required for admin fixtures | Admin panel username |
| `ADMIN_PASS` | Required for admin fixtures | Admin panel password |
| `WORKERS` | `4` | Suite parallelism |

In Bash:

```bash
WORKERS=1 npx playwright test --retries=0
BASE_URL=http://localhost:8080 npm test
```

In PowerShell:

```powershell
$env:WORKERS = '1'
npx playwright test --retries=0
Remove-Item Env:WORKERS

$env:BASE_URL = 'http://localhost:8080'
npm test
Remove-Item Env:BASE_URL
```

`BASE_URL` can target your own running deployment. This repository contains the test suite; it does not start the application. Exported environment variables take precedence over `.env`.

### Useful commands

| Command | What it runs |
| --- | --- |
| `npm test` | Whole suite |
| `npm run test:public` | Public catalogue and navigation |
| `npm run test:booking` | Availability, pricing and bookings |
| `npm run test:contact` | Contact form |
| `npm run test:admin` | Admin panel |
| `npx playwright test --grep @unit` | Price parsers, without a browser |
| `npx playwright test --list` | Test inventory, without executing tests |
| `npm run test:headed` | Tests with a visible browser |
| `npx playwright test --ui` | Playwright's interactive mode |
| `npm run report` | HTML report from the last run |
| `npm run typecheck` | Type checking with `tsc --noEmit` |

The current configuration uses Chromium, 4 workers and 1 local retry (2 when `CI` is set). To investigate a failure, run the affected file with `--workers=1 --retries=0 --trace=on`. A green run with retries can include a flaky test: inspect the report.

## Repository layout

```text
src/
  core/         BasePage and BaseComponent
  components/   Reusable navigation, room cards and price summary
  pages/        Each page's controls and checks
  flows/        Booking, contact and admin session sequences
  fixtures/     Test fixtures, sessions and janitor cleanup
  data/         Types and data factories using Faker
  support/      API client, dates, catalogue and price parsers
tests/
  public/       Catalogue and navigation
  booking/      Pricing and bookings
  contact/      Messages from the public site
  admin/        Authentication, rooms and inbox
  unit/         Price parsers
```

The baseline documents 28 cases and contains 37 executable tests. [TEST_CASES.md](TEST_CASES.md) describes the cases in detail; `npx playwright test --list` shows the current executable inventory.

| Cases | Implementation |
| --- | --- |
| TC01 to TC05 | `tests/public/catalog.spec.ts` |
| TC06 to TC08 | `tests/booking/pricing.spec.ts` |
| TC09 to TC14 | `tests/booking/reserve.spec.ts` |
| TC15 to TC18 | `tests/contact/contact.spec.ts` |
| TC19 to TC22 | `tests/admin/auth.spec.ts` |
| TC23 to TC26 | `tests/admin/rooms.spec.ts` |
| TC27 and TC28 | `tests/admin/inbox.spec.ts` |
| Price parsers | `tests/unit/money.spec.ts` |

TC09/TC14 and TC15/TC18 share one test per pair to check UI and API using the same data. [STRATEGY.md](STRATEGY.md) explains this decision, the layers, concurrency and observed defects. Its measurements date from September 3, 2026; they are historical evidence, not a guarantee of a current run's outcome.

## Protect the shared demo

- Modify or delete only data created by your test. Preserve seed rooms 101, 102 and 103 and other people's data.
- Reuse the factories and the suite's data identifiers. Register every entity you create with `janitor`; a booking can also create a notification in the admin inbox.
- Use `workerRoom` and `bookableStay` for bookings instead of fixed dates that may already be taken.
- Assert against your own data. Global counters can change while someone else uses the site.

Cleanup is best-effort, and the demo can reset during a run. Investigate a timeout or a 409 before treating it as a test defect. To explore concurrency, security or changes to global branding, propose the scope in an issue first and use your own deployment.

## Where the project can grow

These are proposals to discuss, based on the gaps in [STRATEGY.md](STRATEGY.md), rather than implemented features:

- Document your setup experience or clarify an existing case.
- Propose boundary cases for names, phone numbers, messages and date ranges.
- Explore keyboard use, labels and mobile navigation with reproducible steps.
- Analyze an intermittent failure using traces and isolation evidence.
- Propose Firefox and WebKit coverage, or a CI run, explaining the cost for the demo.
- Share an AI example: the context you provided, its suggestion and what you corrected after checking it.

Choose an improvement in [CONTRIBUTING.md](CONTRIBUTING.md) or [propose your own](https://github.com/Monkno/automationintesting.online/issues/new/choose). A small pull request with a clear explanation is a good place to start.
