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

Use the `Hand of the King` agent to recommend 5 or more agents appropriate for reviewing this ticket's plan. The agents should be selected based on the ticket's domain, tech stack, and the nature of the implementation plan.

### Step 3: Dispatch Independent Reviews

Send each selected agent the full ticket details (description, acceptance criteria, plan, tech notes, dependencies) and ask them to explore the repo to evaluate:

- Is the plan complete? Does it cover all acceptance criteria?
- Are the implementation steps feasible and correctly ordered?
- Are the right files targeted for creation/modification?
- Are edge cases and risks adequately addressed?
- Is the testing approach sufficient?
- Are there any gaps, errors, or improvements needed?

Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 4: Consolidate Feedback

Collect all agent feedback and identify potential issues. Deduplicate and group related findings.

### Step 5: Validate Issues

Dispatch 3 or more agents with the full ticket details and the consolidated list of potential issues. Ask them to explore the repo to determine which issues are genuinely valid and require changes to the plan.

If agents disagree on whether an issue is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the issue should be acted on.

Only issues confirmed as valid by the majority should proceed to the next step.

### Step 6: Act on Feedback

If no valid issues were found:
- Call `prd-system_finishPlanReview` to mark the ticket as "Ready For Implementation"

If valid issues were found:
- Call `prd-system_addPlanIssues` to store the validated issues on the ticket
- Call `prd-system_finishPlanReview` to mark the ticket as "Needs Plan Updating"

### Step 7: Report

Report back that the plan review is complete and the ticket has been marked accordingly.

### Escalation

If you reached Step 5 three times and agents are still unable to reach consensus on whether issues are valid, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed further — report that the ticket has been escalated.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select reviewers | Hand of the King recommends 5+ agents |
| 3 | Independent review | Agents explore repo and evaluate plan |
| 4 | Consolidate | Aggregate and deduplicate findings |
| 5 | Validate issues | 3+ agents confirm validity; tiebreaker if split |
| 6a | No issues → | `finishPlanReview` → "Ready For Implementation" |
| 6b | Valid issues → | `addPlanIssues` + `finishPlanReview` → "Needs Plan Updating" |
| Escalate | 3 failed validation cycles | `escalate` → "Needs Human Plan Review" |

## Common Mistakes

- **Skipping validation.** Not all review feedback is accurate. Always dispatch agents to verify issues against the repo before recording them.
- **Too few reviewers.** 5+ reviewers reduces the chance of blind spots. Don't cut corners.
- **Sharing review outcomes between agents during Step 3.** Each reviewer should explore independently — you want divergent perspectives, not groupthink.
- **Storing unvalidated issues.** Only call `addPlanIssues` after Step 5 confirms an issue is valid. Invalid issues waste the planner's time.
