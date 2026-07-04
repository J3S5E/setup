---
name: prd-git-merge-tickets
description: Merges a subtask branch into its target branch — handles Needs Git Merge status.
user-invocable: false
---

# Git Merge for Subtasks (PRD system)

## Overview

When a subtask completes QA and does not need a full PR (`subtasksNeedPrs=false`), it enters Needs Git Merge. This skill merges the subtask's feature branch into its target branch via git and marks the subtask as finalized.

## When to use this skill

- The ticket has status "Needs Git Merge"

## Steps

### Step 1: Get Ticket Details

`prd-system_getTicket(id, gitRepo)` — read the subtask's `featureBranch` and `targetBranch`.

### Step 2: Merge the Branch

Dispatch an agent to:
1. Checkout `targetBranch` (e.g., the parent's featureBranch)
2. Run `git pull` to get latest
3. Run `git merge <featureBranch>` — resolve any conflicts if they arise
4. Push the merge

### Step 3: Mark Complete

Call `prd-system_completeGitMerge(id=parentId, gitRepo, subtaskId=subtaskId)` → Needs Finalizing.

### Step 4: Report

Confirm the subtask is now at Needs Finalizing.

### Escalation

If the merge fails due to conflicts or the agent cannot resolve them:
- Call `prd-system_escalate(id=parentId, gitRepo, subtaskId=subtaskId)` → "Needs Human Git Merge"
- Report which files had conflicts and what was attempted

## Quick Reference

| Step | Action | Key Decision |
|------|--------|-------------|
| 1 | Get ticket | `getTicket` → featureBranch + targetBranch |
| 2 | Merge | Checkout target → merge feature → push |
| 3 | Complete | `completeGitMerge` → Needs Finalizing |

## Common Mistakes

- **Merging into the wrong branch.** Always check `targetBranch` — for subtasks, this is the parent's `featureBranch`, not `main`.
- **Pushing without pulling first.** Merge target branch's latest changes before merging in the feature branch.
- **Forgetting to push the merge.** The merge is local only until pushed.
