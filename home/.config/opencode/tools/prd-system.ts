import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

type Suggestion = {
  suggestionId: string;
  message: string;
  source: "planning" | "implementation" | "review" | "qa";
  createdAt: string;
  resolvedAt?: string;
};

type Deviation = {
  deviationId: string;
  planItem: string;
  action: "omitted" | "replaced";
  replacement?: string;
  reason: string;
  createdAt: string;
  reviewResult?: { accepted: boolean; comment?: string };
  qaResult?: { validated: boolean; comment?: string };
};

type Prd = Ticket & {
  gitRepo: string;
  jiraTicket?: string;
  subtasks?: Ticket[];
  planIteration: number;
};

type Ticket = {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  acceptanceCriterias?: string[];
  estimation?: string;
  techNotes?: string[];
  dependencys?: string[];
  plan?: string;
  suggestions?: Suggestion[];
  deviations?: Deviation[];
  planIssues?: string[];
  blockingIssues?: string[];
  targetBranch: string;
  featureBranch: string;
  worktreeDir: string;
  branch?: string;
  reviewComments?: string[];
  qaNotes?: string[];
  prUrl?: string;
  prMerged?: boolean;
  rejectionNotes?: string;
  blockedReason?: string;
  previousStatus?: string;
};

function hasSubtasks(prd: Prd): boolean {
  return !!prd.subtasks && prd.subtasks.length > 0;
}

function getPrdsFolder(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\prds";
}

function getPrd(id: string, gitRepo: string): Prd | null {
  const prdsFolder = getPrdsFolder();
  const prdPath = path.join(prdsFolder, `${gitRepo}__${id}.json`);
  if (!fs.existsSync(prdPath)) {
    return null;
  }
  const prdData = fs.readFileSync(prdPath, "utf-8");
  return JSON.parse(prdData);
}

function updatePrd(prd: Prd, gitRepo: string): void {
  const prdsFolder = getPrdsFolder();
  const prdPath = path.join(prdsFolder, `${gitRepo}__${prd.id}.json`);
  fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2), "utf-8");
}

const PRD_AGENT_COUNTS = {
  alignment: 3,
  research: 3,
  review: 5,
  validation: 3,
  qa: 3,
};

export const getConfig = tool({
  description:
    "Returns the PRD system agent count configuration. Call this once at the start of a skill session to get configured minimum agent counts. Each config key corresponds to a step type: alignment (consensus checks), research (codebase exploration), review (detailed plan/review), validation (verifying issues/fixes), qa (quality assurance). Keys used in skill files are wrapped in backticks, e.g. `alignment`.",
  args: {},
  async execute() {
    return JSON.stringify(PRD_AGENT_COUNTS, null, 2);
  },
});

export const create = tool({
  description:
    "Creates a Product Requirement Document (PRDs) in the system with their descriptions.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    name: tool.schema.string().min(25).max(250).describe("Name of the ticket"),
    jiraTicket: tool.schema
      .string()
      .min(2)
      .max(20)
      .describe("Name of the JIRA ticket - if provided"),
    description: tool.schema
      .string()
      .min(25)
      .max(2000)
      .describe("Description of the ticket"),
    id: tool.schema
      .string()
      .optional()
      .describe("Id of the ticket - if you have one"),
    targetBranch: tool.schema
      .string()
      .min(1)
      .max(100)
      .describe("Target branch for the PR (where code will be merged into)"),
    priority: tool.schema
      .string()
      .optional()
      .describe("Priority: P0, P1, P2, or P3 (defaults to P2)"),
  },
  async execute({ gitRepo, name, description, id, targetBranch, priority }) {
    const existingPrd = id ? getPrd(id, gitRepo) : null;
    if (existingPrd) {
      return `Ticket with ID ${id} already exists. Please use a different ID or omit the ID to generate a new one.`;
    }

    const ticketId = id || crypto.randomUUID();

    const prdData = {
      id: ticketId,
      gitRepo,
      name,
      description,
      status: "Needs Refinement",
      priority: priority || "P2",
      createdAt: new Date().toISOString(),
      planIteration: 0,
      targetBranch,
      featureBranch: "",
      worktreeDir: "",
    };

    updatePrd(prdData, gitRepo);

    return `Ticket created with ID - ${ticketId}`;
  },
});

export const getTicket = tool({
  description: "Gets a ticket by its ID.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
  },
  async execute({ id, gitRepo }) {
    const prdData = getPrd(id, gitRepo);
    if (!prdData) {
      return `Ticket with ID ${id} not found.`;
    }
    return JSON.stringify(prdData, null, 2);
  },
});

