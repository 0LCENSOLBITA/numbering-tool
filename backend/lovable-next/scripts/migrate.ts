import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose, { Types } from "mongoose";
import { connectDb, disconnectDb } from "../lib/mongoose";
import User from "../lib/models/User";
import Client from "../lib/models/Client";
import Project from "../lib/models/Project";

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse semicolon-separated CSV file
 */
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

/**
 * Parse PostgreSQL timestamp
 */
function parseTimestamp(timestamp: string): Date {
  if (!timestamp) return new Date();
  return new Date(timestamp);
}

/**
 * CLEAR COLLECTIONS
 * Safely deletes all documents from all collections
 */
async function clearCollections() {
  console.log("\n🗑️  Clearing existing collections...");

  try {
    await User.deleteMany({});
    console.log("  ✅ Cleared Users collection");

    await Client.deleteMany({});
    console.log("  ✅ Cleared Clients collection");

    await Project.deleteMany({});
    console.log("  ✅ Cleared Projects collection");
  } catch (err: any) {
    throw new Error(`Failed to clear collections: ${err.message}`);
  }
}

/**
 * USERS MIGRATION
 */
async function migrateUsers(
  profilesPath: string,
  rolesPath: string
): Promise<Map<string, Types.ObjectId>> {
  console.log("\n📋 Migrating Users...");

  const profiles = parseCSV(profilesPath);
  const roles = parseCSV(rolesPath);

  console.log(`  Found ${profiles.length} profiles`);
  console.log(`  Found ${roles.length} role records`);

  // Map roles by user_id
  const rolesMap = new Map<string, string[]>();

  roles.forEach((roleRow) => {
    const userId = roleRow.user_id;
    if (!rolesMap.has(userId)) {
      rolesMap.set(userId, []);
    }
    rolesMap.get(userId)!.push(roleRow.role);
  });

  // Prepare user documents for bulk insert
  const userDocuments: any[] = [];
  const userIdMap = new Map<string, Types.ObjectId>();

  for (const profile of profiles) {
    const userRoles = rolesMap.get(profile.user_id) || ["viewer"];
    const newObjectId = new Types.ObjectId();

    userDocuments.push({
      _id: newObjectId,
      email: profile.email.toLowerCase(),
      first_name: profile.first_name || undefined,
      last_name: profile.last_name || undefined,
      display_name: profile.display_name || undefined,
      short_name: profile.short_name || undefined,
      roles: userRoles,
      createdAt: parseTimestamp(profile.created_at),
      updatedAt: parseTimestamp(profile.updated_at),
    });

    userIdMap.set(profile.user_id, newObjectId);
  }

  // Insert all users at once
  if (userDocuments.length > 0) {
    try {
      await User.insertMany(userDocuments);
      console.log(`  ✅ Created ${userDocuments.length} users`);
    } catch (err: any) {
      console.warn(`  ⚠️ Partial user insertion - ${err.message}`);
    }
  }

  return userIdMap;
}

/**
 * CLIENTS MIGRATION
 */
async function migrateClients(
  clientsPath: string,
  userIdMap: Map<string, Types.ObjectId>
): Promise<Map<string, Types.ObjectId>> {
  console.log("\n📋 Migrating Clients...");

  const clients = parseCSV(clientsPath);
  console.log(`  Found ${clients.length} clients`);

  // Prepare client documents for bulk insert
  const clientDocuments: any[] = [];
  const clientIdMap = new Map<string, Types.ObjectId>();

  for (const row of clients) {
    const createdByMongoId = userIdMap.get(row.created_by);

    // Skip if created_by user doesn't exist
    if (!createdByMongoId) {
      console.warn(
        `  ⚠️ Client "${row.client_name}" references unknown user, skipping`
      );
      continue;
    }

    const newObjectId = new Types.ObjectId();

    clientDocuments.push({
      _id: newObjectId,
      name: row.client_name,
      prefix: row.prefix || undefined,
      created_by: createdByMongoId,
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at),
    });

    clientIdMap.set(row.id, newObjectId);
  }

  // Insert all clients at once
  if (clientDocuments.length > 0) {
    try {
      await Client.insertMany(clientDocuments);
      console.log(`  ✅ Created ${clientDocuments.length} clients`);
    } catch (err: any) {
      console.warn(`  ⚠️ Partial client insertion - ${err.message}`);
    }
  }

  return clientIdMap;
}

