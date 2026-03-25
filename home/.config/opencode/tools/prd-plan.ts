import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

function getPrdsFolder(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\prds";
}

type Prd = {
  title: string;
  description: string;
  status: PrdStatus;
  userStories: UserStory[];
};

type PrdStatus = "draft" | "ready" | "in-progress" | "blocked" | "completed";

type UserStory = {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  blocked: boolean;
  blockReason?: string;
  dependencyIds: string[];
  acceptanceCriteria: string[];
  potentialIssues: string[];
  status: UserStoryStatus;
  progress: TaskProgress;
};

type UserStoryStatus =
  | "draft"
  | "refinement"
  | "ready"
  | "in-progress"
  | "completed";

type TaskProgress = {
  research: TaskProgressStep<1>;
  planning: TaskProgressStep<2>;
  implementation: TaskProgressStep<3>;
  codeReview: TaskProgressStep<4>;
  testing: TaskProgressStep<5>;
  finalReview: TaskProgressStep<6>;
  merge: TaskProgressStep<7>;
};

type TaskProgressStep<T extends number> = {
  order: T;
  assignedTo: string;
  status:
    | "needs-refinement"
    | "not-started"
    | "in-progress"
    | "in-review"
    | "completed";
  reviewers: string[];
  evidenceDocs: Doc[];
  historyDocs: Doc[];
  notes: string[];
};

type Doc = {
  title: string;
  url: string;
  old: boolean;
};

function listPrds(gitRepo?: string): {
  name: string;
  description: string;
  status: string;
  userStories: number;
}[] {
  const prdsFolder = getPrdsFolder();
  if (!fs.existsSync(prdsFolder)) {
    return [];
  }
  const prdFiles = fs
    .readdirSync(prdsFolder)
    .filter((file) => file.endsWith(".prd.json"))
    .filter((file) => {
      if (!gitRepo) return true;
      return file.toLowerCase().startsWith(gitRepo.toLowerCase() + "__");
    });
  return prdFiles.map((file) => {
    const content = fs.readFileSync(path.join(prdsFolder, file), "utf-8");
    const prd = new Function(`return (${content})`)();
    return {
      name: prd.title || path.basename(file, ".json"),
      description: prd.description || "No description available.",
      status: prd.status || "unknown",
      userStories: prd.userStories ? prd.userStories.length : 0,
    };
  });
}

function getPrd(gitRepo: string, prdName: string): Prd | null {
  const prds = listPrds(gitRepo);
  const prdInfo = prds.find(
    (p) => p.name.toLowerCase() === prdName.toLowerCase(),
  );
  if (!prdInfo) {
    return null;
  }
  const sanitizedPrdName = prdName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const expectedFileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
  const prdFile = fs
    .readdirSync(getPrdsFolder())
    .find((file) => file.toLowerCase() === expectedFileName.toLowerCase());
  if (!prdFile) {
    return null;
  }
  const content = fs.readFileSync(path.join(getPrdsFolder(), prdFile), "utf-8");
  return new Function(`return (${content})`)();
}

export const listPrdsTool = tool({
  description:
    "Lists all Product Requirement Documents (PRDs) in the system with their descriptions.",
  args: {
    gitRepo: tool.schema
      .string()
      .optional()
      .describe(
        "The name of the Git repository to filter PRDs by. If not provided, lists all PRDs.",
      ),
  },
  async execute({ gitRepo }) {
    const prds = listPrds(gitRepo);
    return JSON.stringify(prds, null, 2);
  },
});

export const getPrdTool = tool({
  description: "Retrieves the details of a specific PRD by name.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository this PRD is associated with. This will be used to locate the PRD file.",
      ),
    prdName: tool.schema.string().describe("The name of the PRD to retrieve"),
  },
  async execute({ prdName, gitRepo }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    return JSON.stringify(prd, null, 2);
  },
});