export const escalate = tool({
  description: "Escalates a ticket for human intervention.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
  },
  async execute({ id, gitRepo }) {
    const prdData = getPrd(id, gitRepo);

    if (!prdData) {
      return `Ticket with ID ${id} not found.`;
    }

    const status = prdData.status;
    const terminalStatuses = ["Done", "Cancelled"];
    if (terminalStatuses.includes(status)) {
      return `Ticket with ID ${id} is in a terminal state (${status}) and cannot be escalated.`;
    }

    if (status === "Needs Refinement") {
      if (
        prdData.acceptanceCriterias &&
        prdData.acceptanceCriterias.length > 0
      ) {
        prdData.status = "Needs Human Refinement finalization";
      } else {
        prdData.status = "Needs Human Title and Description refinement";
      }
    } else if (status === "Needs Plan" || status === "Needs Plan Updating") {
      prdData.status = prdData.plan
        ? "Needs Human Plan finalization"
        : "Needs Human Plan creation";
    } else if (status === "Ready Plan Review") {
      prdData.status = "Needs Human Plan Review";
    } else if (status === "Needs Subtickets Processed") {
      prdData.status = "Needs Human Subtickets";
    } else if (status === "Needs Implementing" || status === "Needs Implementation Update") {
      prdData.status = "Needs Human Implementation";
    } else if (status === "Needs Review") {
      prdData.status = "Needs Human Review";
    } else if (status === "Needs QA") {
      prdData.status = "Needs Human QA";
    } else if (status === "Needs PR") {
      prdData.status = "Needs Human PR";
    } else if (status === "Needs Reapproach") {
      prdData.status = "Needs Human Reapproach";
    } else if (status === "Blocked") {
      prdData.status = "Needs Human Unblock";
    } else if (status === "Needs Finalizing") {
      prdData.status = "Needs Human Finalization";
    }

    updatePrd(prdData, gitRepo);
    return `Ticket with ID ${id} escalated to ${prdData.status}.`;
  },
});

export const updateName = tool({
  description: "Updates the name of a ticket.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    name: tool.schema
      .string()
      .min(5)
      .max(250)
      .describe("New name of the ticket"),
  },
  async execute({ id, gitRepo, name }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (
      prd.status !== "Needs Human Title and Description refinement" &&
      prd.status !== "Needs Refinement"
    ) {
      return `Ticket with ID ${id} is not in a state that allows name updates. Current status: ${prd.status}.`;
    }

    prd.name = name;
    updatePrd(prd, gitRepo);

    return `Name for ticket with ID ${id} updated successfully.`;
  },
});

export const updateDescription = tool({
  description: "Updates the description of a ticket.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    description: tool.schema
      .string()
      .min(5)
      .max(2000)
      .describe("New description of the ticket"),
  },
  async execute({ id, gitRepo, description }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (
      prd.status !== "Needs Human Title and Description refinement" &&
      prd.status !== "Needs Refinement"
    ) {
      return `Ticket with ID ${id} is not in a state that allows description updates. Current status: ${prd.status}.`;
    }

    prd.description = description;

    updatePrd(prd, gitRepo);

    return `Description for ticket with ID ${id} updated successfully.`;
  },
});

export const updatePriority = tool({
  description: "Updates the priority of a ticket.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    priority: tool.schema
      .string()
      .describe("Priority: P0, P1, P2, or P3"),
  },
  async execute({ id, gitRepo, priority }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (!["P0", "P1", "P2", "P3"].includes(priority)) {
      return `Invalid priority: ${priority}. Must be P0, P1, P2, or P3.`;
    }

    const terminalStatuses = ["Done", "Cancelled"];
    if (terminalStatuses.includes(prd.status)) {
      return `Ticket with ID ${id} is in a terminal state (${prd.status}) and cannot be updated.`;
    }

    prd.priority = priority as "P0" | "P1" | "P2" | "P3";
    updatePrd(prd, gitRepo);

    return `Priority for ticket with ID ${id} updated to ${priority}.`;
  },
});

