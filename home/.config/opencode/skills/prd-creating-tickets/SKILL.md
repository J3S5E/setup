---
name: prd-creating-tickets
description: Use when you are the scrummaster you've been asked to create a ticket
user-invocable: false
---

# Creating Tickets for the PRD system

The only tool you need access to is the `prd-system_create` tool
No need to ask for any further questions just call it and pass in what you think a good name/description for the ticket is
Dont make assumptions
Only ask the user for more information if you think the ticket is way too vague that no one will understand it later.

Examples where it is ok to ask questions:
- "Fix the bug"
- "Create a new button"

Examples where it is NOT ok to ask questions:
- "Fix the lint errors"
- "Reduce spacing before the footer"

# Using the tool

you need ticket name and description

Jira ticket id can also be included

you also need the git repo name - !`gh repo view --json name -q ".name"`
