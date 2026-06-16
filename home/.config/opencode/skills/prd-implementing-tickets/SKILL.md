---
name: prd-implementing-tickets
description: Use when a ticket is marked as "Needs Implementing" in the PRD system — dispatches agents to implement the ticket against acceptance criteria.
user-invocable: false
---

# Implementing Tickets for the PRD system

## Overview

Implementing a ticket transforms a planned ticket (with a stored plan, acceptance criteria, and tech notes) into actual code changes. This skill walks through understanding the plan, implementing against it, verifying the work, and marking implementation complete.

Subtasks are implemented first — each in its own feature branch — then merged into the parent ticket's feature branch before the parent implementation begins.

## When to use this skill

- You are the scrummaster or implementer
- The ticket you have has the status "Needs Implementing" or "Needs Implementation Update"

## Steps to follow when implementing tickets:

### If the ticket has subtasks: implement subtasks first

When implementing a parent ticket that has subtasks, the subtasks in non-terminal statuses must be implemented first. For each subtask that still needs work:

1. Get the subtask's details using `prd-system_getTicket(id, gitRepo)` — the subtasks' IDs, statuses, `featureBranch`, and `targetBranch` (parent's featureBranch) are visible in the parent's JSON
2. Implement the subtask using Steps 1-4 below, using its `featureBranch` for development
3. When calling lifecycle tools for a subtask, always pass both `id` (parent ticket ID) and `subtaskId` (subtask ID):
   - `prd-system_completeImplementation(id=parentId, gitRepo, subtaskId=subtaskId, branch=subtaskFeatureBranch)`
   - `prd-system_reviewImplementation(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
   - `prd-system_completeQA(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
   - `prd-system_completePR(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
   - `prd-system_finalizeTicket(id=parentId, gitRepo, subtaskId=subtaskId)`
4. The subtask's PR merges into its `targetBranch` (the parent's `featureBranch`), not into `main`
5. Once a subtask is finalized to "Done", its code is part of the parent's `featureBranch`

The scrum master will drive each subtask through its full lifecycle (review, QA, PR, finalize). Your job is to implement each subtask and call `completeImplementation` — the scrum master handles the rest.

After all subtasks are Done, proceed to implement the parent ticket below.

### Step 1: Review the Ticket and Plan

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Check the ticket's `featureBranch` and `worktreeDir` fields — these tell you where the implementation work happens and which branch to use.

If the ticket has `worktreeDir`, the preferred layout is `.worktrees\%BRANCH%` (with `/` replaced by `_` to avoid nesting). Check whether the project root contains an `init_worktree.sh` or `init-worktree.sh` script — if one exists, read it and follow its setup process for the worktree.

Dispatch 2 or more agents to independently report their understanding of:
- What needs to be built based on the acceptance criteria
- What the implementation plan says (ordered steps, files to modify/create)
- What tech notes or risks were identified during planning

If agents return with different interpretations, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 2 instead report back that you cannot proceed yet as the ticket has been escalated.

If agents return with aligned understanding, proceed to Step 2.

### Step 2: Implement the Ticket

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Include the findings from Step 1 as shared context.

The implementation should be done in the ticket's `featureBranch`. If this ticket had subtasks, its `featureBranch` already contains all subtask work merged in — build on top of it.

Use the `Hand of the King` agent to recommend 3 or more agents appropriate for implementing this ticket, then dispatch them to independently implement the ticket according to the plan. Each agent should:
- Follow the ordered steps in the plan
- Create or modify files as specified
- Write tests as described in the plan's testing approach
- Report back on what they implemented and any deviations from the plan
- **Do NOT fix anything outside the ticket's acceptance criteria.** If you find pre-existing bugs, deprecated APIs, tech debt, or refactoring opportunities, note them as out-of-scope observations in your report — do not fix them
- **If you intentionally skip or replace a planned step**, clearly state which plan item was deviated from and why

Collect their implementations. If agents propose different approaches, dispatch an additional agent as a tiebreaker to determine the best implementation.

#### After implementation: capture suggestions, deviations, and resolutions

After collecting agent reports and finalizing the implementation, process observations:

**Suggestions:** For each unique out-of-scope observation reported by agents, first filter: **"Does this observation block the implementation or affect whether the acceptance criteria can be met?"** If yes → it is not a suggestion — handle it through the normal flow (callback to the Scrum Master to address before proceeding). If no → it is a purely informational, out-of-scope observation — call `prd-system_addSuggestion` with source="implementation". These will be surfaced in the PR description as "Things to consider before merging".

**Resolved suggestions:** If an agent fixed an existing suggestion (one added earlier in planning), call `prd-system_resolveSuggestion` to mark it as resolved. Resolved suggestions appear under "Items resolved during implementation" in the PR description instead.

**Deviations:** For each intentional deviation from the plan, call `prd-system_addDeviation` to record it. This must include: which plan item was skipped or replaced, why, and what was done instead (if replaced). Deviations are evaluated during Review — if the reviewer rejects a deviation, it must be addressed before proceeding.

### Step 3: Verify Against Acceptance Criteria

Get the latest ticket information using `prd-system_getTicket`.

Use the `Hand of the King` agent to recommend 2 or more agents appropriate for verifying this implementation, then dispatch them with the chosen implementation, the full ticket details, and any recorded deviations. Ask them to verify:
- Does the implementation meet all acceptance criteria?
- Do all tests pass?
- Are there any edge cases not handled?
- Are there any regressions introduced?
- Are recorded deviations safe and justified? (check each one)

If the implementation does not meet all acceptance criteria, dispatch additional agents to fix specific gaps. Repeat until all criteria are met.

### Step 4: Mark Implementation Complete

Once all verification passes, call `prd-system_completeImplementation` with the ticket's `featureBranch` as the branch name to mark the ticket as "Needs Review".

The ticket's `featureBranch` will later be merged into its `targetBranch` (e.g., `main` for parent tickets, or the parent's `featureBranch` for subtasks) during the PR stage.

Report back that the implementation is complete and the ticket is ready for review.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| Subtasks first | Implement each subtask in its own branch, merge into parent's featureBranch | All subtasks merged → proceed to parent |
| 1 | Review ticket and plan | Check featureBranch/worktreeDir; align understanding |
| 2 | Implement the ticket | Hand of the King recommends 3+ agents; produce implementations |
| 3 | Verify against acceptance criteria | Hand of the King recommends 2+ agents; verify all pass |
| 4 | Mark complete | `completeImplementation` → "Needs Review" |

## Common Mistakes

- **Skipping subtask order.** If the ticket has subtasks, they must be implemented and merged first. The parent builds on subtask work.
- **Merging subtask branches into the wrong target.** A subtask's `targetBranch` is the parent's `featureBranch`, not `main`. The parent ticket's `targetBranch` is `main` (or the project's main integration branch).
- **Missing the ticket's workspace info.** Always check `featureBranch` and `worktreeDir` on the ticket before starting implementation.
- **Skipping Step 1 understanding.** Jumping straight into implementation without confirming plan understanding leads to wasted work. Always align first.
- **Over-engineering (scope creep).** Stick to the plan and acceptance criteria. Resist the urge to add extra features or refactor unrelated code. If you find something worth fixing outside scope but it's purely informational and non-blocking, capture it as a suggestion via `prd-system_addSuggestion` instead. If it blocks the implementation, raise it through the normal flow — do not use suggestions as a workaround for blockers.
- **Not writing tests.** The plan specifies a testing approach — follow it. Untested changes cannot be verified.
- **Not reporting deviations.** If the plan needs to change during implementation, call `prd-system_addDeviation` to record it. Silent divergence from the plan causes rework later.
- **Fixing out-of-scope issues inline.** Fixing pre-existing bugs or refactoring unrelated code bloats the ticket and delays the PR. If the observation is non-blocking, capture it as a suggestion, not an implementation change. If it's blocking, raise it — don't silently fix it.
