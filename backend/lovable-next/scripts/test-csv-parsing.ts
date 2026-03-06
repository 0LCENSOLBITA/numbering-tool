import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

interface CSVRow {
  [key: string]: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error(`CSV file is empty or invalid: ${filePath}`);
  }

  const headers = lines[0].split(";").map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";").map((v) => v.trim());
    const row: CSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
  }

  return rows;
}

const projectsPath = path.join(process.cwd(), "migration-data", "projects.csv");
const projects = parseCSV(projectsPath);

console.log(`Total projects parsed: ${projects.length}`);

// Group by count of rows per client
const clientCounts = new Map<string, number>();
projects.forEach((p) => {
  const client = p.client_id;
  clientCounts.set(client, (clientCounts.get(client) || 0) + 1);
});

console.log(`\nUnique clients: ${clientCounts.size}`);
console.log(`\nProjects per client (first 5):`);
Array.from(clientCounts.entries())
  .slice(0, 5)
  .forEach(([client, count]) => {
    console.log(`  ${client}: ${count} projects`);
  });

// Check created_by field
let nonEmptyCreatedBy = 0;
projects.forEach((p) => {
  if (p.created_by && p.created_by.trim()) {
    nonEmptyCreatedBy++;
  }
});

console.log(`\nProjects with non-empty created_by: ${nonEmptyCreatedBy}`);
console.log(`Projects with empty/null created_by: ${projects.length - nonEmptyCreatedBy}`);

console.log("\n✅ CSV parsing test complete!");
