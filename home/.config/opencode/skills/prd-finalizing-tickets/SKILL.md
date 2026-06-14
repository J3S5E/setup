---
name: prd-finalizing-tickets
description: Use when a ticket is marked as "Needs Finalizing" in the PRD system — performs final validation and marks the ticket as done.
user-invocable: false
---

# Finalizing Tickets for the PRD system

## Overview

Finalizing is the last stage before a ticket is marked Done. It performs a final sanity check that everything is complete — implementation, review, QA, and PR — before closing the ticket.

## When to use this skill

- You are the scrummaster
- The ticket you have has the status "Needs Finalizing"

## Steps to follow when finalizing tickets:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`.

### Step 2: Final Validation

Dispatch 2 or more agents with the full ticket details to perform a final check:

- Does the ticket have a completed implementation?
- Was the implementation reviewed and passed?
- Was QA completed and passed?
- Was the PR created and merged?
- Are all acceptance criteria met?
- Is there any unfinished work remaining?

Agents should explore the repo to verify these points.

### Step 3: Act on Results

If all checks pass:
- Call `prd-system_finalizeTicket` to mark the ticket as "Done"

If there are outstanding issues:
- Report what needs to be resolved and do not finalize
- If issues are critical, use `prd-system_escalate` to mark the ticket as "Needs Human Clarification"

### Step 4: Report

Report back that the ticket has been finalized and is now marked as Done.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Final validation | 2+ agents verify everything is complete |
| 3a | All good → | `finalizeTicket` → "Done" |
| 3b | Issues found → | Report; escalate if critical |
| 4 | Report | Confirm ticket is Done |

## Common Mistakes

- **Skipping validation.** Always verify the full lifecycle is complete before marking Done. A PR that wasn't merged means the work isn't finished.
- **Finalizing without checking the PR.** Ensure the PR was actually merged, not just created.
- **Not checking all subtasks.** If the ticket has subtasks, verify they are all completed too.
