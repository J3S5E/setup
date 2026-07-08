---
name: prd-processing-subtickets
description: Use when a ticket is marked as "Needs Subtickets Processed" in the PRD system — progresses each subtask through its full lifecycle (plan review, implementing, review, QA, PR, finalize) so the parent can move to Needs Implementing.
user-invocable: false
---

# Processing Subtickets for the PRD system

## Overview

When a parent ticket passes plan review but has subtasks, it enters "Needs Subtickets Processed" status. This skill progresses each subtask through its complete lifecycle — plan review, implementing, review, QA, PR, and finalize — one stage at a time. Once all subtasks are Done, the parent auto-transitions to "Needs Implementing".

## When to use this skill

- You are the scrummaster
- The ticket you have has the status "Needs Subtickets Processed"

## Steps to follow when processing subtickets:

### Step 1: Get the Ticket

Get the latest ticket information using `prd-system_getTicket`. Note the `subtasks` array — these are the tickets that need to be processed. Each subtask has its own `status`, `featureBranch`, `worktreeDir`, `targetBranch`, plan, and acceptance criteria.

### Step 2: Identify Pending Subtasks

Filter the subtasks to find ones not yet in a terminal status ("Done" or "Cancelled"). These are the subtasks that need processing.

For each pending subtask, determine its current status and what stage comes next.

### Step 3: Progress Each Subtask One Stage

For each pending subtask, advance it one stage at a time. Do not skip stages. For each subtask, call the appropriate PRD skill:

| Subtask Status | Skill to Use |
|---|---|
| "Needs Refinement" | `prd-refining-tickets` |
| "Needs Plan" | `prd-planning-tickets` |
| "Needs Plan Updating" | `prd-updating-plans` |
| "Ready Plan Review" | `prd-reviewing-plan` — runs plan review on the subtask. If it hits **"Needs Plan Updating"**, handle that first (via `prd-updating-plans`), then re-run plan review. Once the subtask reaches **"Needs Implementing"**, proceed. |
| "Needs Implementing" / "Needs Implementation Update" | `prd-implementing-tickets` — implements the subtask |
| "Needs Validation" | (auto — Ralph runs validation commands) |
| "Needs Review" | `prd-reviewing-implementation` — reviews the subtask implementation |
| "Needs Security Review" | `prd-security-review` — runs security analysis on the subtask |
| "Needs QA" | `prd-qa-tickets` — runs QA on the subtask |
| "Needs PR" | `prd-pr-creation` — creates the subtask's PR |
| "Needs PR Maintenance" | `prd-pr-maintenance` — validates CI/comments |
| "Needs Git Merge" | `prd-git-merge-tickets` — merges subtask branch into target directly |
| "Needs Finalizing" | `prd-finalizing-tickets` — finalizes the subtask, marking it Needs Cleanup |
| "Needs Cleanup" | `prd-cleanup-tickets` — cleans up worktree and branch, marks Done |
| "Blocked" | `prd-blocked-tickets` — check if blocker resolved |
| "Needs Reapproach" | `prd-reapproach-tickets` — revert and route back to replanning |

> **Note:** After `completeImplementation`, the ticket/subtask enters "Needs Validation", which is automatically handled by Ralph (running validation commands from `validation-commands.json`) before the ticket reaches "Needs Review".

**Important:** When calling lifecycle tools for a subtask, always pass both `id` (parent ticket ID) and `subtaskId` (subtask ID):
- `prd-system_completeImplementation(id=parentId, gitRepo, subtaskId=subtaskId, branch=subtaskFeatureBranch)`
- `prd-system_reviewImplementation(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
- `prd-system_completeSecurityReview(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
- `prd-system_completeQA(id=parentId, gitRepo, subtaskId=subtaskId, ...)`
- `prd-system_submitPR(id=parentId, gitRepo, subtaskId=subtaskId, prUrl=...)` (if PR path)
- `prd-system_completeGitMerge(id=parentId, gitRepo, subtaskId=subtaskId)` (if direct merge path)
- `prd-system_completePR(id=parentId, gitRepo, subtaskId=subtaskId)` (after merge confirmed)
- `prd-system_finalizeTicket(id=parentId, gitRepo, subtaskId=subtaskId)`
- `prd-system_addSuggestion(id=parentId, gitRepo, subtaskId=subtaskId, ...)` (out-of-scope observations)
- `prd-system_resolveSuggestion(id=parentId, gitRepo, subtaskId=subtaskId, ...)` (mark suggestions resolved)

The subtask's PR merges into its `targetBranch` (the parent's `featureBranch`), not into `main`.

### Step 4: Repeat Until All Subtasks Are Done

After progressing each subtask one stage, re-check the subtask statuses. Continue until all subtasks reach "Done" or "Cancelled".

Once all subtasks are Done, the parent auto-transitions to "Needs Implementing" (handled by `prd-system_finalizeTicket`). The parent ticket is then ready for the `prd-implementing-tickets` skill.

### Step 5: Report

Report back that subticket processing is complete and the parent ticket is ready for implementation.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

### Escalation

If any subtask is escalated to human attention (via `prd-system_escalate`) during processing, stop and report the issue. Do not attempt to resolve human escalations automatically.

If a subtask enters "Needs Plan Updating" or "Needs Implementation Update", handle the update stage, then continue the lifecycle from where it left off.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — note subtasks array |
| 2 | Identify pending subtasks | Filter by non-terminal status |
| 3 | Progress each subtask | Use the status→skill mapping table |
| 4 | Check all Done | Parent auto-transitions to "Needs Implementing" |
| 5 | Report | Confirm subtickets processed |

## Common Mistakes

- **Skipping stages.** Each subtask must go through the full lifecycle. Do not skip plan review even if the subtask plan was created alongside the parent plan.
- **Calling tools without subtaskId.** Always pass `subtaskId` when calling lifecycle tools on subtasks — otherwise the tools operate on the parent ticket.
- **Merging to the wrong branch.** A subtask's `targetBranch` is the parent's `featureBranch`, not `main`. Check before creating the PR.
- **Not handling update stages.** Subtasks may enter "Needs Plan Updating" or "Needs Implementation Update" during processing. Handle these stages before continuing the lifecycle.
- **Processing subtasks in parallel without checking dependencies.** Subtasks may have `dependencys` on each other. Check these before parallelizing.
