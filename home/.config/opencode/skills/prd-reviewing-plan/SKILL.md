---
name: prd-reviewing-plan
description: Use when a ticket is marked as "Ready Plan Review" in the PRD system — reviews implementation plans before development begins.
user-invocable: false
---

# Reviewing Plans for the PRD system

## Overview

Reviewing a plan validates that a stored implementation plan is sound, complete, and ready for development. The skill dispatches multiple independent agents to explore the repo and evaluate the plan against the ticket's requirements, then validates any issues before recording them.

## When to use this skill

- You are the scrummaster or reviewer
- The ticket you have has the status "Ready Plan Review"

## Steps to follow when reviewing plans:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket` to pass to the agents in later steps.

### Step 2: Select Reviewers

Use the `Hand of the King` agent to recommend `review` agents appropriate for reviewing this ticket's plan. The agents should be selected based on the ticket's domain, tech stack, and the nature of the implementation plan.

### Step 3: Dispatch Independent Reviews

Send each selected agent the ticket's current description, acceptance criteria, plan, tech notes, and dependencies only. Do NOT include any previous planIssues, review feedback, or prior cycle data - agents must evaluate the plan as-is, fresh. Ask them to explore the repo to evaluate:

- Is the plan complete? Does it cover all acceptance criteria?
- Are the implementation steps feasible and correctly ordered?
- Are the right files targeted for creation/modification?
- Are edge cases and risks adequately addressed?
- Is the testing approach sufficient?
- Are there any gaps, errors, or improvements needed?
- Is the testing approach sufficient?
- Are any steps too broad? Plans should limit each step to 1-3 files - a step touching 4+ files is a sign the step should be split.
- Does the plan restate ACs as steps? Plans should name the order, dependencies, and gotchas, not re-list details the ACs already define.
- Does the plan name constraints rather than fixes? Look for implementation specifics that belong in the AC-driven implementation phase.
- Are parallelizable steps explicitly marked as independent? Plans should call out work that can proceed in any order.
Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 4: Consolidate Feedback

Collect all agent feedback and identify potential issues. Deduplicate and group related findings.


### Step 5: Validate and Categorize Issues

Dispatch `validation` agents with the full ticket details and the consolidated list of potential issues. Ask them to explore the repo to determine which issues are genuinely valid and require changes to the plan. For each confirmed issue, agents must also classify it as **blocking** or **non-blocking**:

- **Blocking**: The issue would prevent correct or useful implementation — the plan cannot proceed without addressing it.
- **Non-blocking**: The issue is worth fixing but implementation could proceed without it.

If agents disagree on whether an issue is valid or on its classification, dispatch an additional agent as a tiebreaker. The majority verdict determines the outcome.


Additionally, all validators should flag plans that are unnecessarily verbose:
- Steps that restate ACs verbatim should be flagged as a non-blocking issue ("condense: AC restatement").
- A plan whose total steps have no parallelization markers when some clearly could run in parallel should be flagged as a non-blocking issue ("missing parallel markers").
- A step listing 4+ files should be flagged non-blocking ("step too broad, split into substeps").

Only issues confirmed as valid by the majority should proceed to the next step.

### Step 6: Act on Feedback

Call `prd-system_addPlanIssues` with both arrays — pass validated blocking issues and non-blocking issues separately. Both can be empty `[]`.

Then call `prd-system_finishPlanReview`. Its decision logic:

| Condition | Result |
|---|---|
| `blockingIssues` exist AND `planIteration > 6` | Escalates to "Needs Human Plan Review" |
| `blockingIssues` exist | → "Needs Plan Updating" |
| `planIteration > 3` | → "Needs Subtickets Processed" if ticket has subtasks, otherwise "Needs Implementing" (force through) |
| `planIssues` exist | → "Needs Plan Updating" |
| Otherwise | → "Needs Subtickets Processed" if ticket has subtasks, otherwise "Needs Implementing" |

### Step 7: Report

Report back that the plan review is complete and the ticket has been marked accordingly.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

### Escalation

If you reached Step 5 three times and agents are still unable to reach consensus on whether issues are valid, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed further — report that the ticket has been escalated.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select reviewers | Hand of the King recommends `review` agents |
| 3 | Independent review | Agents explore repo and evaluate plan |
| 4 | Consolidate | Aggregate and deduplicate findings |
| 5 | Validate & categorize | `validation` agents confirm validity + classify blocking vs non-blocking; tiebreaker if split |
| 6 | Act on feedback | `addPlanIssues(issues, blockingIssues)` + `finishPlanReview` (see decision table above) |
| Escalate | 3 failed validation cycles | `escalate` → "Needs Human Plan Review" |

## Common Mistakes

- **Skipping validation.** Not all review feedback is accurate. Always dispatch agents to verify issues against the repo before recording them.
- **Too few reviewers.** 5+ reviewers reduces the chance of blind spots. Don't cut corners.
- **Sharing review outcomes between agents during Step 3.** Each reviewer should explore independently — you want divergent perspectives, not groupthink.
- **Storing unvalidated issues.** Only call `addPlanIssues` after Step 5 confirms an issue is valid. Invalid issues waste the planner's time.
