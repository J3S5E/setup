---
name: list-agents
description: Lists all available subagents with their names and descriptions
user-invocable: false
---

# List Available Agents

This skill provides a list of all available subagents that can be spawned.

## How It Works

Run the PowerShell script to get all available subagents:

```
powershell -ExecutionPolicy Bypass -File "C:\GIT\setup\home\.config\opencode\skills\list-agents\list-agents.ps1"
```

The script:
1. Finds all `.md` files in the agents folder
2. Reads the YAML frontmatter from each file
3. Filters to only include files where `mode: subagent`
4. Extracts and returns only the `name` and `description` fields

## Output Format

The script outputs a table with two columns:
- **Name**: The agent's name
- **Description**: What the agent specializes in

Example output:
```
Name               Description                                  
----               -----------                                  
Agent Recruter    Analyzes job/task descriptions and recom...
Code Reviewer     Expert code reviewer who provides constru...
...
```

Use this list to match tasks to the best available subagent.
