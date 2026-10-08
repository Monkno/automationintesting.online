# Practicing AI + Playwright + TypeScript

Use an assistant you have available to explain code, explore risks, propose cases or review a diff. This guide does not require a specific account, model, extension or integration, and does not configure any AI tool in the repository.

The aim is to explain and verify the contribution you submit. Include a summary of your AI use in the PR so others can learn from what worked and what you had to correct. Write shared prompts, documentation and learning notes in English to practice the project's working language.

## Using Monkno's QA Automation agents

One option for this practice is to use [Monkno's](https://github.com/Monkno) QA Automation agents. To learn about access and setup, [open a question in the repository](https://github.com/Monkno/automationintesting.online/issues/new/choose). This suite does not install them or require you to configure them.

When using them, share `AGENTS.md`, the `TCxx` case, its spec and relevant helpers. Ask for a focused review that explains risks and checks using evidence, and keep responsibility for changes and executions yourself. The prompts in this guide also work with these agents.

## A workflow for a small change

1. Choose a risk. Read the case in `TEST_CASES.md`, the relevant decision in `STRATEGY.md` and the spec that covers it. Write down what should happen and what defect a new test would catch.
2. Share focused context: relevant files, the goal, permitted scope and isolation rules. Leave out `.env`, tokens and private data.
3. Ask for a proposal before implementation. Check for duplication, assumptions about the application and data the test would need to create.
4. Compare the proposal with the observed DOM and API. Check method signatures in the repository and APIs in official documentation. Record any assumption that still needs evidence.
5. Implement a small change and review the diff. Check that it preserves the acceptance criteria and cleans up every entity it creates.
6. Run type checking, unit tests and the affected spec as described in `CONTRIBUTING.md`. If a test fails, analyze the error and trace before asking for another change.
7. Summarize in the PR what AI contributed, what you corrected and what you verified yourself.

## Prompts to adapt

These examples are starting points. Adjust the scope to your issue and share the files the assistant needs to read.

### Understand a case without editing files

```text
I want to understand TC11 in this repository. Read TEST_CASES.md,
tests/booking/reserve.spec.ts, src/data/factories.ts and src/fixtures/test.ts.
Explain which phone boundaries it covers, why the valid cases need a free
booking window, and how the booking and its notification are cleaned up.
Point to the files supporting your explanation. Do not edit any files.
```

### Design a contribution before automating it

```text
I want to propose a boundary case for the contact form.
Read TC15 to TC18 and tests/contact/contact.spec.ts.
Propose one case that does not duplicate existing coverage, with preconditions,
data, expected outcome and required evidence. Separate what the repository
confirms from what needs checking on the demo. Explain isolation and cleanup.
Do not implement it yet or invent selectors.
```

### Review an automation proposal

```text
Review this diff and the case context. Look for assertions that could pass
without checking the outcome, shared data, occupied dates, selectors without
evidence and entities that have not been registered with janitor.
Check that it reuses the existing fixtures and layers.
For each finding, identify the file, risk and a specific correction.
Do not edit code or claim you ran tests unless you actually ran them.
```

### Investigate a failure

```text
Here are the command I ran, the error and the evidence from the reviewed trace.
Read the spec and relevant helpers. Propose hypotheses and a check for each.
Consider date collisions, demo resets and changes made by other users.
Do not increase retries or timeouts, or remove assertions, to get a green result.
Do not conclude a cause without evidence.
```

## Review the AI response

- Does the case check a meaningful outcome and detect a specific defect?
- Do the selectors exist in the DOM, and do the methods have those signatures?
- Does the expected outcome have support from the case or a business rule, beyond the current behavior?
- Does the test use its own data and clean up bookings, rooms, messages and notifications it creates?
- Does the solution preserve assertions and use existing layers?
- Does the reported result match a real execution? A convincing assistant response is not a test report.

If the proposal reproduces a known demo bug, explain its relationship to the `Dxx` identifiers in `STRATEGY.md` and agree on how to represent it in the suite. Do not change an expectation just to accept a defect.

## What to share when contributing

You can use this outline in the AI section of the PR template:

```text
Task given to AI:
Context or files shared:
Suggestion I used:
Assumption or error I corrected:
Human validation (command and result, or documentation review):
```

A summary relevant to the change is enough. Sharing entire conversations or paying for a tool is not a requirement for contributing.

## References

- [Playwright installation and execution](https://playwright.dev/docs/intro).
- [Playwright best practices](https://playwright.dev/docs/best-practices).
- [TypeScript documentation](https://www.typescriptlang.org/docs/).
- [This repository's contribution guidelines](../CONTRIBUTING.md).