export const createSubtask = tool({
  description: "Creates a subtask for a given ticket.",
  args: {
    id: tool.schema.string().describe("Id of the parent ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    name: tool.schema.string().min(5).max(250).describe("Name of the subtask"),
    description: tool.schema
      .string()
      .min(5)
      .max(2000)
      .describe("Description of the subtask"),
  },
  async execute({ id, gitRepo, name, description }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Parent ticket with ID ${id} not found.`;
    }

    const status = prd.status;
    if (status !== "Needs Refinement") {
      return `Ticket with ID ${id} is not in a state that allows subtask creation. Current status: ${status}.`;
    }

    const subtaskId = crypto.randomUUID();
    const subtask = {
      id: subtaskId,
      name,
      description,
      status: "Needs Refinement",
      createdAt: new Date().toISOString(),
      targetBranch: prd.featureBranch,
      featureBranch: "",
      worktreeDir: "",
    };

    if (!prd.subtasks) {
      prd.subtasks = [];
    }
    prd.subtasks.push(subtask);
    updatePrd(prd, gitRepo);

    return `Subtask created with ID ${subtaskId} for ticket with ID ${id}. Inherited targetBranch="${prd.featureBranch}" from parent's featureBranch.`;
  },
});

export const deleteSubtask = tool({
  description: "Deletes a subtask from a given ticket.",
  args: {
    id: tool.schema.string().describe("Id of the parent ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    subtaskId: tool.schema.string().describe("Id of the subtask to delete"),
  },
  async execute({ id, gitRepo, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Parent ticket with ID ${id} not found.`;
    }

    if (!prd.subtasks) {
      return `No subtasks found for ticket with ID ${id}.`;
    }

    const status = prd.status;
    if (status !== "Needs Refinement") {
      return `Ticket with ID ${id} is not in a state that allows subtask deletion. Current status: ${status}.`;
    }

    const subtaskIndex = prd.subtasks.findIndex(
      (subtask: any) => subtask.id === subtaskId,
    );
    if (subtaskIndex === -1) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    prd.subtasks.splice(subtaskIndex, 1);
    updatePrd(prd, gitRepo);

    return `Subtask with ID ${subtaskId} deleted from ticket with ID ${id}.`;
  },
});

export const assignWorkspace = tool({
  description:
    "Assigns a feature branch and worktree directory to a ticket or subtask. Used during planning to determine where implementation work will happen.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to assign workspace for"),
    featureBranch: tool.schema
      .string()
      .min(1)
      .max(250)
      .describe("Name of the feature branch to create"),
    worktreeDir: tool.schema
      .string()
      .min(1)
      .max(500)
      .describe("Path to the git worktree directory"),
  },
  async execute({ id, gitRepo, subtaskId, featureBranch, worktreeDir }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Needs Plan" && prd.status !== "Needs Plan Updating") {
      return `Ticket with ID ${id} is not in a state that allows workspace assignment. Current status: ${prd.status}.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return subtaskId
        ? `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`
        : `Ticket with ID ${id} not found.`;
    }

    ticket.featureBranch = featureBranch;
    ticket.worktreeDir = worktreeDir;
    if (subtaskId) {
      ticket.targetBranch = prd.featureBranch;
    }
    updatePrd(prd, gitRepo);

    const target = subtaskId ? `subtask ${subtaskId}` : `ticket ${id}`;
    return `Workspace assigned for ${target}: featureBranch="${featureBranch}", worktreeDir="${worktreeDir}".`;
  },
});

export const refineTicket = tool({
  description:
    "Refines a ticket by updating its required fields (replaces existing so all fields must be provided).",
  args: {
    id: tool.schema.string().describe("Id of the ticket to refine"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to refine - if refining a subtask"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    acceptanceCriterias: tool.schema
      .array(tool.schema.string())
      .min(1)
      .describe("List of acceptance criterias for the ticket"),
    estimation: tool.schema.string().describe("Estimation for the ticket"),
    dependencys: tool.schema
      .array(tool.schema.string())
      .describe("List of dependencies for the ticket - if any"),
    techNotes: tool.schema
      .array(tool.schema.string())
      .describe("Technical notes for the ticket - if any"),
  },
  async execute({
    id,
    gitRepo,
    acceptanceCriterias,
    estimation,
    techNotes,
    dependencys,
    subtaskId,
  }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Needs Refinement") {
      return `Ticket with ID ${id} is not in a state that allows refinement. Current status: ${prd.status}.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    const acCount = acceptanceCriterias.length;
    if (acCount < 3 || acCount > 5) {
      return `Tickets should have 3–5 acceptance criteria. Got ${acCount}. Please split or consolidate.`;
    }

    const implPattern = /\.(tsx?|jsx?|vue|svelte)$|(function|import |ALTER TABLE|CREATE TABLE|INSERT INTO|SELECT .* FROM|node_modules|extends |implements |interface |type )/i;
    const flagged = acceptanceCriterias.filter(ac => implPattern.test(ac));
    if (flagged.length > 0) {
      return `The following acceptance criteria contain implementation details (file paths, function names, SQL). Move these to techNotes:\n${flagged.map(f => `  - ${f}`).join("\n")}`;
    }

    ticket.acceptanceCriterias = acceptanceCriterias;
    ticket.estimation = estimation;
    ticket.techNotes = techNotes;
    ticket.dependencys = dependencys;

    updatePrd(prd, gitRepo);

    return `Ticket with ID ${id} refined successfully -- ${JSON.stringify(prd)}`;
  },
});

export const finalizeRefinement = tool({
  description: "Finalizes the refinement of a ticket, marking it as ready.",
  args: {
    id: tool.schema.string().describe("Id of the ticket to finalize"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
  },
  async execute({ id, gitRepo }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Needs Refinement") {
      return `Ticket with ID ${id} is not in a state that allows finalizing refinement. Current status: ${prd.status}.`;
    }

    // Check if all required fields are filled
    if (
      !prd.acceptanceCriterias ||
      prd.acceptanceCriterias.length === 0 ||
      !prd.estimation
    ) {
      return `Ticket with ID ${id} cannot be finalized. Please ensure all required fields (acceptance criterias and estimation) are filled.`;
    }

    const parentCount = prd.acceptanceCriterias.length;
    if (parentCount < 3 || parentCount > 5) {
      return `Ticket with ID ${id} has ${parentCount} acceptance criteria. Must have 3–5. Please refine before finalizing.`;
    }

    prd.status = "Needs Plan";
    for (const subtask of prd.subtasks || []) {
      if (
        !subtask.acceptanceCriterias ||
        subtask.acceptanceCriterias.length === 0 ||
        !subtask.estimation
      ) {
        return `Subtask with ID ${subtask.id} cannot be finalized. Please ensure all required fields (acceptance criterias and estimation) are filled for all subtasks.`;
      }
      const subCount = subtask.acceptanceCriterias.length;
      if (subCount < 3 || subCount > 5) {
        return `Subtask with ID ${subtask.id} has ${subCount} acceptance criteria. Must have 3–5. Please refine before finalizing.`;
      }
      subtask.status = "Needs Plan";
    }
    updatePrd(prd, gitRepo);

    return `Ticket with ID ${id} finalized and marked as Ready.`;
  },
});

export const savePlan = tool({
  description:
    "Saves an implementation plan for a ticket or subtask. The plan is free-form markdown describing the implementation approach, ordered steps, files to change, and testing strategy. Can also be used to update an existing plan when a ticket is in 'Needs Plan Updating' status.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe(
        "Id of the subtask to save the plan for - if saving for a subtask",
      ),
    plan: tool.schema
      .string()
      .min(10)
      .describe("Free-form markdown implementation plan"),
  },
  async execute({ id, gitRepo, plan, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Needs Plan" && prd.status !== "Needs Plan Updating") {
      return `Ticket with ID ${id} is not in a state that allows saving a plan. Current status: ${prd.status}.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    ticket.plan = plan;
    prd.planIssues = [];
    prd.blockingIssues = [];
    updatePrd(prd, gitRepo);

    const target = subtaskId ? `subtask ${subtaskId}` : `ticket ${id}`;
    return `Plan saved for ${target}.`;
  },
});

export const finalizePlanning = tool({
  description:
    "Finalizes the planning of a ticket, marking it as ready for plan review. Validates that the ticket and all subtasks have a plan before transitioning status. Can also be used to finalize an updated plan when a ticket is in 'Needs Plan Updating' status.",
  args: {
    id: tool.schema.string().describe("Id of the ticket to finalize"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
  },
  async execute({ id, gitRepo }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Needs Plan" && prd.status !== "Needs Plan Updating") {
      return `Ticket with ID ${id} is not in a state that allows finalizing planning. Current status: ${prd.status}.`;
    }

    if (!prd.plan) {
      return `Ticket with ID ${id} cannot be finalized. Please ensure the plan is saved before finalizing.`;
    }

    if (!prd.targetBranch) {
      return `Ticket with ID ${id} cannot be finalized. No target branch set.`;
    }

    if (!prd.featureBranch || !prd.worktreeDir) {
      return `Ticket with ID ${id} cannot be finalized. Please assign a feature branch and worktree dir via assignWorkspace before finalizing.`;
    }

    for (const subtask of prd.subtasks || []) {
      if (!subtask.plan) {
        return `Subtask with ID ${subtask.id} cannot be finalized. Please ensure a plan is saved for all subtasks.`;
      }
      if (!subtask.featureBranch || !subtask.worktreeDir) {
        return `Subtask with ID ${subtask.id} cannot be finalized. Please assign a feature branch and worktree dir via assignWorkspace before finalizing.`;
      }
      if (!subtask.targetBranch) {
        return `Subtask with ID ${subtask.id} cannot be finalized. Target branch not set — assignWorkspace on the subtask should set it to the parent's featureBranch.`;
      }
      if (subtask.targetBranch !== prd.featureBranch) {
        return `Subtask with ID ${subtask.id} targetBranch="${subtask.targetBranch}" does not match parent's featureBranch="${prd.featureBranch}". Re-run assignWorkspace on the subtask to fix.`;
      }
      subtask.status = "Ready Plan Review";
    }

    prd.status = "Ready Plan Review";
    prd.planIteration++;
    updatePrd(prd, gitRepo);

    return `Ticket with ID ${id} finalized and marked as Ready Plan Review.`;
  },
});

export const addPlanIssues = tool({
  description:
    "Records validated issues found during plan review on a ticket or subtask. Accepts both non-blocking issues and blocking issues. Used by finishPlanReview to determine the next status.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to record issues for"),
    issues: tool.schema
      .array(tool.schema.string())
      .describe(
        "List of validated non-blocking issues found during plan review — can be empty",
      ),
    blockingIssues: tool.schema
      .array(tool.schema.string())
      .describe(
        "List of validated blocking issues found during plan review — can be empty",
      ),
  },
  async execute({ id, gitRepo, issues, blockingIssues, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return subtaskId
        ? `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`
        : `Ticket with ID ${id} not found.`;
    }

    if (ticket.status !== "Ready Plan Review") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows adding plan issues. Current status: ${ticket.status}.`;
    }

    ticket.planIssues = issues;
    ticket.blockingIssues = blockingIssues;
    updatePrd(prd, gitRepo);

    const target = subtaskId ? `subtask ${subtaskId}` : `ticket ${id}`;
    return `Plan issues recorded for ${target} (${issues.length} non-blocking, ${blockingIssues.length} blocking).`;
  },
});

export const finishPlanReview = tool({
  description:
    "Finalizes the plan review of a ticket or subtask. Decision logic: blockingIssues + planIteration > 6 → escalate; blockingIssues exist → Needs Plan Updating; planIteration > 3 → force through; planIssues exist → Needs Plan Updating; otherwise → next status. Subtasks use planIteration 0 (no force-through), and always transition to Needs Implementing on clean pass.",
  args: {
    id: tool.schema.string().describe("Id of the ticket to finalize"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to finalize plan review for"),
  },
  async execute({ id, gitRepo, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return subtaskId
        ? `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`
        : `Ticket with ID ${id} not found.`;
    }

    if (ticket.status !== "Ready Plan Review") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows finalizing plan review. Current status: ${ticket.status}.`;
    }

    const hasBlockingIssues =
      ticket.blockingIssues && ticket.blockingIssues.length > 0;
    const hasIssues = ticket.planIssues && ticket.planIssues.length > 0;
    // Subtasks don't track planIteration — default to 0 so they never force-through
    const iteration = subtaskId ? 0 : (prd.planIteration || 0);

    // Blocking issues + max iterations reached → escalate to human
    if (hasBlockingIssues && iteration > 6) {
      ticket.status = "Needs Human Plan Review";
      updatePrd(prd, gitRepo);
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} escalated to Needs Human Plan Review (${ticket.blockingIssues?.length} blocking issues unresolved after ${iteration} iterations).`;
    }

    // Blocking issues exist, still within iteration limit → send back
    if (hasBlockingIssues) {
      ticket.status = "Needs Plan Updating";
      updatePrd(prd, gitRepo);
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} marked as Needs Plan Updating (${ticket.blockingIssues?.length} blocking issues to resolve).`;
    }

    // No blocking issues and past iteration 3 → force through
    if (iteration > 3) {
      const targetStatus = subtaskId
        ? "Needs Implementing"
        : hasSubtasks(prd)
          ? "Needs Subtickets Processed"
          : "Needs Implementing";
      ticket.status = targetStatus;
      updatePrd(prd, gitRepo);
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} finalized and marked as ${targetStatus} (planIteration ${iteration} > 3, no blocking issues).`;
    }

    // Non-blocking issues exist, still in early iterations → send back
    if (hasIssues) {
      const issueCount = ticket.planIssues!.length;
      ticket.status = "Needs Plan Updating";
      updatePrd(prd, gitRepo);
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} marked as Needs Plan Updating (${issueCount} non-blocking issues recorded).`;
    }

    // Clean pass
    const targetStatus = subtaskId
      ? "Needs Implementing"
      : hasSubtasks(prd)
        ? "Needs Subtickets Processed"
        : "Needs Implementing";
    ticket.status = targetStatus;
    updatePrd(prd, gitRepo);
    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;

    return `${label} finalized and marked as ${targetStatus}.`;
  },
});

