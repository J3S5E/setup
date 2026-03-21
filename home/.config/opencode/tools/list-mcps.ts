import { tool } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

function getOpencodeSettingsJson(): string {
  return "C:\\GIT\\setup\\home\\.config\\opencode\\opencode.json";
}

function listMcps(): string[] {
  const settingsJsonPath = getOpencodeSettingsJson();
  console.error("[listMcps] Path:", settingsJsonPath);

  if (!fs.existsSync(settingsJsonPath)) {
    throw new Error(`opencode.json not found: ${settingsJsonPath}`);
  }

  const settingsContent = fs.readFileSync(settingsJsonPath, "utf-8");

  // Parse as JavaScript object literal using Function constructor (avoids JSON.parse)
  const config = new Function(`return (${settingsContent})`)();
  return Object.keys(config.mcp || {});
}
// example return ["context7", "browsermvp"]

export const listMcpsTool = tool({
  description:
    "Lists all available MCPs (Multi-Context Programs) in the system.",
  args: {},
  async execute() {
    const mcps = listMcps();
    return JSON.stringify(mcps, null, 2);
  },
});
