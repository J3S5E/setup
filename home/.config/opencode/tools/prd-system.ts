import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

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
  acceptanceCriterias?: string[];
  estimation?: string;
  techNotes?: string[];
  dependencys?: string[];
  plan?: string;
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
};

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
      .min(50)
      .max(500)
      .optional()
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
  },
  async execute({ gitRepo, name, description, id, targetBranch }) {
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

    //// TODO: find current state to assign the right escalation status.
    const status = prdData.status;
    if (status === "Needs Refinement") {
      if (
        prdData.acceptanceCriterias &&
        prdData.acceptanceCriterias.length > 0
      ) {
        prdData.status = "Needs Human Refinement finalization";
      } else {
        prdData.status = "Needs Human Title and Description refinement";
      }
    } else if (status === "Needs Plan") {
      if (prdData.plan) {
        prdData.status = "Needs Human Plan finalization";
      } else {
        prdData.status = "Needs Human Plan creation";
      }
    } else if (status === "Ready Plan Review") {
      prdData.status = "Needs Human Plan Review";
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
      .max(500)
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
      .max(500)
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

    prd.status = "Needs Plan";
    for (const subtask of prd.subtasks || []) {
      if (
        !subtask.acceptanceCriterias ||
        subtask.acceptanceCriterias.length === 0 ||
        !subtask.estimation
      ) {
        return `Subtask with ID ${subtask.id} cannot be finalized. Please ensure all required fields (acceptance criterias and estimation) are filled for all subtasks.`;
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
    "Records validated issues found during plan review on a ticket. Accepts both non-blocking issues and blocking issues. Used by finishPlanReview to determine the next status.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
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
  async execute({ id, gitRepo, issues, blockingIssues }) {
    const prd = getPrd(id, gitRepo);
    if (!prd) {
      return `Ticket with ID ${id} not found.`;
    }

    if (prd.status !== "Ready Plan Review") {
      return `Ticket with ID ${id} is not in a state that allows adding plan issues. Current status: ${prd.status}.`;
    }

    prd.planIssues = issues;
    prd.blockingIssues = blockingIssues;
    updatePrd(prd, gitRepo);

    return `Plan issues recorded for ticket with ID ${id} (${issues.length} non-blocking, ${blockingIssues.length} blocking).`;
  },
});

export const finishPlanReview = tool({
  description:
    "Finalizes the plan review of a ticket. Decision logic: blockingIssues + planIteration > 6 → escalate; blockingIssues exist → Needs Plan Updating; planIteration > 3 → Needs Implementing (force through); planIssues exist → Needs Plan Updating; otherwise → Needs Implementing.",
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

    if (prd.status !== "Ready Plan Review") {
      return `Ticket with ID ${id} is not in a state that allows finalizing plan review. Current status: ${prd.status}.`;
    }

    const hasBlockingIssues =
      prd.blockingIssues && prd.blockingIssues.length > 0;
    const hasIssues = prd.planIssues && prd.planIssues.length > 0;
    const iteration = prd.planIteration;

    // Blocking issues + max iterations reached → escalate to human
    if (hasBlockingIssues && iteration > 6) {
      prd.status = "Needs Human Plan Review";
      updatePrd(prd, gitRepo);
      return `Ticket with ID ${id} escalated to Needs Human Plan Review (${prd.blockingIssues?.length} blocking issues unresolved after ${iteration} iterations).`;
    }

    // Blocking issues exist, still within iteration limit → send back
    if (hasBlockingIssues) {
      prd.status = "Needs Plan Updating";
      updatePrd(prd, gitRepo);
      return `Ticket with ID ${id} marked as Needs Plan Updating (${prd.blockingIssues?.length} blocking issues to resolve).`;
    }

    // No blocking issues and past iteration 3 → force through
    if (iteration > 3) {
      prd.status = "Needs Implementing";
      updatePrd(prd, gitRepo);
      return `Ticket with ID ${id} finalized and marked as Needs Implementing (planIteration ${iteration} > 3, no blocking issues).`;
    }

    // Non-blocking issues exist, still in early iterations → send back
    if (hasIssues) {
      const issueCount = prd.planIssues!.length;
      prd.status = "Needs Plan Updating";
      updatePrd(prd, gitRepo);
      return `Ticket with ID ${id} marked as Needs Plan Updating (${issueCount} non-blocking issues recorded).`;
    }

    // Clean pass
    prd.status = "Needs Implementing";
    updatePrd(prd, gitRepo);

    return `Ticket with ID ${id} finalized and marked as Needs Implementing.`;
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
    "Completes the PR stage. If merged, transitions to Needs Finalizing. If not merged, transitions back to Needs Implementation Update for rework.",
  args: {
    id: tool.schema.string().describe("Id of the ticket"),
    gitRepo: tool.schema.string().describe("The Git repository name"),
    subtaskId: tool.schema
      .string()
      .optional()
      .describe("Id of the subtask the PR is for"),
    prUrl: tool.schema.string().describe("URL of the pull request"),
    prMerged: tool.schema.boolean().describe("Whether the PR was merged"),
  },
  async execute({ id, gitRepo, prUrl, prMerged, subtaskId }) {
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

    ticket.prUrl = prUrl;
    ticket.prMerged = prMerged;
    ticket.status = prMerged
      ? "Needs Finalizing"
      : "Needs Implementation Update";
    updatePrd(prd, gitRepo);

    const outcome = prMerged
      ? "Needs Finalizing"
      : "Needs Implementation Update";
    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} PR completed and marked as ${outcome}.`;
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

    ticket.status = "Done";
    updatePrd(prd, gitRepo);

    const label = subtaskId ? `Subtask ${subtaskId}` : `Ticket ${id}`;
    return `${label} finalized and marked as Done.`;
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