export const completeImplementation = tool({
  description:
    "Marks implementation as complete, transitioning the ticket to Needs Review. Accepts optional branch name. If subtaskId is provided, marks the subtask as complete.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to mark as complete"),
    branch: tool.schema
      .string()
      .optional()
      .describe("Branch name where the implementation was done"),
  },
  async execute({ id, gitRepo, branch, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (
      ticket.status !== "Needs Implementing" &&
      ticket.status !== "Needs Implementation Update"
    ) {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows completing implementation. Current status: ${ticket.status}.`;
    }

    if (branch && branch.trim() === "") {
      return "Branch name must be non-empty if provided.";
    }

    if (branch) {
      prd.branch = branch;
    }
    ticket.reviewComments = [];
    ticket.qaNotes = [];
    ticket.status = "Needs Review";
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} marked as Needs Review.`;
  },
});

export const reviewImplementation = tool({
  description:
    "Reviews an implemented ticket. If passed, transitions to Needs QA. If failed, transitions to Needs Implementation Update with comments.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to review"),
    passed: tool.schema
      .boolean()
      .describe("Whether the implementation passed review"),
    reviewComments: tool.schema
      .array(tool.schema.string())
      .describe("Review comments — required at least 1 if not passed"),
  },
  async execute({ id, gitRepo, passed, reviewComments, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Needs Review") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows review. Current status: ${ticket.status}.`;
    }

    if (!passed && (!reviewComments || reviewComments.length === 0)) {
      return "Review comments are required when the implementation does not pass review.";
    }

    ticket.reviewComments = reviewComments;
    ticket.status = passed ? "Needs QA" : "Needs Implementation Update";
    updatePrd(prd, gitRepo);

    const outcome = passed ? "Needs QA" : "Needs Implementation Update";
    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} reviewed and marked as ${outcome}.`;
  },
});

export const completeQA = tool({
  description:
    "Completes QA for a ticket. If passed, transitions to Needs PR. If failed, transitions to Needs Implementation Update with QA notes.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to QA"),
    passed: tool.schema.boolean().describe("Whether QA passed"),
    qaNotes: tool.schema
      .array(tool.schema.string())
      .describe("QA notes — required at least 1 if not passed"),
  },
  async execute({ id, gitRepo, passed, qaNotes, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Needs QA") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows QA. Current status: ${ticket.status}.`;
    }

    if (!passed && (!qaNotes || qaNotes.length === 0)) {
      return "QA notes are required when QA does not pass.";
    }

    ticket.qaNotes = qaNotes;
    ticket.status = passed ? "Needs PR" : "Needs Implementation Update";
    updatePrd(prd, gitRepo);

    const outcome = passed ? "Needs PR" : "Needs Implementation Update";
    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} QA completed and marked as ${outcome}.`;
  },
});

export const completePR = tool({
  description:
    "Completes the PR stage. If merged, transitions to Needs Finalizing. If not merged, transitions to Needs Implementation Update (default) or Needs Reapproach (if rejectionType is 'approach').",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask the PR is for"),
    prUrl: tool.schema.string().describe("URL of the pull request"),
    prMerged: tool.schema.boolean().describe("Whether the PR was merged"),
    rejectionType: tool.schema
      .string()
      .optional()
      .describe(
        "When not merged: 'implementation' (default) for code-level rework, 'approach' when the implementation approach was wrong and needs replanning",
      ),
    rejectionNotes: tool.schema
      .string()
      .optional()
      .describe("Required when not merged. Describes why the PR was rejected and what needs to change."),
  },
  async execute({ id, gitRepo, prUrl, prMerged, subtaskId, rejectionType, rejectionNotes }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Needs PR") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows completing a PR. Current status: ${ticket.status}.`;
    }

    if (!prUrl || prUrl.trim() === "") {
      return "PR URL is required.";
    }

    if (!prMerged && (!rejectionNotes || rejectionNotes.trim() === "")) {
      return "Rejection notes are required when the PR is not merged.";
    }

    if (!prMerged && rejectionType && !["implementation", "approach"].includes(rejectionType)) {
      return `Invalid rejectionType: "${rejectionType}". Must be "implementation" or "approach".`;
    }

    ticket.prUrl = prUrl;
    ticket.prMerged = prMerged;
    ticket.rejectionNotes = prMerged ? undefined : (rejectionNotes || "");

    if (prMerged) {
      ticket.status = "Needs Finalizing";
    } else if (rejectionType === "approach") {
      ticket.status = "Needs Reapproach";
    } else {
      ticket.status = "Needs Implementation Update";
    }

    updatePrd(prd, gitRepo);

    const outcome = ticket.status;
    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} PR completed and marked as ${outcome}.`;
  },
});

export const finalizeReapproach = tool({
  description:
    "Finalizes the reapproach process. Marks the ticket as Needs Plan Updating so a new plan can be created.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to finalize reapproach for"),
  },
  async execute({ id, gitRepo, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Needs Reapproach") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows finalizing reapproach. Current status: ${ticket.status}.`;
    }

    ticket.status = "Needs Plan Updating";
    ticket.planIssues = undefined;
    ticket.blockingIssues = undefined;
    if (!subtaskId) {
      prd.planIteration = 0;
    }
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} reapproach finalized and marked as Needs Plan Updating.`;
  },
});

export const finalizeTicket = tool({
  description:
    "Finalizes a ticket, transitioning it to Done. This is the final stage of the ticket lifecycle.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to finalize"),
  },
  async execute({ id, gitRepo, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Needs Finalizing") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not in a state that allows finalizing. Current status: ${ticket.status}.`;
    }

    if (!subtaskId && prd.subtasks?.length) {
      const undone = prd.subtasks.filter(s => s.status !== "Done");
      if (undone.length > 0) {
        return `Cannot finalize parent ticket: subtasks [${undone.map(s => s.id).join(", ")}] are not Done. Complete or cancel all subtasks first.`;
      }
    }

    ticket.status = "Done";

    // If a subtask was finalized and parent is waiting on subtickets, check if all are Done
    if (subtaskId && prd.status === "Needs Subtickets Processed") {
      const allDone = prd.subtasks!.every(s => s.status === "Done");
      if (allDone) {
        prd.status = "Needs Implementing";
        updatePrd(prd, gitRepo);
        const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
        return `${label} finalized and marked as Done. All subtasks complete — parent ticket ${id} advanced to Needs Implementing.`;
      }
    }

    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} finalized and marked as Done.`;
  },
});

export const blockTicket = tool({
  description:
    "Blocks a ticket, saving its current status and storing the reason. The ticket will stay in Blocked until unblockTicket is called.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to block"),
    blockedReason: tool.schema
      .string()
      .describe("Reason the ticket is blocked — what external dependency is it waiting on?"),
  },
  async execute({ id, gitRepo, blockedReason, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    const terminalStatuses = ["Done", "Cancelled"];
    if (terminalStatuses.includes(ticket.status)) {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is in a terminal state (${ticket.status}) and cannot be blocked.`;
    }

    if (ticket.status === "Blocked") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is already blocked.`;
    }

    if (!blockedReason || blockedReason.trim() === "") {
      return "Blocked reason is required.";
    }

    ticket.previousStatus = ticket.status;
    ticket.blockedReason = blockedReason;
    ticket.status = "Blocked";
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} blocked. Reason: ${blockedReason}`;
  },
});

