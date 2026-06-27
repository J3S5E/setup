---
name: prd-planning-tickets
description: Use when a ticket is marked as "Needs Plan" in the PRD system — creates implementation plans for refined tickets.
user-invocable: false
---

# Planning Tickets for the PRD system

## Overview

Planning a ticket transforms a refined ticket (with acceptance criteria, estimation, and tech notes) into a concrete implementation plan. This skill walks through understanding, research, plan creation, consolidation, review, and finalization — ensuring every ticket has a clear implementation path before development starts.

## When to use this skill

- You are the scrummaster or planner
- The ticket you have has the status "Needs Plan"

## Steps to follow when planning tickets:

### Step 1: Review the Refined Ticket

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Then dispatch `alignment` agents to independently report their understanding of the scope — what needs to be built and what success looks like.

**Purpose:** Ensure everyone understands the refined requirements before investing time in deep research.

If agents return with different interpretations — mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 2 instead report back that you cannot proceed yet as the ticket has been escalated.

If agents return with aligned understanding — proceed to Step 2.

### Step 2: Gather Codebase References

Now that the team agrees on what needs to be built, get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Then use the `Hand of the King` agent to recommend `research` agents appropriate for exploring the codebase and gathering references for this ticket, then dispatch them to explore the codebase and collect **facts only** — what exists in the repo that relates to this ticket. This is a **research-only pass**: agents report what they find, they do not give opinions on what should change or how.

