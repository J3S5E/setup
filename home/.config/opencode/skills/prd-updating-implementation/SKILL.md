---
name: prd-updating-implementation
description: Use when a ticket is marked as "Needs Implementation Update" in the PRD system — updates an existing implementation to address review or QA feedback.
user-invocable: false
---

# Updating Implementation for the PRD system

## Overview

Updating an implementation addresses issues found during code review or QA. The ticket has existing implementation work and a set of review comments or QA notes — this skill walks through understanding the issues, fixing them, verifying the fixes, and sending the work back for review.

## When to use this skill

- You are the scrummaster or implementer
- The ticket you have has the status "Needs Implementation Update"

## Steps to follow when updating implementation:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Pay close attention to the `reviewComments` or `qaNotes` fields — these contain the issues that the update must address. Also review the current plan, acceptance criteria, and implementation.

### Step 2: Understand the Issues

Use the `Hand of the King` agent to recommend an agent appropriate for understanding these review comments or QA notes, then dispatch them with the full ticket details and ask them to:
- Confirm they understand each review comment or QA note
- Identify which files or code areas need to change
- Flag any issues that seem unclear, redundant, or already addressed

If agents disagree on what needs to change, dispatch an additional agent as a tiebreaker. The majority determines the scope of changes needed.

If issues are unclear or contradictory, mark the ticket using `prd-system_escalate` — do not proceed to Step 3.

### Step 3: Fix the Implementation

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Use the `Hand of the King` agent to recommend agents appropriate for fixing these implementation issues. Use the Scrum Master's judgment on how many to dispatch — default to 1 agent, increase for complex fixes. Provide them with:
- The full ticket details (description, acceptance criteria, plan, current implementation)
- The review comments or QA notes from Step 1
- The findings from Step 2

Each agent should explore the repo and produce fixes that address every issue. Agents should report what they changed and why.

If agents propose different approaches, dispatch an additional agent as a tiebreaker and converge on a single set of fixes.

### Step 4: Verify the Fixes

Get the latest ticket information using `prd-system_getTicket`. Then use the `Hand of the King` agent to recommend `validation` agents appropriate for verifying implementation fixes, then dispatch them with:
- The full ticket details (including the updated implementation)
- The original review comments or QA notes

Ask each agent to explore the repo and verify for each issue whether the fix genuinely resolves it. Agents should report:
- Which issues are resolved
- Any issues that remain partially or fully unresolved
- Any new issues introduced by the changes

If all agents confirm all issues are resolved — proceed to Step 5.

If any agent reports unresolved issues, collect the feedback and dispatch a third agent as a tiebreaker. If the majority still finds unresolved issues, go back to Step 3 with the remaining issues clearly scoped.

If you reached Step 4 three times and issues remain unresolved, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 5 — report that the ticket has been escalated.

### Step 5: Mark Complete

Once all issues are verified as resolved, call `prd-system_completeImplementation` to mark the ticket as "Needs Review" for a fresh review.

Report back that the implementation has been updated and the ticket is ready for re-review.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — focus on reviewComments/qaNotes |
| 2 | Understand the issues | Single agent confirms scope of changes |
| 3 | Fix the implementation | SM discretion (default 1 agent, increase for complex fixes) |
| 4 | Verify the fixes | Dispatch `validation` agents; confirm all issues resolved |
| 5 | Mark complete | `completeImplementation` → "Needs Review" |
| Escalate | 3 failed cycles | `escalate` → "Needs Human Clarification" |

## Common Mistakes

- **Skipping issue understanding.** Jumping straight to fixing without confirming what each issue means leads to partial fixes. Always run Step 2 first.
- **Only fixing symptoms.** Address the root cause of each issue, not just the specific line mentioned in the comment.
- **Introducing new issues.** After fixing, verify you haven't broken existing functionality.
- **Skipping verification.** Always run Step 4 before finalizing. An incomplete fix wastes the reviewer's time.
- **Not re-getting the ticket before dispatching agents.** Always call `prd-system_getTicket` to get the latest state before dispatching agents.
