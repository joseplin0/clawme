import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = process.env.NUXT_TEST_SERVER_HOST || "127.0.0.1";
const port = Number(process.env.NUXT_TEST_SERVER_PORT || 4010);
const baseUrl = `http://${host}:${port}`;
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const shouldBootstrap = process.env.NUXT_E2E_BOOTSTRAP === "true";

const sharedEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/clawme",
  NUXT_SESSION_PASSWORD:
    process.env.NUXT_SESSION_PASSWORD ??
    "test-session-password-with-at-least-32-characters",
};
const skipBuild = process.env.NUXT_E2E_SKIP_BUILD === "true";

function run(command, args, env = sharedEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForServer(url) {
  for (let index = 0; index < 60; index += 1) {
    try {
      const response = await fetch(`${url}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for test server at ${url}`);
}

async function ensureSystemBootstrapped(url) {
  if (!shouldBootstrap) {
    return;
  }

  const statusResponse = await fetch(`${url}/api/system/status`);
  if (!statusResponse.ok) {
    throw new Error(
      `Failed to read system status: ${statusResponse.status} ${statusResponse.statusText}`,
    );
  }

  const status = await statusResponse.json();
  if (status.isInitialized) {
    return;
  }

  const bootstrapResponse = await fetch(`${url}/api/system/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ownerNickname: "CI Owner",
      ownerUsername: "ci_owner",
      ownerPassword: "ci-owner-password",
      assistantNickname: "Clawme",
      assistantRole: "CI assistant",
      assistantIntro: "Bootstrap fixture for end-to-end tests.",
      providerName: "CI Mock Provider",
      providerBaseUrl: "https://example.com/v1",
      apiKey: "ci-test-key",
      modelId: "gpt-4o-mini",
    }),
  });

  if (!bootstrapResponse.ok) {
    const errorText = await bootstrapResponse.text();
    throw new Error(
      `Failed to bootstrap test data: ${bootstrapResponse.status} ${errorText}`,
    );
  }
}

const serverEnv = {
  ...sharedEnv,
  HOST: host,
  PORT: String(port),
  NITRO_HOST: host,
  NITRO_PORT: String(port),
  NUXT_PUBLIC_TEST_BYPASS_ROUTE_GUARD: "true",
};

let server;
let serverClosed = false;

try {
  if (!skipBuild) {
    await run(pnpmCommand, ["exec", "nuxt", "build"]);
  }

  server = spawn(process.execPath, [".output/server/index.mjs"], {
    cwd: process.cwd(),
    env: serverEnv,
    stdio: "inherit",
  });

  server.on("exit", () => {
    serverClosed = true;
  });

  await waitForServer(baseUrl);
  await ensureSystemBootstrapped(baseUrl);
  await run(
    pnpmCommand,
    ["exec", "vitest", "run", "--project", "node", "tests/e2e"],
    {
      ...sharedEnv,
      NUXT_TEST_HOST: baseUrl,
    },
  );
  if (!serverClosed) {
    server.kill("SIGTERM");
    await delay(500);
  }
} finally {
  if (server && !serverClosed) {
    server.kill("SIGTERM");
    await delay(500);
  }
}
