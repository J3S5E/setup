import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

interface McpEntry {
  name: string;
  description: string;
  type: string;
}

function getOpencodeSettingsJson(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\opencode.json";
}

function getToolsFolder(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\tools";
}

function readMcpRegistry(): Record<string, string> {
  const registryPath = path.join(getToolsFolder(), "mcp-registry.json");
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, "utf-8");
    return new Function(`return (${content})`)();
  }
  return {};
}

function listMcps(): McpEntry[] {
  const settingsJsonPath = getOpencodeSettingsJson();

  if (!fs.existsSync(settingsJsonPath)) {
    throw new Error(`opencode.json not found: ${settingsJsonPath}`);
  }

  const settingsContent = fs.readFileSync(settingsJsonPath, "utf-8");
  const config = new Function(`return (${settingsContent})`)();
  const registry = readMcpRegistry();

  return Object.entries(config.mcp || {}).map(([name, mcp]) => ({
    name,
    description: registry[name] || "No description available. Add one to tools/mcp-registry.json",
    type: (mcp as { type?: string }).type || "unknown",
  }));
}

export const listMcpsTool = tool({
  description:
    "Lists all available MCPs (Multi-Context Programs) in the system with their descriptions.",
  args: {},
  async execute() {
    const mcps = listMcps();
    return JSON.stringify(mcps, null, 2);
  },
});
