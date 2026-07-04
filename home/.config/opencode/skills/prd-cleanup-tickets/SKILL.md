---
name: prd-cleanup-tickets
description: Use when a ticket is marked as "Needs Cleanup" in the PRD system — removes stale git worktrees and feature branches after ticket completion.
user-invocable: false
---

# Cleaning Up Worktrees for the PRD system

## Overview

When a ticket reaches "Needs Cleanup", its implementation is complete — the PR is merged, review and QA passed. This skill removes the stale git worktree and local feature branch, then marks the ticket as Done.

## When to use this skill

- You are the scrummaster
- The ticket you have has the status "Needs Cleanup"

## Steps

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Pay attention to `worktreeDir` and `featureBranch` — these tell you what needs to be cleaned up.

### Step 2: Check If Cleanup Is Needed

If `worktreeDir` is empty or not set, no worktree was ever created for this ticket. Skip to Step 4.

If `worktreeDir` is set but the directory does not exist on disk, skip to Step 4.

Otherwise proceed to Step 3.

### Step 3: Clean Up Worktree and Branch

Dispatch a single agent with the `worktreeDir` and `featureBranch` from the ticket. The agent should:

1. Check `git status` inside the worktree directory
2. If clean:
   - Run `git worktree remove <worktreeDir>`
   - If worktree removal succeeds, run `git branch -D <featureBranch>`
3. If dirty (uncommitted changes exist):
   - Inspect each changed file to determine if the changes are safe to discard
   - **Safe to discard**: temp files, notes, generated artifacts, scratch work
   - **Not safe to discard**: code changes, implementation work, any file that looks intentional
   - If all changes are safe to discard, discard them (e.g., `git checkout`), then remove worktree and branch
   - If any change is not safe to discard, escalate by calling `prd-system_escalate` with the ticket ID and report back what was found
   - Do NOT use `git worktree remove -f` — never force-remove a dirty worktree

If the worktree directory or branch doesn't exist, note it and proceed — partial cleanup is fine.

### Step 4: Mark Cleanup Complete

Call `prd-system_completeCleanup` to mark the ticket as Done.

Report back that cleanup is complete and the ticket is now marked as Done.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — focus on `worktreeDir`, `featureBranch` |
| 2 | Check if cleanup needed | Empty worktreeDir or missing dir → skip to Step 4 |
| 3 | Clean up | `git status` → clean? remove + delete. Dirty? inspect, discard safe, escalate meaningful |
| 4 | Mark complete | `completeCleanup` → "Done" |

## Common Mistakes

- **Force-removing a dirty worktree.** Never use `-f`. If uncommitted changes exist, evaluate them. Escalate if they're meaningful — don't destroy work.
- **Deleting remote branches.** Only delete the local branch. Remote cleanup is not part of this stage.
- **Skipping the git status check.** Always check before removing. A stale worktree could contain work you don't want to lose.
- **Not checking if the directory exists.** A ticket may have `worktreeDir` set but the directory was already manually removed.
