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

Read the ticket description, acceptance criteria, tech notes, estimation, and subtasks carefully. Dispatch 2 or more agents to independently report their understanding of the scope — what needs to be built and what success looks like.

**Purpose:** Ensure everyone understands the refined requirements before investing time in deep research.

If agents return with different interpretations — mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 2 instead report back that you cannot proceed yet as the ticket has been escalated.

If agents return with aligned understanding — proceed to Step 2.

### Step 2: Gather Codebase References

Now that the team agrees on what needs to be built, dispatch 3 or more agents to explore the codebase and collect **facts only** — what exists in the repo that relates to this ticket. This is a **research-only pass**: agents report what they find, they do not give opinions on what should change or how.

Have all agents report back on:
- What files are related to the ticket?
- What functions are related to the ticket?
- What components are related to the ticket?
- What tests are related to the ticket?
- What documentation is related to the ticket?

Collect these findings so you can pass them as context when dispatching agents in later steps. This avoids each later agent rediscovering the same ground.

Important that you ask each agent to report back on all of these points, even if they think some of them are not relevant. You want to make sure you have a comprehensive understanding of the codebase landscape for implementation, and you don't want to miss anything that could be important for later steps.

Same as the refining skill — do not ask one agent to report on files and another on tests. Instead ask each agent to report back on all of these points.

### Step 3: Draft Implementation Plans

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Include the findings from Step 2 as shared context.

Dispatch 3 or more agents to independently create implementation plans. Each agent should explore the repo and produce a free-form markdown plan covering:
- Ordered steps or checklist of work
- Files to create or modify per step
- Dependencies between steps
- Testing approach
- Any risks or concerns

**Important constraints:** Agents must **report their plan as text in their response only** — they must not write any files, create any documents, or invoke the `writing-plans` skill. No code, no plan files, no markdown files on disk. The plan is a proposal delivered in the agent's message; storage happens later in Step 5 via `prd-system_savePlan`.

**Purpose:** Generate multiple independent perspectives on how to implement the ticket. Different agents may spot different edge cases, risks, or better approaches.

Tell agents their plan is a proposal — it will be reviewed and potentially merged with other plans. Encourage them to be thorough but also pragmatic.

### Step 4: Consolidate Plans

Review the plans from Step 3. Compare them for:
- Agreement on the overall approach
- Differences in ordering or strategy
- Different edge cases or risks identified

If agents largely agree — select the best plan or merge them into a single plan.

If agents diverge significantly — dispatch 2 or more additional agents as tiebreakers. Provide them with the different plans and ask them to evaluate which approach is better and why. You can also ask agents to produce a hybrid plan incorporating the best elements of each.

You may use the `writing-plans` skill to help consolidate, but remember to keep the plan as text in your response — do not write it to a file. Storage happens in Step 5 via `prd-system_savePlan`.

Converge on a single plan before proceeding.

### Step 5: Store the Plan

Store the consolidated plan using `prd-system_savePlan` on the ticket.

If the ticket has subtasks, save a plan for each subtask as well. Plans are flat — each ticket or subticket has its own plan field, there is no nesting of plans within plans.

Use `prd-system_savePlan` with `subtaskId` to save plans on subtasks.

### Step 6: Review the Plan

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Dispatch 3 or more agents to review the plan. They should explore the repo and gather information to evaluate:
- Is the plan complete? Does it cover all acceptance criteria?
- Are the steps feasible and reasonably ordered?
- Are edge cases and risks addressed?
- Is the testing approach adequate?

Same as above, important that you ask each agent to report back on all of these points, even if they think some of them are not relevant.

#### Handling feedback

First, **validate the feedback**: Get the latest ticket information using `prd-system_getTicket`. Then dispatch 2 or more agents with **all of the following context** — the full ticket details, the stored plan, and the feedback received. Ask them to explore the repo to check whether the feedback is valid and genuinely requires a change. Not all feedback needs to be acted on — only incorporate feedback that agents confirm is accurate and necessary.

If the agents disagree on whether feedback is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the feedback should be acted on.

If valid feedback requires changes to the plan, go back to the relevant step:
- Step 3 if the approach itself needs rethinking (re-draft the plan)
- Step 5 if the plan just needs refinement (update the stored plan)

Then continue through the steps again until the agents review the plan and provide valid feedback that does not require any changes, at which point you can move on to the next step.

If you reached this step 3 times and the agents are still providing feedback that requires changes to the plan, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 7 instead report back that you cannot proceed yet as the ticket has been escalated.

### Step 7: Finalize

Once all the above steps are complete and the plan has been reviewed, finalize the ticket using `prd-system_finalizePlanning`. This will mark the ticket as "Ready Plan Review", which means it is ready for an independent team to review the plan.

Report back that your work is done and the ticket is ready for plan review.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Review refined ticket | Consensus → proceed; Divergence → escalate |
| 2 | Gather codebase references | Collect files to create/modify, patterns, risks |
| 3 | Draft implementation plans | 3+ agents produce independent markdown plans |
| 4 | Consolidate plans | Converge on a single plan; tiebreaker if needed |
| 5 | Store the plan | Save plan on ticket + each subtask via `savePlan` |
| 6 | Review the plan | Validate feedback via repo exploration; 3+ cycles → escalate |
| 7 | Finalize | `finalizePlanning` → status "Ready Plan Review" |

## Common Mistakes

- **Skipping Step 2 research.** Sending agents straight to plan drafting without collecting shared references means each agent rediscovers the same ground. Always gather references first.
- **Skipping feedback validation.** Not all review feedback is valid. Always dispatch agents to verify feedback against the repo before acting on it.
- **Creating nested plans.** Plans are flat per ticket/sub-ticket. Do not create sub-plans within plans.
- **Over-engineering the plan.** The plan should be a practical implementation guide, not a detailed technical specification. Keep it actionable but not overly prescriptive.
- **Agents writing files during planning.** Agents must only report their plan as text in their response. They must not write plan files, code, or any other files to disk — that happens during development, not planning. Explicitly forbid the `writing-plans` skill and file writes in your instructions to plan-drafting agents.