export const unblockTicket = tool({
  description:
    "Unblocks a ticket, restoring it to the status it had before being blocked. Clears blockedReason and previousStatus.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to unblock"),
  },
  async execute({ id, gitRepo, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    if (ticket.status !== "Blocked" && ticket.status !== "Needs Human Unblock") {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is not currently blocked.`;
    }

    if (!ticket.previousStatus) {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is blocked but has no previous status recorded. Use escalate instead.`;
    }

    const restoredStatus = ticket.previousStatus;
    ticket.status = restoredStatus;
    ticket.previousStatus = undefined;
    ticket.blockedReason = undefined;
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} unblocked. Status restored to ${restoredStatus}.`;
  },
});

export const cancelTicket = tool({
  description:
    "Cancels a ticket or subtask from any non-terminal status, moving it to Cancelled. Requires a reason.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask to cancel"),
    reason: tool.schema.string().describe("Reason for cancellation"),
  },
  async execute({ id, gitRepo, reason, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    const ticket = subtaskId
      ? prd.subtasks?.find((subtask: any) => subtask.id === subtaskId)
      : prd;
    if (!ticket) {
      return `Subtask with ID ${subtaskId} not found in ticket with ID ${id}.`;
    }

    const terminalStatuses = ["Done", "Cancelled"];
    if (terminalStatuses.includes(ticket.status)) {
      const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
      return `${label} is already in a terminal state (${ticket.status}) and cannot be cancelled.`;
    }

    if (!reason || reason.trim() === "") {
      return "Cancellation reason is required.";
    }

    ticket.status = "Cancelled";
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} cancelled. Reason: ${reason}`;
  },
});