/**
 * PROJECTS MIGRATION
 */
async function migrateProjects(
  projectsPath: string,
  clientIdMap: Map<string, Types.ObjectId>,
  userIdMap: Map<string, Types.ObjectId>
): Promise<void> {
  console.log("\n📋 Migrating Projects...");

  const projects = parseCSV(projectsPath);
  console.log(`  Found ${projects.length} projects`);

  // Cache admin user for fallback
  let adminUser: any = null;

  // Prepare project documents for bulk insert
  const projectDocuments: any[] = [];

  for (const row of projects) {
    // FLEXIBLE: client_id can be null if not found
    const clientMongoId = clientIdMap.get(row.client_id);

    // FLEXIBLE: created_by is optional
    let createdByMongoId: Types.ObjectId | undefined;

    if (row.created_by && row.created_by.trim()) {
      createdByMongoId = userIdMap.get(row.created_by);
    }

    // If created_by is not set or not found, try to use an admin user
    if (!createdByMongoId) {
      if (!adminUser) {
        adminUser = await User.findOne({ roles: "admin" });
      }
      if (adminUser) {
        createdByMongoId = adminUser._id as Types.ObjectId;
      }
    }

    projectDocuments.push({
      project_number: row.project_number,
      client_id: clientMongoId || undefined,
      name: row.project_name,
      description: row.description || undefined,
      status: row.status || "active",
      created_by: createdByMongoId,
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at),
    });
  }

  // Insert all projects at once
  if (projectDocuments.length > 0) {
    try {
      await Project.insertMany(projectDocuments);
      console.log(`  ✅ Created ${projectDocuments.length} projects`);
    } catch (err: any) {
      console.warn(`  ⚠️ Partial project insertion - ${err.message}`);
    }
  }
}

/**
 * MAIN MIGRATION FUNCTION
 */
async function migrate() {
  console.log("🚀 Starting Full Clean Re-Migration...\n");

  try {
    // Step 1: Connect to MongoDB
    await connectDb();
    console.log("✅ Connected to MongoDB");

    // Step 2: Clear all collections
    await clearCollections();

    // Step 3: Prepare CSV paths
    const basePath = path.join(process.cwd(), "migration-data");
    const profilesPath = path.join(basePath, "profiles.csv");
    const clientsPath = path.join(basePath, "clients.csv");
    const projectsPath = path.join(basePath, "projects.csv");
    const rolesPath = path.join(basePath, "user_roles.csv");

    // Step 4: Migrate data in order (dependencies)
    const userIdMap = await migrateUsers(profilesPath, rolesPath);
    const clientIdMap = await migrateClients(clientsPath, userIdMap);
    await migrateProjects(projectsPath, clientIdMap, userIdMap);

    // Step 5: Display final counts
    console.log("\n✅ Migration Completed Successfully!\n");
    console.log("📊 Final Counts:");
    const userCount = await User.countDocuments();
    const clientCount = await Client.countDocuments();
    const projectCount = await Project.countDocuments();

    console.log(`  • Users: ${userCount}`);
    console.log(`  • Clients: ${clientCount}`);
    console.log(`  • Projects: ${projectCount}\n`);

    console.log("🎉 Database re-migration finished!");
  } catch (err: any) {
    console.error("\n❌ Migration Failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Step 6: Close connection
    await disconnectDb();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
}

// Run migration
migrate();