type StartupCheckStatus = "pending" | "ok" | "warn" | "error";

interface StartupCheckRecord {
  key: string;
  label: string;
  status: StartupCheckStatus;
  detail: string;
  startedAt: string;
  updatedAt: string;
  durationMs: number | null;
}

interface StartupDiagnosticsState {
  startedAt: string;
  updatedAt: string;
  checks: Record<string, StartupCheckRecord>;
}

const globalForStartupDiagnostics = globalThis as typeof globalThis & {
  __clawmeStartupDiagnostics?: StartupDiagnosticsState;
};

function createInitialState(): StartupDiagnosticsState {
  const now = new Date().toISOString();

  return {
    startedAt: now,
    updatedAt: now,
    checks: {},
  };
}

function getState(): StartupDiagnosticsState {
  const state =
    globalForStartupDiagnostics.__clawmeStartupDiagnostics ?? createInitialState();

  globalForStartupDiagnostics.__clawmeStartupDiagnostics = state;
  return state;
}

function upsertCheck(
  key: string,
  label: string,
  patch: Partial<StartupCheckRecord>,
): StartupCheckRecord {
  const state = getState();
  const now = new Date().toISOString();
  const existing = state.checks[key];

  const nextRecord: StartupCheckRecord = {
    key,
    label,
    status: patch.status ?? existing?.status ?? "pending",
    detail: patch.detail ?? existing?.detail ?? "",
    startedAt: patch.startedAt ?? existing?.startedAt ?? now,
    updatedAt: now,
    durationMs: patch.durationMs ?? existing?.durationMs ?? null,
  };

  state.checks[key] = nextRecord;
  state.updatedAt = now;

  return nextRecord;
}

export function beginStartupCheck(
  key: string,
  label: string,
  detail: string,
): StartupCheckRecord {
  return upsertCheck(key, label, {
    status: "pending",
    detail,
    startedAt: new Date().toISOString(),
    durationMs: null,
  });
}

function finalizeStartupCheck(
  key: string,
  label: string,
  status: Exclude<StartupCheckStatus, "pending">,
  detail: string,
): StartupCheckRecord {
  const state = getState();
  const existing = state.checks[key];
  const startedAt = existing?.startedAt ?? new Date().toISOString();
  const durationMs = Math.max(
    0,
    new Date().getTime() - new Date(startedAt).getTime(),
  );

  return upsertCheck(key, label, {
    status,
    detail,
    startedAt,
    durationMs,
  });
}

export function passStartupCheck(
  key: string,
  label: string,
  detail: string,
): StartupCheckRecord {
  return finalizeStartupCheck(key, label, "ok", detail);
}

export function warnStartupCheck(
  key: string,
  label: string,
  detail: string,
): StartupCheckRecord {
  return finalizeStartupCheck(key, label, "warn", detail);
}

export function failStartupCheck(
  key: string,
  label: string,
  detail: string,
): StartupCheckRecord {
  return finalizeStartupCheck(key, label, "error", detail);
}

export function getStartupDiagnostics() {
  const state = getState();
  const checks = Object.values(state.checks).sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt),
  );
  const hasPending = checks.some((check) => check.status === "pending");
  const hasError = checks.some((check) => check.status === "error");
  const hasWarning = checks.some((check) => check.status === "warn");

  const status: StartupCheckStatus = hasError
    ? "error"
    : hasPending
      ? "pending"
      : hasWarning
        ? "warn"
        : "ok";

  return {
    status,
    ready: !hasPending,
    hasBlockingIssue: hasError,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    checks,
  };
}

export async function runStartupCheck<T>(input: {
  key: string;
  label: string;
  detail: string;
  successDetail: (value: T) => string;
  run: () => Promise<T>;
  timeoutMs?: number;
  timeoutDetail?: string;
}) {
  beginStartupCheck(input.key, input.label, input.detail);

  try {
    const result =
      input.timeoutMs === undefined
        ? await input.run()
        : await withTimeout(
            input.run(),
            input.timeoutMs,
            input.timeoutDetail ??
              `${input.label} exceeded ${input.timeoutMs}ms.`,
          );

    passStartupCheck(
      input.key,
      input.label,
      input.successDetail(result),
    );

    return result;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : `${input.label} failed.`;

    failStartupCheck(input.key, input.label, detail);
    throw error;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}
