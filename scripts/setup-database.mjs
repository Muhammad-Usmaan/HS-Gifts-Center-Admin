/**
 * Run from HS_Admin_site: node scripts/setup-database.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (get from Supabase Dashboard → Settings → API)
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="([^"]*)"/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env from Supabase Dashboard → Settings → API → secret key");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigrations() {
  const migrationsDir = join(root, "supabase", "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  console.log(`Running ${files.length} migration files...`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`  → ${file}`);
    const { error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();
    if (error?.message?.includes("exec_sql")) {
      // Fallback: use REST SQL endpoint via pg if rpc not available
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      if (!res.ok) {
        console.warn(`  ⚠ Could not run ${file} via RPC. Run migrations manually in Supabase SQL Editor.`);
        console.warn(`    File: supabase/migrations/${file}`);
      }
    } else if (error) {
      console.warn(`  ⚠ ${file}: ${error.message}`);
    }
  }
}

async function createAdminUser() {
  const email = "admin@hsgiftshop.com";
  const password = "112233";

  const { data: existing } = await supabase.auth.admin.listUsers();
  let userId = existing?.users?.find((u) => u.email === email)?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: "admin" },
    });
    if (error) throw new Error(`Create admin user failed: ${error.message}`);
    userId = data.user.id;
    console.log("Created admin user:", email);
  } else {
    await supabase.auth.admin.updateUserById(userId, { password });
    console.log("Admin user already exists, password updated:", email);
  }

  const { error: roleErr } = await supabase.from("user_roles").upsert(
    { user_id: userId, role: "admin" },
    { onConflict: "user_id,role" },
  );
  if (roleErr) console.warn("Role assignment:", roleErr.message);
  else console.log("Admin role assigned.");

  console.log("\nLogin credentials:");
  console.log("  Username: admin");
  console.log("  Password: 112233");
}

async function main() {
  console.log("HS Gift Shop — Database Setup\n");
  console.log("Project:", url);

  // Test connection
  const { error: connErr } = await supabase.from("site_settings").select("id").limit(1);
  if (connErr?.message?.includes("relation") || connErr?.code === "42P01") {
    console.log("\nTables not found. Please run all SQL files in supabase/migrations/ via Supabase SQL Editor first.");
    console.log("Then re-run this script to create the admin user.\n");
    process.exit(1);
  }

  await createAdminUser();
  console.log("\nDone!");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