export const createPrdTool = tool({
  description: "Creates a new PRD with the given name and description.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository this PRD is associated with. This will be used as a prefix for the PRD file.",
      ),
    name: tool.schema.string().describe("The name of the PRD to create"),
    description: tool.schema
      .string()
      .describe("A brief description of the PRD"),
  },
  async execute({ name, description, gitRepo }) {
    const prdsFolder = getPrdsFolder();
    if (!fs.existsSync(prdsFolder)) {
      fs.mkdirSync(prdsFolder, { recursive: true });
    }
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedName}.prd.json`;
    const prd: Prd = {
      title: name,
      description,
      status: "draft",
      userStories: [],
    };
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(prd, null, 2);
  },
});

export const addUserStoryTool = tool({
  description: "Adds a new user story to an existing PRD.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository this PRD is associated with. This will be used to locate the PRD file.",
      ),
    prdName: tool.schema
      .string()
      .describe("The name of the PRD to add the user story to"),
    title: tool.schema.string().describe("The title of the user story"),
    description: tool.schema
      .string()
      .describe("A brief description of the user story"),
    longDescription: tool.schema
      .string()
      .describe(
        "A detailed description of the user story, including any relevant context or background information.",
      ),
  },
  async execute({ prdName, title, description, gitRepo, longDescription }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    function getUniqueUserStoryId(): string {
      const existingIds = new Set(prd!.userStories.map((us) => us.id));
      let newId = "Task-001";
      let i = 1;
      while (true) {
        newId = `Task-${i.toString().padStart(3, "0")}`;
        if (!existingIds.has(newId)) {
          break;
        }
        i++;
      }
      return newId;
    }
    const newUserStory: UserStory = {
      id: getUniqueUserStoryId(),
      title,
      description,
      longDescription,
      blocked: false,
      dependencyIds: [],
      acceptanceCriteria: [],
      potentialIssues: [],
      status: "draft",
      progress: {
        research: {
          order: 1,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        planning: {
          order: 2,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        implementation: {
          order: 3,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        codeReview: {
          order: 4,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        testing: {
          order: 5,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        finalReview: {
          order: 6,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
        merge: {
          order: 7,
          assignedTo: "",
          status: "needs-refinement",
          reviewers: [],
          evidenceDocs: [],
          historyDocs: [],
          notes: [],
        },
      },
    };
    prd.userStories.push(newUserStory);
    const prdsFolder = getPrdsFolder();
    const sanitizedPrdName = prdName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(newUserStory, null, 2);
  },
});

export const moveUserStoryOutOfDraftTool = tool({
  description:
    "Moves a user story out of draft status to 'refinement'. Only works if the user story has a title and description.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe(
        "The name of the Git repository this PRD is associated with. This will be used to locate the PRD file.",
      ),
    prdName: tool.schema
      .string()
      .describe("The name of the PRD that contains the user story"),
    userStoryId: tool.schema
      .string()
      .describe("The ID of the user story to move out of draft"),
  },
  async execute({ prdName, userStoryId, gitRepo }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    const userStory = prd.userStories.find((us) => us.id === userStoryId);
    if (!userStory) {
      throw new Error(
        `User story with ID "${userStoryId}" not found in PRD "${prdName}".`,
      );
    }
    if (userStory.status !== "draft") {
      throw new Error(
        `User story "${userStory.title}" is not in draft status. Only user stories in draft can be moved to refinement.`,
      );
    }
    if (
      !userStory.title ||
      !userStory.description ||
      !userStory.longDescription
    ) {
      throw new Error(
        `User story "${userStory.title}" must have a title, description, and long description before moving out of draft.`,
      );
    }
    userStory.status = "refinement";
    const prdsFolder = getPrdsFolder();
    const sanitizedPrdName = prdName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(
      {
        success: true,
        userStory,
        message: `User story "${userStory.title}" has been moved from draft to refinement.`,
      },
      null,
      2,
    );
  },
});

export const movePrdOutOfDraftTool = tool({
  description:
    "Moves a PRD out of draft status to 'ready'. Only works if the PRD has at least one user story. And all user stories must be at least in refinement status.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe("The name of the Git repository this PRD is associated with."),
    prdName: tool.schema
      .string()
      .describe("The name of the PRD to move out of draft"),
  },
  async execute({ prdName, gitRepo }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    if (prd.userStories.length === 0) {
      throw new Error(
        `PRD "${prdName}" must have at least one user story before moving out of draft.`,
      );
    }
    if (prd.status !== "draft") {
      throw new Error(
        `PRD "${prdName}" is not in draft status. Only PRDs in draft can be moved to ready.`,
      );
    }
    prd.status = "ready";
    prd.userStories.forEach((us) => {
      if (us.status === "draft") {
        throw new Error(
          `User story "${us.title}" is still in draft status. All user stories must be at least in refinement before moving the PRD out of draft.`,
        );
      }
    });
    const prdsFolder = getPrdsFolder();
    const sanitizedPrdName = prdName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(
      {
        success: true,
        prd,
        message: `PRD "${prdName}" has been moved from draft to refinement.`,
      },
      null,
      2,
    );
  },
});

function checkForCircularDependency(
  userStories: UserStory[],
  userStoryId: string,
  dependsOnId: string,
): boolean {
  const visited = new Set<string>();
  const stack = [dependsOnId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === userStoryId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const currentStory = userStories.find((us) => us.id === current);
    if (currentStory) {
      stack.push(...currentStory.dependencyIds);
    }
  }
  return false;
}

export const addTaskDependencyTool = tool({
  description:
    "Adds a dependency relationship between two user stories in a PRD. The first task (userStoryId) will depend on the second task (dependsOnId).",
  args: {
    gitRepo: tool.schema
      .string()
      .describe("The name of the Git repository this PRD is associated with."),
    prdName: tool.schema
      .string()
      .describe("The name of the PRD that contains the user stories"),
    userStoryId: tool.schema
      .string()
      .describe("The ID of the user story that will have the dependency"),
    dependsOnId: tool.schema
      .string()
      .describe("The ID of the user story being depended on"),
  },
  async execute({ prdName, userStoryId, dependsOnId, gitRepo }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    const userStory = prd.userStories.find((us) => us.id === userStoryId);
    if (!userStory) {
      throw new Error(
        `User story with ID "${userStoryId}" not found in PRD "${prdName}".`,
      );
    }
    const dependsOnStory = prd.userStories.find((us) => us.id === dependsOnId);
    if (!dependsOnStory) {
      throw new Error(
        `User story with ID "${dependsOnId}" not found in PRD "${prdName}".`,
      );
    }
    if (userStoryId === dependsOnId) {
      throw new Error("A user story cannot depend on itself.");
    }
    if (checkForCircularDependency(prd.userStories, userStoryId, dependsOnId)) {
      throw new Error(
        `Adding this dependency would create a circular dependency.`,
      );
    }
    if (userStory.dependencyIds.includes(dependsOnId)) {
      throw new Error(
        `User story "${userStoryId}" already depends on "${dependsOnId}".`,
      );
    }
    userStory.dependencyIds.push(dependsOnId);
    const prdsFolder = getPrdsFolder();
    const sanitizedPrdName = prdName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(
      {
        success: true,
        userStoryId,
        dependsOnId,
        message: `User story "${userStoryId}" now depends on "${dependsOnId}".`,
      },
      null,
      2,
    );
  },
});

export const removeTaskDependencyTool = tool({
  description:
    "Removes a dependency relationship between two user stories in a PRD.",
  args: {
    gitRepo: tool.schema
      .string()
      .describe("The name of the Git repository this PRD is associated with."),
    prdName: tool.schema
      .string()
      .describe("The name of the PRD that contains the user stories"),
    userStoryId: tool.schema
      .string()
      .describe("The ID of the user story to remove the dependency from"),
    dependsOnId: tool.schema
      .string()
      .describe("The ID of the user story to remove as a dependency"),
  },
  async execute({ prdName, userStoryId, dependsOnId, gitRepo }) {
    const prd = getPrd(gitRepo, prdName);
    if (!prd) {
      throw new Error(`PRD with name "${prdName}" not found.`);
    }
    const userStory = prd.userStories.find((us) => us.id === userStoryId);
    if (!userStory) {
      throw new Error(
        `User story with ID "${userStoryId}" not found in PRD "${prdName}".`,
      );
    }
    if (!userStory.dependencyIds.includes(dependsOnId)) {
      throw new Error(
        `User story "${userStoryId}" does not depend on "${dependsOnId}".`,
      );
    }
    userStory.dependencyIds = userStory.dependencyIds.filter(
      (id) => id !== dependsOnId,
    );
    const prdsFolder = getPrdsFolder();
    const sanitizedPrdName = prdName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${gitRepo}__${sanitizedPrdName}.prd.json`;
    fs.writeFileSync(
      path.join(prdsFolder, fileName),
      JSON.stringify(prd, null, 2),
    );
    return JSON.stringify(
      {
        success: true,
        userStoryId,
        dependsOnId,
        message: `Dependency "${dependsOnId}" removed from user story "${userStoryId}".`,
      },
      null,
      2,
    );
  },
});
