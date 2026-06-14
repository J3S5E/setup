---
name: prd-refining-tickets
description: Use when you are the scrummaster and a ticket is marked as "Needs Refinement" in the PRD system.
user-invocable: false
---

# Refining Tickets for the PRD system

## Overview

Refining a ticket transforms a raw description into a clear, actionable unit of work. This skill walks through alignment, research, splitting, estimation, and review — ensuring every ticket is unambiguous before development starts.

## When to use this skill

- You are the scrummaster
- The ticket you have has the status "Needs Refinement"

## Steps to follow when refining tickets:

### Step 1: Align on What the Ticket Means

Get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Then dispatch 3 or more agents to independently report their understanding of what this ticket asks for.

**Purpose:** Verify everyone interprets the ticket the same way before investing time in deep research.

If agents return with different interpretations — mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool. Do not proceed to Step 2 instead report back that you cannot proceed yet as the ticket has been escalated.

If agents return with aligned understanding — optionally update the name and/or description for clarity using `prd-system_updateName` or `prd-system_updateDescription`, then proceed.

### Step 2: Gather Concrete References

Now that the team agrees on what the ticket means, get the latest ticket information using `prd-system_getTicket` to pass to the agents for this step. Then dispatch 3 or more agents to explore the codebase and collect specific facts that subsequent steps (splitting, estimation, review) will rely on. This avoids each later agent rediscovering the same ground.

| Purpose | Step 1 | Step 2 |
|---|---|---|
| **Question answered** | "What does this ticket mean?" | "What in the codebase does it touch?" |
| **Output** | Shared interpretation, possibly an updated description | A reference bundle (files, functions, tests) |
| **Exit early?** | Yes — if interpretations diverge, stop | No — proceed once Step 1 is aligned |

Have all agents report back on:
- What files are related to the ticket?
- What functions are related to the ticket?
- What components are related to the ticket?
- What tests are related to the ticket?
- What documentation is related to the ticket?

Collect these findings so you can pass them as context when dispatching agents in later steps.

Important that you ask each agent to report back on all of these points, even if they think some of them are not relevant. You want to make sure you have a comprehensive understanding of the codebase references for this ticket, and you don't want to miss anything that could be important for later steps.
Example is not to ask one agent to report back on files and functions, and another agent to report back on tests and documentation. Instead ask each agent to report back on all of these points.

This is just information gathering step, you are not asking the agents what files/functionaloty should be created or updated, just what files/functionality is related to this ticket. This will help you later when you ask the agents to estimate the ticket and give you a better understanding of the scope of the ticket.

### Step 3: Splitting the Ticket

Get latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Ask 3 or more agents their opinion on whether this ticket should be split into sub-tickets or not.
Sub-tickets are not for reviewing/testing the code, gathering information, and updating the description. They are more about breaking down the work into smaller pieces that can be worked on independently.
Good candidates for sub-tickets are:
- "Frontend work" and "Backend work" if the ticket involves both complex frontend and backend changes.
- "Data fetching" and "UI rendering" if the ticket involves both complex data fetching and UI rendering.

First ask the agents if they think the ticket should be split or not. If they say no then you can move on to the next step.

#### Decided to split the ticket

If they say yes then use `prd-system_getTicket` to get the latest ticket information and pass it to the new agents when you ask them how they will split this ticket.
Then after you got a consensus you can ask a couple more agents their opinion.
Only split when you have a majority saying that it is worth splitting, we dont want to split willy-nilly.
Once you know you are creating subtickets you can create the sub-tickets using the `prd-system_createSubtask` tool and link them to the original ticket.

### Step 4: Finalizing the Ticket (and sub-tickets if they exist)

Get latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

If this ticket has sub-tickets complete the following steps for each sub-ticket, then follow the same steps for the original ticket.
If this ticket does not have sub-tickets then just follow the steps for the original ticket.

Ask 3 or more agents their opinion on these for the ticket, let them explore the repo and gather information to be able to answer these questions:
- Definition of done: What does it mean for this ticket/task to be done? What are the acceptance criteria? This should not include implementation details, but rather the expected behavior and outcomes that would indicate the ticket is complete.
- Dependencies: Does this ticket depend on any other tickets? Are there any blockers that need to be resolved before work can start on this ticket?
- Estimation: How long do the agents think this ticket will take to complete? This can be in terms of story points or time estimates.
- Tech notes: Are there any technical notes that should be included in the ticket description? This can include information about the potential challenges, and any other relevant details but no planning the actual implementation.

Your job is to gather all this information then update the ticket using the `prd-system_refineTicket` tool (this replaces all fields at once, so ensure you have everything collected before calling it).

Same as above, important that you ask each agent to report back on all of these points, even if they think some of them are not relevant. You want to make sure you have a comprehensive understanding of the ticket, and you don't want to miss anything that could be important for later steps.

### Step 5: Get reviews for the ticket

Get latest ticket information using `prd-system_getTicket` to pass to the agents for this step.

