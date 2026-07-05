---
name: prd-security-review
description: Use when a ticket is marked as "Needs Security Review" in the PRD system — runs security analysis against the implementation.
user-invocable: false
---

# Security Review for the PRD system

## Overview

Security review validates that the implementation does not introduce security vulnerabilities, follows secure coding practices, and meets the project's security baseline. This skill dispatches security agents to audit the codebase, checks dependencies, scans for secrets, and determines pass or fail.

## When to use this skill

- You are the scrummaster or security reviewer
- The ticket you have has the status "Needs Security Review"

## Steps to follow when performing a security review:

### Step 1: Get Ticket Details

Get the latest ticket information using `prd-system_getTicket`. Collect the description, acceptance criteria, plan, tech notes, implementation branch/worktree path, and any recorded deviations with their review results.

### Step 2: Try to Load Repo-Level Security Tools Skill

Attempt to load a skill named `security-tools` (`.opencode/skills/security-tools/SKILL.md`). If it resolves, read its content. This skill, if present in a repo, describes available security tooling:

- CLI commands to run (e.g., `snyk test --json`, `npm audit`, `sonar-scanner`)
- Expected report formats (stdout parse, JSON file, etc.)
- Fail conditions (critical/high vulns, any finding, etc.)
- Any special setup or authentication required

If the `security-tools` skill does not load (or the agent fails to find it), proceed without it — the baseline checks in Step 3 still run.

### Step 3: Run Baseline Security Checks (Always)

Use the `Hand of the King` agent to recommend `security` agents appropriate for this ticket's tech stack and domain (default 1, SM discretion based on complexity). Dispatch them with the full ticket details, implementation checkout path, and any tool commands from Step 2.

Each agent must explore the repo and perform a baseline security assessment covering:

| Check | What to Look For |
|---|---|
| Dependency audit | Run `npm audit`, `pip-audit`, `cargo audit`, `go list -m` or equivalent. Are there known CVEs? Critical/high severity? |
| Secrets in code | API keys, tokens, passwords, connection strings, private keys in source, config files, comments, or commit history |
| Config exposure | Hardcoded env vars, `.env` files committed, exposed endpoints, debug mode enabled, permissive CORS |
| OWASP top 10 | Injection (SQL, NoSQL, command), broken auth, XSS, insecure deserialization, SSRF, path traversal, etc. |
| File permissions | World-readable files containing secrets, executable scripts that shouldn't be, misconfigured `.gitignore` |
| Dependency freshness | Outdated libraries with known vulns beyond just CVE count |

If Step 2 found a `security-tools` skill: Include its tooling commands as additional checks. The agent should run those tools, collect output/logs, and evaluate results against the skill's fail conditions.

Agents report back on:

- Each check performed
- Findings (what was found, severity, evidence)
- Any recorded deviations — are they safe from a security perspective?
- Out-of-scope observations (pre-existing security issues, unrelated vulns)
- Log/evidence paths — where to find raw tool output on disk, if saved
- Save security scan output as evidence — call `prd-system_addEvidence` with `source="security"` for: dependency audit JSON output, secret scan results, SAST tool output, or manual review notes. Evidence type: `security_scan`.

### Step 4: Record Suggestions

For unique out-of-scope findings: if purely informational and non-blocking → `prd-system_addSuggestion` with `source="security"` (include `subtaskId` if this is a subtask). If the finding affects whether the implementation is secure enough to proceed → include in security notes (determines pass/fail).

### Step 5: Consolidate Findings

Collect all agent reports. Determine pass/fail:

- **Pass**: All agents confirm no critical/high findings, or only acceptable low-severity issues
- **Fail**: Any agent reports a vulnerability that requires code changes, a leaked secret, an exploitable misconfiguration, or a flagged deviation

### Step 6: Act on Results

- **Pass**: `prd-system_completeSecurityReview({ passed: true })` → ticket transitions to **"Needs QA"**
- **Fail**: `prd-system_completeSecurityReview({ passed: false, securityNotes: [...] })` → ticket transitions to **"Needs Implementation Update"**

### Step 7: Report

Report back that the security review is complete and the ticket has been marked accordingly.

Do not process the ticket any further, only when asked to process the ticket again would it be worked on further.

### Escalation

If security agents disagree on whether a critical finding is valid, dispatch an additional agent as a tiebreaker. If consensus cannot be reached after 3 attempts, mark the ticket as "Needs Human Clarification" by using the `prd-system_escalate` tool.

## Quick Reference

| Step | Action | Key Decision |
|---|---|---|
| 1 | Get ticket details | `prd-system_getTicket` |
| 2 | Load repo security tools | Check for `.opencode/skills/security-tools/SKILL.md` |
| 3 | Dispatch security agents | Hand of the King recommends `security` agents |
| 4 | Record suggestions | `addSuggestion` for out-of-scope findings |
| 5 | Consolidate findings | All pass + no critical findings → proceed; Any fail → fail |
| 6a | Pass → | `completeSecurityReview(passed: true)` → "Needs QA" |
| 6b | Fail → | `completeSecurityReview(passed: false, notes)` → "Needs Implementation Update" |
| Escalate | 3 failed consensus attempts | `escalate` → "Needs Human Clarification" |

## Common Mistakes

- **Skipping dependency checks.** Outdated dependencies with known CVEs are a common source of vulnerabilities. Always run the language-appropriate audit tool.
- **Only scanning with automated tools.** Automated scanners miss logic flaws. Manual review of auth, authorization, and data handling is essential.
- **Treating all secrets the same.** A hardcoded test API key is less critical than a production database password. Prioritize based on blast radius.
- **Ignoring the deviation list.** Deviations from the plan may have introduced security gaps. Each deviation must be reviewed for security implications.
- **Mixing suggestions into security notes.** If an out-of-scope observation is non-blocking and purely informational, use `prd-system_addSuggestion` with `source="security"` (include `subtaskId` if this is a subtask). Only include blocking security findings in `securityNotes`.