export const addSuggestion = tool({
  description:
    "Adds an out-of-scope observation (suggestion) to a ticket. Call this when you find something worth fixing that is outside the ticket's acceptance criteria. Suggestions are surfaced in the PR description as 'Things to consider before merging'.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    message: tool.schema
      .string()
      .min(10)
      .max(500)
      .describe("The suggestion message describing the out-of-scope observation"),
    source: tool.schema
      .string()
      .describe("Source of the suggestion: planning, implementation, review, or qa"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask if the suggestion originates from a subtask"),
  },
  async execute({ id, gitRepo, message, source, subtaskId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }
    if (!["planning", "implementation", "review", "qa"].includes(source)) {
      return `Invalid source: ${source}. Must be one of: planning, implementation, review, qa.`;
    }
    if (!prd.suggestions) {
      prd.suggestions = [];
    }
    const suggestion = {
      suggestionId: crypto.randomUUID(),
      message,
      source,
      createdAt: new Date().toISOString(),
    };
    prd.suggestions.push(suggestion);
    updatePrd(prd, gitRepo);
    return `Suggestion added with ID ${suggestion.suggestionId}.`;
  },
});

export const resolveSuggestion = tool({
  description:
    "Marks a suggestion as resolved (e.g., because it was fixed during implementation). Resolved suggestions appear under 'Items resolved during implementation' in the PR instead of 'Things to consider before merging'.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    suggestionId: tool.schema
      .string()
      .describe("Id of the suggestion to mark as resolved"),
  },
  async execute({ id, gitRepo, suggestionId }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }
    if (!prd.suggestions) {
      return `No suggestions found for ticket with ID ${id}.`;
    }
    const suggestion = prd.suggestions.find(
      (s: any) => s.suggestionId === suggestionId,
    );
    if (!suggestion) {
      return `Suggestion with ID ${suggestionId} not found.`;
    }
    if (suggestion.resolvedAt) {
      return `Suggestion with ID ${suggestionId} is already resolved.`;
    }
    suggestion.resolvedAt = new Date().toISOString();
    updatePrd(prd, gitRepo);
    return `Suggestion with ID ${suggestionId} marked as resolved.`;
  },
});

