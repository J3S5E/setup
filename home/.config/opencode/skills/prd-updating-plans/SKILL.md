---
name: prd-updating-plans
description: Use when a ticket is marked as "Needs Plan Updating" in the PRD system — updates an existing implementation plan to address review feedback.
user-invocable: false
---

# Updating Plans for the PRD system

## Overview

Updating a plan addresses validated issues found during plan review. The ticket already has a stored plan and a set of planIssues — this skill walks through understanding the issues, fixing the plan, verifying the fixes, and sending the plan back for review.

## When to use this skill

- You are the scrummaster or planner
- The ticket you have has the status "Needs Plan Updating"

## Steps to follow when updating plans:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Pay close attention to the `planIssues` field — these are the validated issues that the plan update must address. If the ticket arrived here via reapproach, also review `rejectionNotes` — these describe what went wrong with the previous implementation and should inform the revised approach. Also review the current plan, acceptance criteria, tech notes, and dependencies.

### Step 2: Understand the Issues

Review each issue in `planIssues` against the stored plan to determine what needs to change. Use the `Hand of the King` agent to recommend an agent appropriate for understanding these plan issues, then dispatch them with the full ticket details and ask them to:
- Confirm they understand each issue
- Identify which parts of the plan need to change
- Flag any issues that seem unclear or redundant
- Issues are valid

If agents disagree on what needs to change, dispatch an additional agent as a tiebreaker. The majority determines the scope of changes needed.

If issues are unclear or contradictory, mark the ticket using `prd-system_escalate` — do not proceed to Step 3.

### Step 3: Fix the Plan

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step.
If all issues were marked as invalid in the previous step we need to update the plan with more information so it passes review

Use the `Hand of the King` agent to recommend agents appropriate for creating plan updates. Use the Scrum Master's judgment on how many to dispatch — default to 1 agent, increase for complex changes. Provide them with:
- The full ticket details (description, acceptance criteria, current plan, planIssues, tech notes, dependencies)
- The findings from Step 2

Each agent should explore the repo and produce an updated free-form markdown plan that addresses **every issue** in `planIssues`. The plan should follow the same structure as before: ordered steps, files to create/modify, dependencies, testing approach, and any risks or concerns.

**Important constraints:** The updated plan must be a clean, standalone document — do not include any issue-tracking tables, status indicators (like ✅ / ❌ / Resolved), or any reference to `planIssues`. It should be indistinguishable in structure from the original plan, just updated to resolve every issue. Agents must **report their updated plan as text in their response only** — they must not write any files or create any documents on disk. Storage happens in Step 4 via `prd-system_savePlan`.

If agents propose different approaches, dispatch an additional agent as a tiebreaker and converge on a single updated plan.

### Step 4: Save the Updated Plan

Save the updated plan using `prd-system_savePlan` on the ticket.

If the ticket has subtasks, check each subtask's plan — if any need updating to address the planIssues, save updated plans for them too using `prd-system_savePlan` with `subtaskId`.

### Step 5: Verify the Fix

Get the latest ticket information using `prd-system_getTicket`. Then use the `Hand of the King` agent to recommend `validation` agents appropriate for verifying plan fixes, then dispatch them with:
- The full ticket details (including the updated plan)
- The original `planIssues` list

Ask each agent to explore the repo and verify **for each issue** whether the updated plan genuinely resolves it. Agents should report:
- Which issues are resolved
- Any issues that remain partially or fully unresolved
- Any new issues introduced by the plan changes

If all agents confirm all issues are resolved — proceed to Step 6.

If any agent reports unresolved issues, collect the feedback and dispatch a third agent as a tiebreaker. If the majority still finds unresolved issues, go back to Step 3 with the remaining issues clearly scoped.

If you reached Step 5 three times and issues remain unresolved, call `prd-system_escalate` to flag the ticket for human attention. Do not proceed to Step 6 — report that the ticket has been escalated.

### Step 6: Finalize

Once all issues are verified as resolved, finalize the ticket using `prd-system_finalizePlanning`. This will mark the ticket as "Ready Plan Review", sending it back for a fresh plan review.

Report back that the plan has been updated and the ticket is ready for re-review.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — focus on `planIssues` |
| 2 | Understand the issues | Single agent confirms scope of changes |
| 3 | Fix the plan | SM discretion (default 1 agent, increase for complex changes) |
| 4 | Save updated plan | `savePlan` on ticket + each subtask |
| 5 | Verify the fix | Dispatch `validation` agents; confirm all issues resolved |
| 6 | Finalize | `finalizePlanning` → "Ready Plan Review" |
| Escalate | 3 failed cycles | `escalate` → [status-dependent] |

## Common Mistakes

- **Skipping issue understanding.** Jumping straight to fixing without confirming what each issue means leads to partial fixes. Always run Step 2 first.
- **Only fixing the parent plan.** If subtasks have plans but the issues affect them too, update subtask plans as well in Step 4.
- **Skipping verification.** Always run Step 5 before finalizing. An incomplete fix wastes the reviewer's time.
- **Not re-getting the ticket before dispatching agents.** Always call `prd-system_getTicket` to get the latest state before dispatching agents in Steps 3 and 5, so they work with current data.
