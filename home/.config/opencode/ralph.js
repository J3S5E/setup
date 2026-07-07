const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PRDS_DIR = path.join(__dirname, "prds");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const ticketStatusTracker = new Map();

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

  const prds = candidates.filter(
    (prd) => !prd.status.toLowerCase().includes("human"),
  );

  if (prds.length === 0) {
    return null;
  }

  for (let i = prds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prds[i], prds[j]] = [prds[j], prds[i]];
  }

  // Get the last processed ticket ID from the tracker
  for (const prd of prds) {
    const lastStatus = ticketStatusTracker.get(prd.id)?.status;
    if (lastStatus !== prd.status) {
      ticketStatusTracker.set(prd.id, {
        status: prd.status,
        retryCount: 0,
      });
      return prd;
    }
  }

  // Weighted random selection prioritizing tickets with lowest retry count
  const weights = prds.map((prd) => {
    const tracker = ticketStatusTracker.get(prd.id);
    const weight = 1 / ((tracker?.retryCount ?? 0) + 1);
    return { prd, weight, tracker };
  });
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const { prd, weight, tracker } of weights) {
    r -= weight;
    if (r > 0) continue;

    if (!tracker) {
      ticketStatusTracker.set(prd.id, { status: prd.status, retryCount: 0 });
      return prd;
    }

    const seconds = Math.min(Math.pow(4, tracker.retryCount), 600);
    console.log(`[ralph] ${prd.id} cooling down — skipping for ${seconds}s (retry #${tracker.retryCount})`);
    await sleep(seconds * 1000);
    tracker.retryCount += 1;
    ticketStatusTracker.set(prd.id, tracker);
    return prd;
  }

  return null;
}

async function main() {
  const repoName = process.argv[2];
  if (!repoName) {
    console.error("Usage: node ralph.js <repo-name>");
    process.exit(1);
  }

  let heartbeatCount = 0;
  while (true) {
    const prd = await findAndProcess(repoName);

    if (!prd) {
      const seconds = 5;
      heartbeatCount++;
      if (heartbeatCount % 6 === 0) {
        console.log(`[ralph] Alive — waiting for tickets...`);
      }
      await sleep(seconds * 1000);
      continue;
    }

    const cmd = `opencode --agent "Scrum Master" run "process ticket -- id - ${prd.id} repo - ${repoName}" --pure true`;
    console.log(
      `\n--- Processing: ${prd.id} - ${prd.name} (${prd.status}) ---`,
    );
    console.log(`Running: ${cmd}\n`);

    try {
      await runAsync(cmd);
    } catch (err) {
      console.error(`Command failed for ${prd.id}: ${err.message}`);
    }
  }
}

main();
