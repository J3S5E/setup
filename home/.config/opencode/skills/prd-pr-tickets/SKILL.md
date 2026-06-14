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

Dispatch 2 or more agents with the full ticket details (description, acceptance criteria, plan, implementation) and ask them to explore the repo and prepare:

- What branch was the implementation done on? (check from ticket or git history)
- What is the appropriate target branch for the PR?
- What should the PR title and description include?
- Are there any special instructions for reviewers?

Collect their findings and converge on a single PR plan.

### Step 3: Create the PR

If the implementation branch is known, dispatch an agent to create the PR using the appropriate git commands (e.g., `gh pr create`). The PR description should reference the ticket and include:
- Summary of changes
- Link to the ticket
- Any relevant notes for reviewers

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
