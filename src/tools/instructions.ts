import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Bundled Instructions ───────────────────────────────────────────────────

const INSTRUCTIONS_PATH = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  "INSTRUCTIONS.md",
);

export function getInstructions(): string {
  try {
    return fs.readFileSync(INSTRUCTIONS_PATH, "utf-8");
  } catch {
    return "# Instructions not found\n\nThe INSTRUCTIONS.md file could not be located in the package.";
  }
}

// ─── Known IDE instruction paths ────────────────────────────────────────────

interface IdePath {
  name: string;
  dir: string;
  filename: string;
}

function getIdePaths(): IdePath[] {
  const home = os.homedir();

  const paths: IdePath[] = [
    {
      name: "VS Code (User Prompts)",
      dir: path.join(home, "Library", "Application Support", "Code", "User", "prompts"),
      filename: "local-agent-context.instructions.md",
    },
    {
      name: "VS Code Insiders (User Prompts)",
      dir: path.join(home, "Library", "Application Support", "Code - Insiders", "User", "prompts"),
      filename: "local-agent-context.instructions.md",
    },
    {
      name: "Cursor (Global Rules)",
      dir: path.join(home, ".cursor", "rules"),
      filename: "local-agent-context.mdc",
    },
  ];

  // Linux paths
  if (process.platform === "linux") {
    paths.push({
      name: "VS Code (User Prompts)",
      dir: path.join(home, ".config", "Code", "User", "prompts"),
      filename: "local-agent-context.instructions.md",
    });
  }

  // Windows paths
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    paths.push({
      name: "VS Code (User Prompts)",
      dir: path.join(appData, "Code", "User", "prompts"),
      filename: "local-agent-context.instructions.md",
    });
  }

  return paths;
}

// ─── Sync Tool ──────────────────────────────────────────────────────────────

export function syncInstructions(args: { path?: string }): string {
  const instructions = getInstructions();

  // If explicit path provided, write there
  if (args.path) {
    try {
      const dir = path.dirname(args.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(args.path, instructions, "utf-8");
      return `Instructions synced to: ${args.path}`;
    } catch (err) {
      return `Failed to write to ${args.path}: ${err}`;
    }
  }

  // Auto-detect: write to all existing IDE directories
  const idePaths = getIdePaths();
  const results: string[] = [];
  let synced = 0;

  for (const ide of idePaths) {
    if (fs.existsSync(ide.dir)) {
      const filePath = path.join(ide.dir, ide.filename);
      try {
        fs.writeFileSync(filePath, instructions, "utf-8");
        results.push(`✓ ${ide.name}: ${filePath}`);
        synced++;
      } catch (err) {
        results.push(`✗ ${ide.name}: ${err}`);
      }
    }
  }

  if (synced === 0) {
    return "No IDE instruction directories found. Use the `path` parameter to specify a target path.";
  }

  return `Instructions synced to ${synced} location(s):\n\n${results.join("\n")}`;
}
