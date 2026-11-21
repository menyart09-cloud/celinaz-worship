import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Vercel Preview builds for this project have no DATABASE_URL — `next build`
// still evaluates this module while collecting route data, even for routes
// that are force-dynamic, so a missing URL would otherwise crash the whole
// build. The placeholder is never actually queried: Preview isn't what the
// team signs into, only Production is, and that always has DATABASE_URL set.
const connectionString = process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@placeholder.tld/placeholder";

export const db = drizzle(neon(connectionString), { schema });
