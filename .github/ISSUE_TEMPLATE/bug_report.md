---
name: Report a problem
about: A suite failure, setup blocker or behavior observed on the demo
title: ""
labels: ""
assignees: ""
---

## Where it happens

Write this issue in English; simple wording is welcome. Identify whether the problem is in setup, documentation, the suite or the demo. If you do not know yet, describe what you investigated. Link the related TCxx case or Dxx defect if one exists.

## How to reproduce it

Include preconditions, your own test data and the steps or exact command. State whether it reproduces with `--workers=1 --retries=0` when applicable.

## Expected and actual results

Explain what should happen, what supports that expectation and what actually happened.

## Environment and evidence

Provide the run date, operating system, Node version, Playwright version, browser and test environment. Include the relevant error or screenshot without `.env`, tokens, cookies or private data.

## Data and cleanup

If you created entities on the demo, identify them and describe how you cleaned them up. Do not delete other people's data to reproduce the problem.
