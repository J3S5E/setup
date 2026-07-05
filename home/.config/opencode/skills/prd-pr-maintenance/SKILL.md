---
name: prd-pr-maintenance
description: Validates CI and PR comments after creation — handles Needs PR Maintenance status.
user-invocable: false
---

# PR Maintenance for the PRD system

## Overview

After a PR is created, validates that CI passes and PR comments are addressed. If all good, requests human merge. If issues found, flags for rework.

## When to use this skill

- The ticket has status "Needs PR Maintenance"

### Config check

Before proceeding, call `prd-system_getConfig` to get configured agent counts. Use the `alignment` count for the CI council and `validation` count for comment evaluation agents.

## Steps

### Step 0: Check if PR is already merged

`prd-system_getTicket` → read `prUrl`.
Then: `gh pr view <prUrl> --json merged,state`
If `merged === true`: call `completePR(id, gitRepo, subtaskId?)` immediately and stop.
This handles the case where a human merged the PR and returned the ticket to Needs PR Maintenance.

### Step 1: Get ticket details

`prd-system_getTicket` — read `prUrl` field.

### Step 2: Fetch CI results and comments

Dispatch agents to run:
- `gh pr view <prUrl> --json statusCheckRollup` — get CI check statuses
- `gh pr view <prUrl> --json comments,reviews` — get PR comments/reviews

### Step 2b: Collect PR Maintenance Evidence

Before routing based on findings, save CI and PR review output as evidence:
- CI check results → `prd-system_addEvidence` with `source="pr_maintenance"`,
  type `build_output`, and the CI status text
- If the PR has review comments, capture relevant ones as `log_evidence`

### Step 3: Evaluate CI

If any required CI check failed:
- Use Hand of the King to recommend 3+ agents as a CI council
- Each votes "implementation" (code fix) or "approach" (replan) based on failure severity
- Majority decides → `flagPrRework(id, gitRepo, subtaskId?, rejectionType, rejectionNotes)`
- Tiebreaker: dispatch 1 more agent

### Step 4: Evaluate PR comments

If CI passes:
- Dispatch validation agents to examine each PR comment against the codebase
- Only comments confirmed as valid by majority are actionable

### Step 5: Route based on findings

If valid actionable comments exist:
- Council votes severity → route to implementation or approach
- Call `flagPrRework(id, gitRepo, subtaskId?, rejectionType, rejectionNotes)`

If CI passes AND no valid comments:
- Collect CI results as string array
- Call `requestHumanMerge(id, gitRepo, subtaskId?, ciResults)` → Awaiting Human Merge

### Escalation

If council can't reach consensus after 3 rounds → `escalate(id, gitRepo, subtaskId?)` → Needs Human PR Maintenance.

## Quick Reference

| Step | Action | Key Decision |
|------|--------|-------------|
| 0 | Check if already merged | `gh pr view --json merged` → merged? → `completePR` |
| 1 | Get ticket | `getTicket` → read prUrl |
| 2 | Fetch CI + comments | `gh pr view --json statusCheckRollup,comments,reviews` + save as evidence |
| 2b | Collect evidence | `addEvidence` with source="pr_maintenance" |
| 3 | CI failed? | Council votes → `flagPrRework` |
| 4 | CI passed? Validate comments | Agents evaluate each comment |
| 5a | Comments found → | Council votes severity → `flagPrRework` |
| 5b | All clear → | `requestHumanMerge` → Awaiting Human Merge |
| Escalate | Council stuck → | `escalate` → Needs Human PR Maintenance |

## Common Mistakes

- **Calling requestHumanMerge when CI failed.** Always check CI results first.
- **Treating all comments as actionable.** Validate each against the codebase before acting.
- **Not handling the already-merged case.** Step 0 is critical for the human-merge re-entry path.
- **Rerunning full maintenance after re-entry.** If Step 0 detects merged, skip all validation.