Ask 3 or more agents to review the ticket. Present only the current ticket state — description, acceptance criteria, dependencies, estimation, tech notes, and subtask definitions. Do NOT include any previous feedback items, review comments, or prior cycle data. Agents must evaluate the ticket as-is, fresh.
They should explore the repo and gather information to be able to answer these questions:
- Is the ticket description clear and concise?
- Are the sub-tickets (if they exist) well defined and appropriately linked to the original ticket?
- Are the acceptance criteria well defined?
- Are the dependencies correctly identified?
- Is the estimation reasonable?
- Are the tech notes clear and helpful?

Same as above, important that you ask each agent to report back on all of these points, even if they think some of them are not relevant. You want to make sure you have a comprehensive understanding of the ticket, and you don't want to miss anything that could be important for later steps.

#### Handling feedback

Before dispatching any agents to validate feedback, you MUST have all of the following ready (check each before proceeding):
- [ ] Ticket name, description, and current acceptance criteria (from `prd-system_getTicket`)
- [ ] Sub-tickets and their descriptions (if applicable)
- [ ] Dependencies, estimation, and tech notes
- [ ] Feedback items with full context

Then **validate the feedback**: use the Hand of the King agent to recommend appropriate agents, then dispatch 3 or more of them with all of the context gathered above. Use this **exact prompt structure** (fill in all placeholders):

```
TICKET: <ticket name>
DESCRIPTION: <ticket description>
ACCEPTANCE CRITERIA: <current acceptance criteria>
DEPENDENCIES: <dependencies>
ESTIMATION: <estimation>
TECH NOTES: <tech notes>
SUBTASKS: <subtask names and descriptions (if any)>

FEEDBACK ITEMS TO VALIDATE:
<each feedback item with full context>

For each feedback item, explore the repo and provide:
- Verdict: YES / NO / PARTIALLY
- Evidence from the codebase supporting your verdict
- If PARTIALLY, what part is valid and what needs adjustment
```

Ask them to explore the repo to check whether each piece of feedback is valid and genuinely requires a change. Not all feedback needs to be acted on — only incorporate feedback that agents confirm is accurate and necessary.

If the agents disagree on whether feedback is valid, dispatch an additional agent as a tiebreaker. The majority verdict determines whether the feedback should be acted on.

If valid feedback requires changes to the ticket, go back to the relevant step
(Step 1 for description issues, Step 3 for sub-ticket issues, Step 4 for acceptance criteria, dependencies, estimation, or tech notes issues)
and consult the agents again to gather information and make the necessary updates to the ticket using the appropriate tools.
Then continue through the steps again until the agents review the ticket and provide valid feedback that does not require any changes to the ticket, at which point you can move on to the next step.

When returning to Step 5 for re-review, present the ticket as-is with no reference to previous feedback or what was fixed. The reviewing agents must evaluate the current ticket fresh.

If you reached this step 3 times and the agents are still providing feedback that requires changes to the ticket,
then you should mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool.
Do not proceed to Step 6 instead report back that you cannot proceed yet as the ticket has been escalated.

### Step 6: Finalize the ticket

Once all the above steps are complete and the ticket has been reviewed, you can mark the ticket as "Needs Plan" using the `prd-system_finish-refinement` tool.
Once the ticket is marked as "Needs Plan", it is ready for the next stage in the PRD system where it will be picked up by a planner to create a plan for implementation.
You can then report back that your work is done and the ticket is ready for planning.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Align on interpretation | Consensus → proceed; Divergence → escalate |
| 2 | Gather codebase references | Collect files, functions, tests, docs |
| 3 | Decide on sub-tickets | Split if frontend/backend or data/UI are both complex |
| 4 | Finalize each ticket | Define DoD, dependencies, estimate, priority, tech notes |
| 5 | Peer review | Valid feedback → back to relevant step; all clear → done; 3+ cycles → escalate |

## Common Mistakes

- **Splitting too eagerly.** Not every ticket needs sub-tickets. Only split when the work naturally divides into independently actionable pieces.
- **Including implementation details.** The ticket should describe *what* needs to be done and *why*, not *how*. Keep implementation notes in the tech notes field, not the description.
- **Skipping Step 1 alignment.** If agents interpret the ticket differently and you proceed anyway, later steps will produce conflicting outputs. Always resolve ambiguity first.
- **Re-exploring unnecessarily in every step.** Collect references once in Step 2 and reuse them. Dispatching fresh exploratory agents in Steps 3-5 without sharing context wastes time and tokens. Agents should still be encouraged to explore for new information, but they should build on the shared knowledge base rather than starting from scratch.
- **Skipping ticket context when dispatching agents.** Every agent dispatch in every step must include the ticket name, description, acceptance criteria, dependencies, and subtask details. Agents cannot evaluate, research, or plan without knowing the ticket's requirements. Steps 1, 2, and the Step 3 sub-dispatch are common offenders — always call `prd-system_getTicket` first. Use the template in Step 5's Handling feedback section as a model for all dispatches.

