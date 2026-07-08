---
name: prd-finalizing-tickets
description: Use when a ticket is marked as "Needs Finalizing" in the PRD system — performs final validation and marks the ticket as Needs Cleanup.
user-invocable: false
---

# Finalizing Tickets for the PRD system

## Overview

Finalizing is the penultimate stage — after this, the ticket proceeds to cleanup before being marked Done. It performs a final sanity check that everything is complete — implementation, review, QA, and PR — before handing off to cleanup.

## When to use this skill

- You are the scrummaster
- The ticket you have has the status "Needs Finalizing"

## Steps to follow when finalizing tickets:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`.

### Step 2: Final Validation

Dispatch `validation` agents with the full ticket details to perform a final check:

- Does the ticket have a completed implementation?
- Was the implementation reviewed and passed?
- Was QA completed and passed?
- Was the PR created and merged? (For subtasks with no PR, verify the git merge was completed instead)
- Are all acceptance criteria met?
- Is there any unfinished work remaining?
- Check if evidence exists for implementation and QA stages. Note any
  gaps (e.g., "No QA evidence collected — ticket passed without evidence")
  in the report. **Do not block finalization** — evidence gaps are advisory
  only at this stage.

Agents should explore the repo to verify these points.

### Step 3: Act on Results

If all checks pass:
- Call `prd-system_finalizeTicket` to mark the ticket as "Needs Cleanup"

If there are outstanding issues:
- Report what needs to be resolved and do not finalize
- If issues are critical, use `prd-system_escalate` to flag the ticket for human attention

### Step 4: Report

Report back that the ticket has been finalized and is now marked as Needs Cleanup.

Do not process the ticket any further — cleanup will be handled by the next loop when the ticket is picked up in Needs Cleanup status.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Final validation | `validation` agents verify everything is complete |
| 3a | All good → | `finalizeTicket` → "Needs Cleanup" |
| 3b | Issues found → | Report; escalate if critical |
| 4 | Report | Confirm ticket is now marked as Needs Cleanup |

## Common Mistakes

- **Skipping validation.** Always verify the full lifecycle is complete before marking Done. A PR that wasn't merged means the work isn't finished.
- **Finalizing without checking the PR.** Ensure the PR was actually merged, not just created.
- **Not checking all subtasks.** If the ticket has subtasks, verify they are all completed too.
