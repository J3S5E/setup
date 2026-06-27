---
name: prd-blocked-tickets
description: Use when a ticket is marked as "Blocked" in the PRD system — checks whether the blocker is resolved and returns the ticket to its previous status.
user-invocable: false
---

## Blocked Ticket

A ticket reaches this stage when it was blocked by an external dependency. The `blockedReason` field explains what it's waiting on. Your job is to check if the blocker is resolved, rebase the branch if needed, and unblock.

## Steps

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Pay close attention to `blockedReason` — this describes the external dependency the ticket is waiting on. Also check `previousStatus` to know where the ticket was before being blocked.

### Step 2: Rebase from Target Branch

The ticket's branch will be stale from sitting idle, and the dependency it was waiting on may now be available. Fetch and rebase from `targetBranch`:

```
git fetch origin
git rebase origin/<targetBranch>
```

If the rebase succeeds cleanly — the blocker is likely resolved. Proceed to Step 3.

If the rebase fails because the dependency is still missing (or the branch can't compile without it) — report back that the ticket remains blocked and why. The next ralph loop will check again.

### Step 3: Verify the Blocker is Resolved

Run the relevant checks to confirm the external dependency described in `blockedReason` is now available (tests pass, builds succeed, dependency is present).

If confirmed — proceed to Step 4. If not — report back that the ticket remains blocked.

### Step 4: Unblock

Call `prd-system_unblockTicket` to restore the ticket to its `previousStatus`.

Report back that the ticket has been unblocked and its status restored.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` — focus on `blockedReason` + `previousStatus` |
| 2 | Check blocker | Resolved → proceed; Not resolved → report back |
| 3 | Rebase branch | `git rebase` or `git merge` from `targetBranch` |
| 4 | Unblock | `unblockTicket` → restores `previousStatus` |
