---
name: prd-pr-creation
description: Creates pull requests — handles Needs PR status.
user-invocable: false
---

# Creating PRs for the PRD system

## Overview

Creates a PR with implementation changes and transitions the ticket to Needs PR Maintenance.

## When to use this skill

- The ticket has status "Needs PR"

## Steps

### Step 0: Check for existing PR (re-entry)

`prd-system_getTicket` — if the ticket already has a `prUrl`, this is a re-entry (e.g., after a previous maintenance cycle). Skip to Step 4.

### Step 1: Determine branches

From ticket: `featureBranch` (source), `targetBranch` (destination).

### Step 2: Build PR body

- **Things to consider before merging:** Unresolved suggestions (`resolvedAt` not set), formatted as bullet list with source
- **Items resolved during implementation:** Resolved suggestions (`resolvedAt` set), formatted as bullet list with source
- **Plan deviations:** Deviations where `reviewResult.accepted === true` AND `qaResult.validated === true`, formatted as table

Omit any section that has no entries.

- **Evidence Collected:** If the ticket has evidence entries, add this section.
  Group by `source` (implementation, review, qa, security, pr_maintenance).
  For each evidence entry:
  - If `contentType` starts with `image/` or content >200 chars:
    `[Evidence: <description> — <filePath>]`
  - If content ≤200 chars and text-based: inline the content directly.
    Call `prd-system_getEvidence` with the entry's `evidenceId` to read its content.
  - Example output format:
    ```
    ### Evidence Collected

    **implementation:**
    - POST /comments returns 201 — evidence/repo__id/abc.json
    - Migration ran successfully — evidence/repo__id/def.txt

    **qa:**
    - Homepage renders correctly — evidence/repo__id/ghi.png
    ```
  Omit source sections that have no entries.
  Omit the entire section if the ticket has no evidence.

### Step 3: Create the PR

Dispatch an agent to run `gh pr create` with the feature branch, target branch, title, and body. If the branch already has a PR, use `gh pr update`.

### Step 4: Call submitPR

- If new PR: `submitPR(id, gitRepo, subtaskId?, prUrl)`
- If re-entry (ticket already has prUrl): `submitPR(id, gitRepo, subtaskId?)` — no prUrl needed

Both calls transition to Needs PR Maintenance.

### Escalation

If the PR cannot be created (branch not found, auth failure, etc.):
- Call `prd-system_escalate(id, gitRepo, subtaskId?)` → "Needs Human PR"
- Report the error and what command was attempted

## Quick Reference

| Step | Action | Key Decision |
|------|--------|-------------|
| 0 | Get ticket, check prUrl | Re-entry? Skip to Step 4 |
| 1 | Determine branches | featureBranch → targetBranch |
| 2 | Build PR body | Suggestions + Deviations + Evidence from ticket |
| 3 | Create PR | `gh pr create` or `gh pr update` |
| 4 | Call submitPR | New PR: with prUrl. Re-entry: without |

## Common Mistakes

- **Forgetting suggestions in PR body.** Unresolved suggestions must appear under "Things to consider before merging".
- **Including unvalidated deviations.** Only include deviations where BOTH review AND QA validated.
- **Not checking for re-entry.** If prUrl already exists, don't create a new PR — just reset to Needs PR Maintenance.
