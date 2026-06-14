---
name: prd-qa-tickets
description: Use when a ticket is marked as "Needs QA" in the PRD system — runs quality assurance against the implementation.
user-invocable: false
---

# QA for the PRD system

## Overview

QA validates that the implementation meets the ticket's acceptance criteria through systematic testing. This skill dispatches QA agents to run tests, verify behavior, and report results.

## When to use this skill

- You are the scrummaster or QA engineer
- The ticket you have has the status "Needs QA"

## Steps to follow when QAing tickets:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket` to pass to the agents in later steps.

### Step 2: Select QA Agents

Use the `Hand of the King` agent to recommend 3 or more agents appropriate for QA on this ticket. QA agents should be selected based on the ticket's domain, tech stack, and testing requirements.

### Step 3: Dispatch Independent QA

Send each selected agent the ticket's current description, acceptance criteria, plan, tech notes, and implementation checkout path only. Do NOT include any previous QA notes, review comments, or prior cycle data — agents must evaluate the current implementation as-is, fresh. Ask them to explore the repo and evaluate:

- Does the implementation meet every acceptance criterion? Test each one explicitly.
- Do all existing tests pass?
- Are there untested edge cases or failure modes?
- Does the implementation handle error conditions gracefully?
- Are there any integration or regression concerns?
- Is the test coverage adequate for the changes?

Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 4: Consolidate QA Results

Collect all QA agent reports. Determine if the implementation passes QA:
- All agents confirm all acceptance criteria are met → Pass
- Any agent reports unmet criteria or critical issues → Fail

### Step 5: Act on Results

If QA passed:
- Call `prd-system_completeQA` with `passed: true` to mark the ticket as "Needs PR"

If QA failed:
- Call `prd-system_completeQA` with `passed: false` and consolidated QA notes to mark the ticket as "Needs Implementation Update"

### Step 6: Report

Report back that QA is complete and the ticket has been marked accordingly.

### Escalation

If QA agents disagree on whether a critical issue exists, dispatch an additional agent as a tiebreaker. If consensus cannot be reached after 3 attempts, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select QA agents | Hand of the King recommends 3+ agents |
| 3 | Independent QA | Agents test against acceptance criteria |
| 4 | Consolidate results | All pass → proceed; Any fail → fail |
| 5a | Pass → | `completeQA(passed: true)` → "Needs PR" |
| 5b | Fail → | `completeQA(passed: false, notes)` → "Needs Implementation Update" |
| Escalate | 3 failed consensus attempts | `escalate` → "Needs Human Clarification" |

## Common Mistakes

- **Only running the happy path.** Test error states, edge cases, and boundary conditions too.
- **Skipping regression checks.** Verify that existing functionality still works after the changes.
- **Not testing the acceptance criteria explicitly.** Each criterion should be tested as a separate assertion.
- **Overlooking non-functional requirements.** Consider performance, security, and accessibility if relevant.
