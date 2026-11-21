import { execSync } from "child_process";

function run(command: string) {
  execSync(command, { stdio: "inherit" });
}

if (process.env.DATABASE_URL) {
  run("drizzle-kit migrate");
  run("tsx scripts/seed-worship-data.ts");
  run("tsx scripts/seed-oos-history.ts");
  run("tsx scripts/seed-admin.ts");
} else {
  // Vercel Preview builds for this project have no database configured —
  // skip migrating/seeding rather than failing the whole deploy. Preview
  // isn't what the team signs into; only Production is, and that always
  // has DATABASE_URL set.
  console.log("DATABASE_URL not set — skipping migrate/seed for this build.");
}

run("next build");
