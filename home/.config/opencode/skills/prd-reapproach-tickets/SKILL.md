---
name: prd-reapproach-tickets
description: Use when a ticket is marked as "Needs Reapproach" in the PRD system — cleans up rejected implementation and routes back to replanning.
user-invocable: false
---

## Reapproach

A ticket reaches this stage when its PR was rejected because the implementation approach was wrong. The `rejectionNotes` field on the ticket explains what went wrong and why. Your job is to clean up, then route back to replanning.

## Steps

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Pay close attention to `rejectionNotes` — these describe what was wrong with the approach and should inform the next plan.

### Step 2: Revert the Changes

The stale branch is still on the ticket (`branch` + `prUrl` fields). Create a revert commit on the branch that undoes the problematic changes. Do not rewrite history — a revert commit preserves what was tried and why.

If only part of the implementation was wrong, revert just those commits. If the entire approach was wrong, revert all changes on the branch.

### Step 3: Finalize Reapproach

Call `prd-system_finalizeReapproach` to move the ticket to "Needs Plan Updating". The next agent will create a revised plan informed by the rejectionNotes.

Report back that the reapproach is complete and the ticket is ready for replanning.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — focus on `rejectionNotes` |
| 2 | Revert changes | `git revert` on the stale branch — partial or full |
| 3 | Finalize | `finalizeReapproach` → "Needs Plan Updating" |
