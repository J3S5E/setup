---
name: prd-reviewing-implementation
description: Use when a ticket is marked as "Needs Review" in the PRD system — reviews implementation against acceptance criteria before QA.
user-invocable: false
---

# Reviewing Implementation for the PRD system

## Overview

Reviewing an implementation validates that the code changes satisfy the ticket's acceptance criteria, follow the plan, and meet quality standards. Tickets arrive at "Needs Review" after passing through the automated validation stage (Ralph runs validation commands from `validation-commands.json`), so the implementation should already have basic checks passing. This skill dispatches multiple independent reviewers, consolidates feedback, and determines pass or fail.

## When to use this skill

- You are the scrummaster or reviewer
- The ticket you have has the status "Needs Review"

## Steps to follow when reviewing implementation:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket` to pass to the agents in later steps.

### Step 2: Select Reviewers

Use the `Hand of the King` agent to recommend `review` agents appropriate for reviewing this ticket's implementation. The agents should be selected based on the ticket's domain, tech stack, and the nature of the implementation.

### Step 3: Dispatch Independent Reviews

Send each selected agent the ticket's current description, acceptance criteria, plan, tech notes, the implementation branch/checkout path, and any recorded deviations. Do NOT include any previous reviewComments, qaNotes, or prior cycle data — agents must evaluate the implementation as-is, fresh. Ask them to explore the repo to evaluate:

- Does the implementation meet all acceptance criteria?
- Is the code well-structured and maintainable?
- Are there any bugs, edge cases, or regressions?
- Are tests adequate and passing?
- Does the implementation follow the plan? If not, are deviations justified?
- Are there any security, performance, or accessibility concerns?
- **For each recorded deviation:** is it justified? Accept or reject each one and explain why
- **What out-of-scope observations did you find?** (pre-existing bugs, tech debt, unrelated issues — note these separately from pass/fail findings)

Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 3b: Record Deviation Reviews and Suggestions

After collecting independent review reports:

**Deviations:** For each recorded deviation on the ticket, check the agents' verdicts. If agents disagree on a deviation, dispatch an additional agent as a tiebreaker. Call `prd-system_reviewDeviation` for each deviation with the majority verdict. If any deviation is rejected, record it as a review issue — rejected deviations mean the implementer must address them.

If the ticket has deviations but none of the agents evaluated them (they were not dispatched with deviation context), dispatch a single agent specifically to review each deviation.

**Suggestions:** For each unique out-of-scope observation reported by agents, first filter: **"Does this observation affect whether the implementation meets acceptance criteria or should it block the ticket from proceeding?"** If yes → it belongs in review comments (which determine pass/fail), not in suggestions. If no → it is a purely informational, out-of-scope observation — call `prd-system_addSuggestion` with source="review" (include `subtaskId` if this is a subtask). These accumulate and are surfaced in the PR description. Do not include out-of-scope observations in review comments.

### Step 4: Consolidate Feedback

Collect all agent feedback and identify potential issues. Deduplicate and group related findings into a set of review comments. Include any rejected deviations as review issues.

### Step 5: Validate Issues

Dispatch `validation` agents with the full ticket details and the consolidated list of potential issues. Ask them to explore the repo to determine which issues are genuinely valid and require changes.

If agents disagree on whether an issue is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the issue should be acted on.

Only issues confirmed as valid by the majority should be included in the final review comments.

### Step 5b: Attach Evidence

If valid issues were found, attach evidence demonstrating each issue:
- Call `prd-system_addEvidence` with `source="review"` for each valid issue
- Use `screenshot` for UI bugs, `log_evidence` for error logs,
  `api_response` for broken API behavior, `test_output` for failing tests
- Reference evidence IDs in the review comments so the implementer can
  see exactly what was observed

If no valid issues were found, attach at least one piece of evidence
confirming the review was conducted (e.g., a screenshot confirming an
acceptance criterion is met, or test output showing all tests pass).
This provides auditability that a review actually happened.

### Step 6: Act on Feedback

If no valid issues were found and no deviations were rejected:
- Call `prd-system_reviewImplementation` with `passed: true` to mark the ticket as "Needs Security Review"

If valid issues were found or any deviation was rejected:
- Call `prd-system_reviewImplementation` with `passed: false` and the consolidated review comments (including rejected deviations) to mark the ticket as "Needs Implementation Update"

### Step 7: Report

Report back that the implementation review is complete and the ticket has been marked accordingly.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

### Escalation

If you reached Step 5 three times and agents are still unable to reach consensus on whether issues are valid, call `prd-system_escalate` to flag the ticket for human attention. Do not proceed further — report that the ticket has been escalated.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select reviewers | Hand of the King recommends `review` agents |
| 3 | Independent review | Agents evaluate implementation + deviations; flag out-of-scope observations |
| 3b | Record deviations & suggestions | `reviewDeviation` per deviation; `addSuggestion` for out-of-scope findings |
| 4 | Consolidate | Aggregate and deduplicate findings + rejected deviations |
| 5 | Validate issues | `validation` agents confirm validity; tiebreaker if split |
| 6a | No issues + all deviations accepted → | `reviewImplementation(passed: true)` → "Needs Security Review" |
| 6b | Valid issues or rejected deviation → | `reviewImplementation(passed: false, comments)` → "Needs Implementation Update" |
| Escalate | 3 failed validation cycles | `escalate` → [status-dependent] |

## Common Mistakes

- **Skipping validation.** Not all review feedback is accurate. Always dispatch agents to verify issues against the repo before recording them.
- **Too few reviewers.** 5+ reviewers reduces the chance of blind spots.
- **Sharing review outcomes between agents during Step 3.** Each reviewer should explore independently — you want divergent perspectives, not groupthink.
- **Focusing on style over substance.** Prioritize correctness, completeness, and security over personal code style preferences.
- **Not checking tests.** If tests are missing or failing, that's a review finding even if the implementation looks correct.
- **Mixing suggestions into review comments.** If an out-of-scope observation affects whether the implementation meets acceptance criteria, include it in review comments (pass/fail). Only if it's purely informational and non-blocking should it be captured as a suggestion via `prd-system_addSuggestion` (include `subtaskId` if this is a subtask).
- **Skipping deviation review.** If the ticket has deviations, they must be independently reviewed and recorded via `prd-system_reviewDeviation`. A rejected deviation is a review finding — don't let it slip through.
