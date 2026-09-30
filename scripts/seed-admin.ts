import { db } from "../src/db/index.ts";
import { users } from "../src/db/schema.ts";
import { hashPassword } from "../src/lib/password.ts";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npm run db:seed-admin -- <email> <password>");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, passwordHash, role: "ADMIN" });
  console.log(`Admin created: ${email}`);
}

main().then(() => process.exit(0));
