---
name: prd-pr-tickets
description: Use when a ticket is marked as "Needs PR" in the PRD system — creates and completes pull requests for the implementation.
user-invocable: false
---

# Creating PRs for the PRD system

## Overview

The PR stage handles creating a pull request with the implementation changes, ensuring the PR is well-described, and completing the PR once merged. This skill walks through preparation, creation, and completion.

## When to use this skill

- You are the scrummaster or developer
- The ticket you have has the status "Needs PR"

## Steps to follow when creating PRs:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket` to pass to the agents in later steps.

### Step 2: Prepare the PR

Get the latest ticket information using `prd-system_getTicket`. The ticket will contain `suggestions` and `deviations` arrays — use these to inform the PR content.

Dispatch 2 or more agents with the full ticket details (description, acceptance criteria, plan, implementation, suggestions, and deviations) and ask them to explore the repo and prepare:

- What branch was the implementation done on? (check from ticket or git history)
- What is the appropriate target branch for the PR?
- What should the PR title and description include?
- Are there any special instructions for reviewers?

Collect their findings and converge on a single PR plan.

When building the PR description, include the following sections if applicable:

**Things to consider before merging:** List each unresolved suggestion (where `resolvedAt` is not set) with its source. These are out-of-scope observations captured during development that reviewers may want to address before merging.

**Items resolved during implementation:** List each resolved suggestion (where `resolvedAt` is set) and note that it was addressed during implementation.

**Plan deviations:** List each deviation that was accepted by review and validated by QA. Include the plan item, reason for deviation, and what was done instead. If a deviation was rejected, it would have been addressed already — it should not appear here.

### Step 3: Create the PR

If the implementation branch is known, dispatch an agent to create the PR using the appropriate git commands (e.g., `gh pr create`). The PR description should reference the ticket and include:
- Summary of changes
- Link to the ticket
- Any relevant notes for reviewers

Include the following sections in the PR body based on the ticket's `suggestions` and `deviations` arrays (retrieved via `prd-system_getTicket`):

**Unresolved suggestions** (where `resolvedAt` is not set):
```
## Things to consider before merging

These observations were made during development but are outside this ticket's scope:

- [from {source}] {message}
```

**Resolved suggestions** (where `resolvedAt` is set):
```
## Items resolved during implementation

The following out-of-scope observations were addressed during development:

- [from {source}] {message}
```

**Deviations** (where `reviewResult.accepted === true` and `qaResult.validated === true`):
```
## Plan deviations

The following items from the implementation plan were intentionally not done.
All deviations were reviewed and QA-validated.

| Plan item | Reason | What was done | Review | QA |
|---|---|---|---|---|
| {planItem} | {reason} | {replacement or "Omitted"} | ✅ Accepted | ✅ Validated |
```

If there are no suggestions or deviations, omit these sections entirely.

If the PR cannot be created automatically (e.g., branch not accessible), report back with the necessary details for manual creation.

### Step 4: Complete the PR

Once the PR has been merged, call `prd-system_completePR` with:
- `prUrl`: The URL of the pull request
- `prMerged`: Whether the PR was successfully merged

If the PR was merged, the ticket transitions to "Needs Finalizing".
If the PR was not merged (e.g., conflicts, rejected), the ticket transitions back to "Needs Implementation Update" for rework.

Report back that the PR stage is complete and the ticket has been updated accordingly.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Prepare the PR | 2+ agents determine branch, target, description |
| 3 | Create the PR | Use `gh pr create` or report for manual creation |
| 4a | PR merged → | `completePR(prUrl, merged: true)` → "Needs Finalizing" |
| 4b | PR not merged → | `completePR(prUrl, merged: false)` → "Needs Implementation Update" |

## Common Mistakes

- **Not linking the ticket in the PR.** The PR description should reference the ticket so reviewers have context.
- **Creating a PR without proper description.** A good PR description saves reviewer time and reduces review cycles.
- **Calling completePR before the PR is merged.** Wait for actual merge confirmation before marking as complete.
- **Not handling merge conflicts.** If the PR has conflicts, they need to be resolved before it can be merged.
- **Forgetting suggestions in the PR description.** The `suggestions` and `deviations` arrays on the ticket contain hard-won observations from planning, implementation, review, and QA. Include them in the PR body so reviewers have full context.
- **Including rejected or unvalidated deviations.** Only include deviations where `reviewResult.accepted === true` AND `qaResult.validated === true`. If a deviation doesn't have both stamps, it should have been addressed already — something went wrong in the lifecycle.
