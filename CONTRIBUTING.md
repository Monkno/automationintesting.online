# Contributing

Thank you for bringing your QA perspective. You can contribute documentation, manual exploration, test cases, automation or pull request reviews. You do not need to master AI or Playwright to make a useful contribution.

Use English for documentation, issues, pull requests, prompts and shared learning notes. Practicing QA communication in English is part of this project. Simple wording is enough, and questions are welcome. Be patient with beginners and discuss decisions using examples and evidence. When reviewing, explain the reason for a suggestion so the author can learn from it.

## Choose a first contribution

| To practice | A small contribution | What to provide |
| --- | --- | --- |
| Setup and Git | Follow the README from a clean clone | A corrected step or an issue with the blocker and environment |
| Test design | Review a boundary in TC11 or TC17 | Data, preconditions and expected outcome before automation |
| TypeScript | Understand a parser in `src/support/money.ts` | An explanation or a unit case that checks a new risk |
| Playwright | Review a navigation assertion in TC02 | The outcome it checks and the defect it would catch |
| Manual exploration | Test keyboard use or the mobile menu | Reproducible steps, expected and actual results, and evidence |
| AI for QA | Ask for a proposal about an existing case | Context, the assistant's proposal and your review |

Check the [open issues](https://github.com/Monkno/automationintesting.online/issues) before starting. If someone is already working on the topic, coordinate there. For a small documentation change, you can open a PR directly. For new dependencies, new layers or larger changes, open a proposal first so contributors can agree on scope.

## Prepare your branch

1. Fork the repository on GitHub and clone your fork.
2. Add this repository as `upstream` and create a branch from its `main`.
3. Follow the setup instructions in the [README](README.md).

```bash
git clone https://github.com/YOUR_USERNAME/automationintesting.online.git
cd automationintesting.online
git remote add upstream https://github.com/Monkno/automationintesting.online.git
git fetch upstream
git switch -c docs/first-contribution upstream/main
```

Replace `YOUR_USERNAME` with your actual username. Choose a branch name that describes your change, such as `test/contact-boundaries` or `docs/powershell-setup`.

## Make your contribution verifiable

- Focus on one behavior or problem per PR and explain why it deserves coverage.
- Connect the change to its `TCxx` case. For a new case, choose an unused identifier and update `TEST_CASES.md` and the README coverage map when needed.
- For E2E tests, import `test` and `expect` from `src/fixtures/test.ts`, adjusting the relative path. Unit tests that do not need these fixtures can use `@playwright/test`, as in `tests/unit/money.spec.ts`.
- Reuse existing pages, components, flows, factories and helpers. Assert on outcomes using your own test data and register cleanup with `janitor`.
- Get selectors from the observed DOM. Prefer roles, labels or test IDs when available; explain when the application requires a different selector.
- Investigate a failure before adding sleeps, increasing timeouts or weakening an assertion. The suite and the demo have different problems: identify which one your evidence reproduces.
- If you used AI, briefly describe its task and how you verified its proposal. [AI_WORKFLOW.md](docs/AI_WORKFLOW.md) includes a workflow and example prompts.

`STRATEGY.md` and `TEST_CASES.md` record behavior and defects observed on a specific date. If the application has changed, include current evidence and explain the difference between observed and expected behavior. Changing an expectation to get a green test requires that justification.

## Validate before opening a PR

For documentation changes, check links, paths, command names and examples for both shells if you changed them. You do not need to run the entire E2E suite for a text correction.

For test or TypeScript changes:

```bash
npm run typecheck
npx playwright test --grep @unit
```

Also run the affected file. For example, for a contact contribution:

```bash
npx playwright test tests/contact/contact.spec.ts --workers=1 --retries=0 --trace=on
```

If the change affects shared fixtures, flows or helpers, run the groups that use them and a full run when appropriate. Record the command, environment, result and unresolved failures. If you could not run a check, explain why; do not mark it as passed.

Reports and traces help reviewers investigate failures. Share only relevant evidence and inspect it before publishing: it may contain cookies, tokens or personal data. Keep `.env`, private credentials and generated artifacts out of your commit.

## Open and review the pull request

```bash
git status --short
git diff --check
git add README.md
git commit -m "docs: clarify the first steps for QA contributors"
git push -u origin docs/first-contribution
```

The example stages only `README.md`; replace it with your contribution's files. Open a PR against `main` in `Monkno/automationintesting.online` and complete the template. Use a draft if you are still investigating or want an early review.

Include the problem, proposed change and validation performed. Link a related issue if one exists; use `Closes #NUMBER` only if the PR fully resolves it, replacing `NUMBER` with the actual issue number. For visual changes or demo defects, include evidence of the behavior.

A reviewer should be able to understand the risk your contribution covers, how to run it and what data it creates or deletes. Respond to feedback in the same PR and keep its description aligned with the final change.
