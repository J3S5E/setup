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

Use the `Hand of the King` agent to recommend `qa` agents appropriate for QA on this ticket. QA agents should be selected based on the ticket's domain, tech stack, and testing requirements.

### Step 3: Dispatch Independent QA

Send each selected agent the ticket's current description, acceptance criteria, plan, tech notes, implementation checkout path, and any recorded deviations (with their review results). Do NOT include any previous QA notes, review comments, or prior cycle data — agents must evaluate the current implementation as-is, fresh. Ask them to explore the repo and evaluate:

- Does the implementation meet every acceptance criterion? Test each one explicitly.
- Do all existing tests pass?
- Are there untested edge cases or failure modes?
- Does the implementation handle error conditions gracefully?
- Are there any integration or regression concerns?
- Is the test coverage adequate for the changes?
- **For each recorded deviation:** has it been implemented safely? Does it cause any regressions? Validate or flag each one.
- **What out-of-scope observations did you find?** (pre-existing bugs, tech debt, unrelated issues — note these separately from pass/fail findings)

Tell agents to report back on all of these points, even if they think some are not relevant.

### Step 3b: Record Deviation Validations and Suggestions

After collecting independent QA reports:

**Deviations:** For each recorded deviation on the ticket, check the agents' verdicts. If agents disagree on whether a deviation is safe, dispatch an additional agent as a tiebreaker. Call `prd-system_qaDeviation` for each deviation with the majority verdict. If any deviation is flagged, record it as a QA issue — flagged deviations mean the implementer must address them.

**Suggestions:** For each unique out-of-scope observation reported by QA agents, first filter: **"Does this observation mean the implementation fails to meet acceptance criteria or should it block the ticket from proceeding?"** If yes → it belongs in QA notes (which determine pass/fail), not in suggestions. If no → it is a purely informational, out-of-scope observation — call `prd-system_addSuggestion` with source="qa" (include `subtaskId` if this is a subtask). These accumulate and are surfaced in the PR description.

### Step 4: Consolidate QA Results

Collect all QA agent reports. Determine if the implementation passes QA:
- All agents confirm all acceptance criteria are met and no deviations were flagged → Pass
- Any agent reports unmet criteria, critical issues, or a flagged deviation → Fail

### Step 4b: Collect QA Evidence

For each passing acceptance criterion, collect evidence where practical:
- Use browser tools for screenshots of working features
- Use CLI for API response evidence (curl output)
- Use test runner output for passing test evidence
- Use file contents for migration or build output

Call `prd-system_addEvidence` with `source="qa"` for each piece.

Evidence will be formatted in the PR body per the PR creation skill's
formatting rules. See `prd-pr-creation/SKILL.md` Step 2 for details.

Optional but recommended — skip if evidence collection would be
disproportionate to the ticket's scope.

### Step 5: Act on Results

If QA passed:
- Call `prd-system_completeQA` with `passed: true` — this marks the ticket as **"Needs PR"** (for parent tickets or subtasks with `subtasksNeedPrs=true`) or **"Needs Git Merge"** (for subtasks with `subtasksNeedPrs=false`)

If QA failed:
- Call `prd-system_completeQA` with `passed: false` and consolidated QA notes (including any flagged deviations) to mark the ticket as "Needs Implementation Update"

### Step 6: Report

Report back that QA is complete and the ticket has been marked accordingly.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

### Escalation

If QA agents disagree on whether a critical issue exists, dispatch an additional agent as a tiebreaker. If consensus cannot be reached after 3 attempts, call `prd-system_escalate` to flag the ticket for human attention.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Select QA agents | Hand of the King recommends `qa` agents |
| 3 | Independent QA | Agents test against acceptance criteria + validate deviations |
| 3b | Record deviations & suggestions | `qaDeviation` per deviation; `addSuggestion` for out-of-scope findings |
| 4 | Consolidate results | All pass + no flagged deviations → proceed; Any fail → fail |
| 5a | Pass → | `completeQA(passed: true)` → "Needs PR" (parent/subtasksNeedPrs=true) or "Needs Git Merge" (subtasksNeedPrs=false) |
| 5b | Fail → | `completeQA(passed: false, notes)` → "Needs Implementation Update" |
| Escalate | 3 failed consensus attempts | `escalate` → [status-dependent] |

## Common Mistakes

- **Only running the happy path.** Test error states, edge cases, and boundary conditions too.
- **Skipping regression checks.** Verify that existing functionality still works after the changes.
- **Not testing the acceptance criteria explicitly.** Each criterion should be tested as a separate assertion.
- **Overlooking non-functional requirements.** Consider performance, security, and accessibility if relevant.
- **Mixing suggestions into QA notes.** If an out-of-scope observation means the implementation fails acceptance criteria, include it in QA notes (pass/fail). Only if it's purely informational and non-blocking should it be captured as a suggestion via `prd-system_addSuggestion` (include `subtaskId` if this is a subtask).
- **Skipping deviation validation.** If the ticket has deviations, QA must validate each one via `prd-system_qaDeviation`. A flagged deviation is a QA failure — don't let it slip through.
