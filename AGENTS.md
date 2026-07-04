# This repo has my personal setup for a device

Has things like:
- Wezterm config
- OpenCode config

## OpenCode

### Prd system

#### Agents

Scrum Master - home  .config  opencode  agents   __scrum-master.md
Hand of the king - home  .config  opencode  agents   _hand-of-the-king.md

#### Skills

setup  home  .config  opencode  skills  prd-*

#### Tools

setup  home  .config  opencode  tools   list-agents.ts
setup  home  .config  opencode  tools   prd-system.ts

#### Ralph loop

setup  home  .config  opencode   ralph.js

#### TLDR

The **PRD (Product Requirement Document) system** is an automated, agent-driven ticket lifecycle for opencode. Its goal is to take a raw idea from "someone should build this" through to "it's done and merged" — without requiring human babysitting at every step.

The core concept: A ticket moves through a pipeline of stages (example: refinement → planning → implementation → review → QA → PR → finalize). At each stage, the Scrum Master agent delegates work to specialized sub-agents (researchers, planners, implementers, reviewers, QA engineers), consolidates their output, and advances the ticket to the next stage. If agents can't reach consensus, the ticket escalates to a human.

Key philosophy:
- **Agent consensus, not authority** — multiple independent agents evaluate at each stage; divergence means escalation, not override
- **Suggestions & deviations** — out-of-scope observations and intentional plan changes are tracked and surfaced in the PR, so nothing is lost
- **Subtasks** — complex tickets can be broken into independently lifecycle-managed pieces that feed back into the parent
- **Human-in-the-loop** — if agents loop too many times or can't agree, the ticket escalates rather than spinning forever

It's still a work in progress and subject to change with the stages listed not being the correct order.
