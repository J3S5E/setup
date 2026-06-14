---
name: prd-reviewing-implementation
description: Use when a ticket is marked as "Needs Review" in the PRD system — reviews implementation against acceptance criteria before QA.
user-invocable: false
---

# Reviewing Implementation for the PRD system

## Overview

Reviewing an implementation validates that the code changes satisfy the ticket's acceptance criteria, follow the plan, and meet quality standards. This skill dispatches multiple independent reviewers, consolidates feedback, and determines pass or fail.

## When to use this skill

- You are the scrummaster or reviewer
- The ticket you have has the status "Needs Review"

## Steps to follow when reviewing implementation:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket` to pass to the agents in later steps.

### Step 2: Select Reviewers

Use the `Hand of the King` agent to recommend 5 or more agents appropriate for reviewing this ticket's implementation. The agents should be selected based on the ticket's domain, tech stack, and the nature of the implementation.

### Step 3: Dispatch Independent Reviews

Send each selected agent the ticket's current description, acceptance criteria, plan, tech notes, and the implementation branch/checkout path only. Do NOT include any previous reviewComments, qaNotes, or prior cycle data — agents must evaluate the implementation as-is, fresh. Ask them to explore the repo to evaluate:

- Does the implementation meet all acceptance criteria?
- Is the code well-structured and maintainable?
- Are there any bugs, edge cases, or regressions?
- Are tests adequate and passing?
- Does the implementation follow the plan? If not, are deviations justified?
- Are there any security, performance, or accessibility concerns?

Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 4: Consolidate Feedback

Collect all agent feedback and identify potential issues. Deduplicate and group related findings into a set of review comments.

### Step 5: Validate Issues

Dispatch 3 or more agents with the full ticket details and the consolidated list of potential issues. Ask them to explore the repo to determine which issues are genuinely valid and require changes.

If agents disagree on whether an issue is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the issue should be acted on.

Only issues confirmed as valid by the majority should be included in the final review comments.

### Step 6: Act on Feedback

If no valid issues were found:
- Call `prd-system_reviewImplementation` with `passed: true` to mark the ticket as "Needs QA"

If valid issues were found:
- Call `prd-system_reviewImplementation` with `passed: false` and the consolidated review comments to mark the ticket as "Needs Implementation Update"

### Step 7: Report

Report back that the implementation review is complete and the ticket has been marked accordingly.

### Escalation

If you reached Step 5 three times and agents are still unable to reach consensus on whether issues are valid, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed further — report that the ticket has been escalated.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select reviewers | Hand of the King recommends 5+ agents |
| 3 | Independent review | Agents explore repo and evaluate implementation |
| 4 | Consolidate | Aggregate and deduplicate findings |
| 5 | Validate issues | 3+ agents confirm validity; tiebreaker if split |
| 6a | No issues → | `reviewImplementation(passed: true)` → "Needs QA" |
| 6b | Valid issues → | `reviewImplementation(passed: false, comments)` → "Needs Implementation Update" |
| Escalate | 3 failed validation cycles | `escalate` → "Needs Human Clarification" |

## Common Mistakes

- **Skipping validation.** Not all review feedback is accurate. Always dispatch agents to verify issues against the repo before recording them.
- **Too few reviewers.** 5+ reviewers reduces the chance of blind spots.
- **Sharing review outcomes between agents during Step 3.** Each reviewer should explore independently — you want divergent perspectives, not groupthink.
- **Focusing on style over substance.** Prioritize correctness, completeness, and security over personal code style preferences.
- **Not checking tests.** If tests are missing or failing, that's a review finding even if the implementation looks correct.
