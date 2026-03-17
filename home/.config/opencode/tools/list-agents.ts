import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

interface Agent {
  name: string;
  description: string;
}

function getAgentsFolder(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\agents";
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return frontmatter;
}

function listAgents(): Agent[] {
  const agentsPath = getAgentsFolder();

  if (!fs.existsSync(agentsPath)) {
    throw new Error(`Agents folder not found: ${agentsPath}`);
  }

  const files = fs.readdirSync(agentsPath).filter((f) => f.endsWith(".md"));
  const agents: Agent[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(agentsPath, file), "utf-8");
    const frontmatter = parseFrontmatter(content);

    if (
      frontmatter.mode === "subagent" &&
      frontmatter.hidden !== "true" &&
      frontmatter.name &&
      frontmatter.description
    ) {
      agents.push({
        name: frontmatter.name,
        description: frontmatter.description,
      });
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

export const listAgentsTool = tool({
  description: "Lists all agents in the system",
  args: {},
  async execute() {
    const agents = listAgents();
    return JSON.stringify(agents, null, 2);
  },
});
