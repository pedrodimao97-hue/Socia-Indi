import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const files = [
  {
    path: "apps/api/.env",
    content: [
      'DATABASE_URL="file:./dev.db"',
      'JWT_SECRET="local-development-secret"',
      'JWT_EXPIRES_IN="7d"',
      'CORS_ORIGIN="http://localhost:5173"',
      'PORT="4000"'
    ].join("\n")
  },
  {
    path: "apps/web/.env",
    content: [
      'VITE_API_URL=""',
      'VITE_RTC_ICE_SERVERS="stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"',
      'VITE_RTC_TURN_USERNAME=""',
      'VITE_RTC_TURN_CREDENTIAL=""'
    ].join("\n")
  }
];

for (const file of files) {
  const absolutePath = join(root, file.path);

  if (!existsSync(absolutePath)) {
    writeFileSync(absolutePath, `${file.content}\n`);
    console.log(`created ${file.path}`);
  } else {
    console.log(`kept ${file.path}`);
  }
}
