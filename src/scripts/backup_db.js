import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  "https://xejgypblblaqtmeqgjfi.supabase.co";

const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlamd5cGJsYmxhcXRtZXFnamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzg2NzEsImV4cCI6MjA5NDgxNDY3MX0.rcC22kV1MXd8eLzzCS0TPyDYw9m8Bf6PRoP57u7lXtQ";

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