export const addDeviation = tool({
  description:
    "Records a deviation from the implementation plan. Call this when you intentionally skip or replace a planned step. Deviations are evaluated during review and QA before being included in the PR.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    planItem: tool.schema
      .string()
      .min(5)
      .max(250)
      .describe("The plan item that was intentionally not followed"),
    action: tool.schema
      .string()
      .describe("Whether the plan item was omitted or replaced"),
    reason: tool.schema
      .string()
      .min(10)
      .max(500)
      .describe("Why the deviation was necessary"),
    replacement: tool.schema
      .string()
      .optional()
      .describe("What was done instead (if action is 'replaced')"),
  },
  async execute({ id, gitRepo, planItem, action, reason, replacement }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }
    if (!["omitted", "replaced"].includes(action)) {
      return `Invalid action: ${action}. Must be 'omitted' or 'replaced'.`;
    }
    if (!prd.deviations) {
      prd.deviations = [];
    }
    const deviation = {
      deviationId: crypto.randomUUID(),
      planItem,
      action,
      replacement,
      reason,
      createdAt: new Date().toISOString(),
    };
    prd.deviations.push(deviation);
    updatePrd(prd, gitRepo);
    return `Deviation recorded with ID ${deviation.deviationId}. This deviation must be reviewed during the Review stage.`;
  },
});

