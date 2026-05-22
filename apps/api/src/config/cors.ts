import { env } from "./env.js";

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function isCorsOriginAllowed(origin?: string) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith(".app.github.dev");
  } catch {
    return false;
  }
}

export function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void
) {
  callback(null, isCorsOriginAllowed(origin));
}
