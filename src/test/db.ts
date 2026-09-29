// Test-only database wiring: the app's real `@/db` client uses the neon-http driver, which speaks
// Neon's HTTP proxy protocol and cannot connect to a plain local Postgres. Tests instead run the
// exact same raw-SQL server-action logic against a local/scratch Postgres over a normal TCP
// connection (node-postgres), via `vi.mock("@/db", ...)` — see actions.test.ts.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const connectionString =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:15432/handball_stats_test";

export const testPool = new Pool({ connectionString });
export const testDb = drizzle(testPool, { schema });