export const reviewDeviation = tool({
  description:
    "Reviews a recorded deviation during the Review stage. If rejected, the deviation must be addressed before the ticket can proceed.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    deviationId: tool.schema
      .string()
      .describe("Id of the deviation to review"),
    accepted: tool.schema
      .boolean()
      .describe("Whether the deviation is acceptable"),
    comment: tool.schema
      .string()
      .optional()
      .describe("Optional comment explaining the review decision"),
  },
  async execute({ id, gitRepo, deviationId, accepted, comment }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }
    if (!prd.deviations) {
      return `No deviations found for ticket with ID ${id}.`;
    }
    const deviation = prd.deviations.find(
      (d: any) => d.deviationId === deviationId,
    );
    if (!deviation) {
      return `Deviation with ID ${deviationId} not found.`;
    }
    if (deviation.reviewResult) {
      return `Deviation with ID ${deviationId} has already been reviewed.`;
    }
    deviation.reviewResult = { accepted, comment };
    updatePrd(prd, gitRepo);
    const outcome = accepted ? "accepted" : "rejected";
    return `Deviation with ID ${deviationId} reviewed and ${outcome}.`;
  },
});

export const qaDeviation = tool({
  description:
    "Validates a deviation during the QA stage. Confirms the deviation didn't break anything.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    deviationId: tool.schema
      .string()
      .describe("Id of the deviation to QA"),
    validated: tool.schema
      .boolean()
      .describe("Whether QA validates the deviation is safe"),
    comment: tool.schema
      .string()
      .optional()
      .describe("Optional comment explaining the QA decision"),
  },
  async execute({ id, gitRepo, deviationId, validated, comment }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }
    if (!prd.deviations) {
      return `No deviations found for ticket with ID ${id}.`;
    }
    const deviation = prd.deviations.find(
      (d: any) => d.deviationId === deviationId,
    );
    if (!deviation) {
      return `Deviation with ID ${deviationId} not found.`;
    }
    if (!deviation.reviewResult) {
      return `Deviation with ID ${deviationId} has not been reviewed yet. Cannot QA before review.`;
    }
    if (deviation.qaResult) {
      return `Deviation with ID ${deviationId} has already been QA'd.`;
    }
    deviation.qaResult = { validated, comment };
    updatePrd(prd, gitRepo);
    const outcome = validated ? "validated" : "flagged";
    return `Deviation with ID ${deviationId} QA'd and ${outcome}.`;
  },
});
