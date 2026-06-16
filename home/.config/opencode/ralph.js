const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PRDS_DIR = path.join(__dirname, "prds");

function runAsync(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [], { stdio: "inherit", shell: true });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function findAndProcess(repoName) {
  let files;
  try {
    files = fs.readdirSync(PRDS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`Cannot read PRDs directory: ${PRDS_DIR}`);
    process.exit(1);
  }

  const candidates = [];
  for (const file of files) {
    const content = JSON.parse(
      fs.readFileSync(path.join(PRDS_DIR, file), "utf-8"),
    );
    if (content.gitRepo === repoName) {
      candidates.push(content);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const prd of candidates) {
    if (!prd.status.toLowerCase().includes("human")) {
      return prd;
    }
  }

  return null;
}

async function main() {
  const repoName = process.argv[2];
  if (!repoName) {
    console.error("Usage: node ralph.js <repo-name>");
    process.exit(1);
  }

  let processed = 0;
  while (true) {
    const prd = await findAndProcess(repoName);
    if (!prd) {
      break;
    }

    const cmd = `opencode --agent "Scrum Master" run "process ticket -- id - ${prd.id} repo - ${repoName}" --pure true`;
    console.log(
      `\n--- Processing: ${prd.id} - ${prd.name} (${prd.status}) ---`,
    );
    console.log(`Running: ${cmd}\n`);

    try {
      await runAsync(cmd);
      processed++;
    } catch (err) {
      console.error(`Command failed for ${prd.id}: ${err.message}`);
    }
  }

  if (processed === 0) {
    console.log(`No non-human PRDs found for "${repoName}"`);
  } else {
    console.log(`\nDone. Processed ${processed} ticket(s) for "${repoName}".`);
  }
}

main();
