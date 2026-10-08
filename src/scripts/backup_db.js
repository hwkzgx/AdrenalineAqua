import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  } else {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...vals] = trimmed.split("=");
        if (key && vals.length) {
          process.env[key.trim()] = vals.join("=").trim();
        }
      }
    });
  }
}

// Supabase Configuration from root .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in root .env file.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// List of all application tables
const TABLES = [
  "users",
  "customer_profiles",
  "orders",
  "order_items",
  "inventory",
  "delivery_schedule",
  "expenses",
  "sales",
  "messages",
  "notifications",
  "ai_prediction_state",
  "container_transactions",
];

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "backups", `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`====================================================`);
  console.log(`Starting Supabase Database Backup: ${timestamp}`);
  console.log(`Target Directory: ${backupDir}`);
  console.log(`====================================================\n`);

  const summary = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    tables: {},
  };

  for (const table of TABLES) {
    try {
      console.log(`Fetching data from table: '${table}'...`);
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" });

      if (error) {
        console.warn(`⚠️ Warning for table '${table}': ${error.message}`);
        summary.tables[table] = {
          status: "error",
          error: error.message,
          rowCount: 0,
        };
        continue;
      }

      const rowCount = data?.length || 0;
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), "utf8");

      console.log(`✅ Saved ${rowCount} record(s) to ${table}.json`);
      summary.tables[table] = {
        status: "success",
        rowCount: rowCount,
        file: `${table}.json`,
      };
    } catch (err) {
      console.error(`❌ Failed to backup table '${table}':`, err.message);
      summary.tables[table] = {
        status: "fatal_error",
        error: err.message,
        rowCount: 0,
      };
    }
  }

  // Save manifest / summary file
  const summaryPath = path.join(backupDir, "backup-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(`\n====================================================`);
  console.log(`Backup completed successfully!`);
  console.log(`Summary manifest saved to: ${summaryPath}`);
  console.log(`====================================================\n`);
}

backupDatabase().catch((err) => {
  console.error("Backup script encountered a critical error:", err);
  process.exit(1);
});
