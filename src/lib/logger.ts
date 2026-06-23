type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (v instanceof Error) return JSON.stringify(v.message);
  if (typeof v === "string") return /\s/.test(v) ? JSON.stringify(v) : v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatFields(fields?: Record<string, unknown>): string {
  if (!fields) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    parts.push(`${k}=${formatValue(v)}`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function write(
  level: LogLevel,
  tag: string,
  message: string,
  fields?: Record<string, unknown>
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;
  const ts = new Date().toISOString();
  const line = `${ts} ${level.toUpperCase()} [${tag}] ${message}${formatFields(fields)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createLogger(tag: string): Logger {
  return {
    debug: (m, f) => write("debug", tag, m, f),
    info: (m, f) => write("info", tag, m, f),
    warn: (m, f) => write("warn", tag, m, f),
    error: (m, f) => write("error", tag, m, f),
  };
}
