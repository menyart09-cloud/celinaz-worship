import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  if (!name || !email) {
    throw new Error("Set ADMIN_NAME and ADMIN_EMAIL to seed the first admin");
  }

  const { db } = await import("../src/db");
  const { users } = await import("../src/db/schema");

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }

  const password = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log(`Admin user created: ${email}`);
  console.log(`Temporary password: ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