Have all agents report back on:
- What files are related to the ticket?
- What functions are related to the ticket?
- What components are related to the ticket?
- What tests are related to the ticket?
- What documentation is related to the ticket?
- What out-of-scope observations did you find? (pre-existing bugs, deprecated APIs, tech debt near the affected code — anything worth knowing that is outside this ticket's acceptance criteria)

Collect these findings so you can pass them as context when dispatching agents in later steps. This avoids each later agent rediscovering the same ground.

**Suggestions:** After collecting all agent reports, identify unique out-of-scope observations. Before calling `prd-system_addSuggestion`, filter each one: **"Does this observation affect whether the plan will work or the implementation approach?"** If yes → it is not a suggestion. Handle it through the normal planning flow (log as a plan risk/concern, include in planIssues/blockingIssues, or escalate). If no → it is a purely informational, out-of-scope observation — call `prd-system_addSuggestion` to capture it. Suggestions accumulate across stages and are surfaced in the final PR description as "Things to consider before merging". Do not modify the plan to address suggestions — they are out-of-scope by definition.

Important that you ask each agent to report back on all of these points, even if they think some of them are not relevant. You want to make sure you have a comprehensive understanding of the codebase landscape for implementation, and you don't want to miss anything that could be important for later steps.

Same as the refining skill — do not ask one agent to report on files and another on tests. Instead ask each agent to report back on all of these points.

### Step 3: Draft Implementation Plans

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Include the findings from Step 2 as shared context.

Use the `Hand of the King` agent to recommend agents appropriate for implementing this ticket. Use the Scrum Master's judgment on how many to dispatch — default to 1 agent for simple changes, increase for complex tickets. Each agent should explore the repo and produce a free-form markdown plan covering:
- Ordered steps or checklist of work
- Files to create or modify per step
- Dependencies between steps
- Testing approach
- Any risks or concerns
- Out-of-scope observations (pre-existing bugs, deprecated APIs, tech debt near the affected code — report these so the scrum master can capture them as suggestions)

**Important constraints:**
- The plan must be a clean, standalone document - do not include any issue-tracking tables, status indicators, or references to feedback items. It should look like a forward-looking implementation plan, not a diff or changelog.
- Agents must **report their plan as text in their response only** - they must not write any files, create any documents, or invoke the `writing-plans` skill. No code, no plan files, no markdown files on disk. The plan is a proposal delivered in the agent's message; storage happens later in Step 7 via `prd-system_savePlan`.
- **Do not restate ACs as steps.** The implementation agent has access to the ACs. Your plan names the order, the dependencies, and the gotchas - not the column-by-column details the ACs already define. Bad: "Step 1: Add parentId column to cell_comment table". Good: "Schema changes in subtask 1 must precede service changes in subtask 2 (migration dependency)."
- **Limit steps to 1-3 files each.** If a step touches more than 3 files, split it. Each step should feel like one logical action affecting few files. Broad steps produce errors - the implementation agent cannot hold 6 files in context at once.
- **Name the constraint, not the fix.** Instead of "Replace index X with composite Y", say "The single-column index cannot support this query pattern - a composite covering WHERE + ORDER BY is needed." The implementation agent fills in specifics from the ACs and schemas.
- **Explicitly mark what can be parallelized.** After ordering steps, call out independent work: "Subtask A and B share no dependencies - implement in any order." This reduces overall delivery time.

**Purpose:** Generate multiple independent perspectives on how to implement the ticket. Different agents may spot different edge cases, risks, or better approaches.

Tell agents their plan is a proposal — it will be reviewed and potentially merged with other plans. Encourage them to be thorough but also pragmatic.

After collecting all plans, filter out-of-scope observations: if an observation would block or invalidate the plan, handle it through the normal flow (escalate or flag as a plan issue). Only call `prd-system_addSuggestion` with source="planning" for observations that are purely informational and non-blocking. These will be surfaced in the PR description.

### Step 4: Consolidate Plans

Review the plans from Step 3. Compare them for:
- Agreement on the overall approach
- Differences in ordering or strategy
- Different edge cases or risks identified

If agents largely agree — select the best plan or merge them into a single plan.

If agents diverge significantly — get the latest ticket information using `prd-system_getTicket`, then dispatch a single additional agent as a tiebreaker. Provide them with the ticket details, acceptance criteria, and the different plans, and ask them to evaluate which approach is better and why. You can also ask agents to produce a hybrid plan incorporating the best elements of each. If the tiebreaker alone cannot resolve, dispatch additional agents at the Scrum Master's discretion.

You may use the `writing-plans` skill to help consolidate, but remember to keep the plan as text in your response — do not write it to a file. Storage happens in Step 6 via `prd-system_savePlan`.

Converge on a single plan before proceeding.

### Step 5: Assign Workspace

Determine the feature branch and worktree directory for this ticket. Get the latest ticket information using `prd-system_getTicket`, then dispatch a single agent with the full ticket details to recommend a feature branch name and worktree directory. (name, description, acceptance criteria, dependencies) and the consolidated plan. Ask them to recommend:
- **Feature branch name** — the git branch to create for this work (e.g. `feature/my-ticket-name`)
- **Worktree directory** — the path to the git worktree where this branch will be checked out

The preferred worktree location is `.worktrees\%BRANCH%` — for example, a branch named `feature/foo` gets worktree `.worktrees/feature_foo` (replace `/` with `_` or another safe separator to avoid nested directories).

Check whether the project root contains an `init_worktree.sh`, `init-worktree.sh`, or similar setup script. If one exists, read its contents and use it to determine the correct worktree setup process for this project — it may specify a different directory convention or extra steps.

Agents should consider naming conventions from the existing repo and project structure.

Once you have a consensus, call `prd-system_assignWorkspace` to set the feature branch and worktree directory on the ticket.

If the ticket has subtasks, repeat this process for each subtask — each subtask gets its own feature branch and worktree directory, assigned using `prd-system_assignWorkspace` with the `subtaskId` parameter.

### Step 6: Verify Plan Quality

Before storing, run a quick quality check on the merged plan:

1. **Trim blank steps** - any step that says nothing actionable? Remove it.
2. **Drop duplicate substeps** - any step repeated verbatim? Keep the first, delete the rest.
3. **Check for AC restatement** - if a substep restates an AC as a step name, replace it with "see AC" or a dependency note.
4. **Confirm file lists are minimal** - if a step lists 4+ files, split the step or remove incidental files (config files, type re-exports, etc.).

If the plan fails any of these, fix it before proceeding to Step 7.

### Step 7: Store the Plan

Store the consolidated plan using `prd-system_savePlan` on the ticket.

If the ticket has subtasks, save a plan for each subtask as well. Plans are flat — each ticket or subticket has its own plan field, there is no nesting of plans within plans.

Use `prd-system_savePlan` with `subtaskId` to save plans on subtasks.

### Step 8: Review the Plan

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Use the `Hand of the King` agent to recommend `validation` agents appropriate for reviewing this plan, then dispatch them to review the plan. Present only the current plan — do not include any previous feedback items, review issues, or prior cycle data. Agents must evaluate the plan as-is, fresh. They should explore the repo and gather information to evaluate:
- Is the plan complete? Does it cover all acceptance criteria?
- Are the steps feasible and reasonably ordered?
- Are edge cases and risks addressed?
- Is the testing approach adequate?

Same as above, important that you ask each agent to report back on all of these points, even if they think some of them are not relevant.

#### Handling feedback

Before dispatching any agents to validate feedback, you MUST have all of the following ready (check each before proceeding):
- [ ] Ticket name, description, and acceptance criteria (from `prd-system_getTicket`)
- [ ] The stored plan
- [ ] Sub-tickets and their descriptions (if applicable)
- [ ] Feedback items with full context

Then **validate the feedback**: call `prd-system_getTicket` to get the latest ticket information, then use the `Hand of the King` agent to recommend `validation` agents appropriate for validating this feedback, then dispatch them with all of the context gathered above. Use this **exact prompt structure** (fill in all placeholders):

```
TICKET: <ticket name>
DESCRIPTION: <ticket description>
ACCEPTANCE CRITERIA: <acceptance criteria>
PLAN: <key steps from the plan>
DEPENDENCIES: <dependencies>
ESTIMATE: <estimate>
SUBTASKS: <subtask names and descriptions (if any)>

FEEDBACK ITEMS TO VALIDATE:
<each feedback item with full context>

For each feedback item, explore the repo and provide:
- Verdict: YES / NO / PARTIALLY
- Evidence from the codebase supporting your verdict
- If PARTIALLY, what part is valid and what needs adjustment
```

Ask them to explore the repo to check whether each piece of feedback is valid and genuinely requires a change. Not all feedback needs to be acted on — only incorporate feedback that agents confirm is accurate and necessary.

If agents disagree on whether feedback is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the feedback should be acted on.

If valid feedback requires changes to the plan, go back to the relevant step:
- Step 3 if the approach itself needs rethinking (re-draft the plan)
- Step 6 if the plan just needs refinement (update the stored plan)

Then continue through the steps again until the agents review the plan and provide valid feedback that does not require any changes, at which point you can move on to the next step.

When returning to Step 7 for re-review, present the plan as-is with no reference to previous feedback or what was fixed. The reviewing agents must evaluate the current plan fresh.

If you reached this step 3 times and the agents are still providing feedback that requires changes to the plan, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 8 instead report back that you cannot proceed yet as the ticket has been escalated.

### Step 9: Finalize

Once all the above steps are complete and the plan has been reviewed, finalize the ticket using `prd-system_finalizePlanning`. This will mark the ticket as "Ready Plan Review", which means it is ready for an independent team to review the plan.

Report back that your work is done and the ticket is ready for plan review.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|---|
| 1 | Review refined ticket | Dispatch `alignment` agents; Consensus → proceed; Divergence → escalate |
| 2 | Gather codebase references | Dispatch `research` agents; collect files, patterns, risks |
| 3 | Draft implementation plans | SM discretion (default 1 agent, increase for complex tickets) |
| 4 | Consolidate plans | Converge on a single plan; tiebreaker if needed |
| 5 | Assign workspace | Single agent determines branch and worktree |
| 6 | Store the plan | Save plan on ticket + each subtask via `savePlan` |
| 7 | Review the plan | Dispatch `validation` agents; validate via repo exploration |
| 8 | Finalize | `finalizePlanning` → status "Ready Plan Review" |

## Common Mistakes

- **Skipping Step 2 research.** Sending agents straight to plan drafting without collecting shared references means each agent rediscovers the same ground. Always gather references first.
- **Skipping ticket context when dispatching agents.** Every agent dispatch in every step must include the ticket name, description, acceptance criteria, plan, and subtask details. Agents cannot evaluate, research, or plan without knowing the ticket's requirements. Steps 1, 2, 4 (tiebreakers), and 5 are common offenders — always call `prd-system_getTicket` first. Use the template in Step 7's Handling feedback section as a model for all dispatches.
- **Skipping feedback validation.** Not all review feedback is valid. Always dispatch agents to verify feedback against the repo before acting on it.
- **Creating nested plans.** Plans are flat per ticket/sub-ticket. Do not create sub-plans within plans.
- **Over-engineering the plan.** The plan should be a practical implementation guide, not a detailed technical specification. Keep it actionable but not overly prescriptive.
- **Agents writing files during planning.** Agents must only report their plan as text in their response. They must not write plan files, code, or any other files to disk — that happens during development, not planning. Explicitly forbid the `writing-plans` skill and file writes in your instructions to plan-drafting agents.
- **Scope creep during planning.** When agents find pre-existing bugs, deprecated APIs, or tech debt near affected code, do not expand the plan to address them. If the finding is truly non-blocking and out-of-scope, capture it as a suggestion via `prd-system_addSuggestion` with source="planning". If the finding blocks or invalidates the plan, handle it through the normal flow (escalate or flag as a plan issue) — do **not** use suggestions as a substitute for proper issue tracking.
