import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
import { connectDb } from "../lib/mongoose";
import User from "../lib/models/User";
import Client from "../lib/models/Client";
import Project from "../lib/models/Project";
import fs from "fs";
import { Types } from "mongoose";

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

function parseTimestamp(timestamp: string): Date {
  if (!timestamp) return new Date();
  return new Date(timestamp);
}

async function debugMigration() {
  try {
    await connectDb();
    console.log("✅ Connected to MongoDB\n");

    const projectsPath = path.join(process.cwd(), "migration-data", "projects.csv");
    const projects = parseCSV(projectsPath);

    console.log(`📋 Analyzing ${projects.length} projects...\n`);

    const clientIdMap = new Map<string, Types.ObjectId>();
    const clients = await Client.find();
    clients.forEach((c) => {
      const id = (c as any)._id as Types.ObjectId;
      // Need to match by: clients CSV id -> mongoDB _id
      // But we don't have the original CSV id stored...
      // Let me just get all clients in database
    });

    console.log(`\n Found ${clients.length} clients in database`);
    console.log(
      "Client names:",
      clients.slice(0, 3).map((c) => c.name)
    );

    // Test save a single project
    const testProject = projects[0];
    console.log(`\nTest project: ${testProject.project_number}`);
    console.log(`  client_id: ${testProject.client_id}`);
    console.log(`  name: ${testProject.name}`);
    console.log(`  created_by: "${testProject.created_by}" (empty: ${!testProject.created_by || !testProject.created_by.trim()})`);

    // Try to find client by name from prefix
    const clientName = testProject.client_id.substring(0, 3).toUpperCase();
    console.log(`\nLooking for client with ID: ${testProject.client_id}`);

    // Check if we can create the project at all
    const adminUser = await User.findOne({ roles: "admin" });
    console.log(`\nAdmin user found: ${adminUser?.email}`);

    // Try creating a test project document
    const testDoc = new Project({
      project_number: "TEST-0000",
      client_id: clients[0]._id,
      name: "Test Project",
      status: "active",
      created_by: adminUser?._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`\nAttempting to save test project...`);
    await testDoc.save();
    console.log(`✅ Test project saved successfully!`);

    // Clean up
    await Project.deleteOne({ project_number: "TEST-0000" });
    console.log(`✅ Cleaned up test project`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
    } catch (error) {
      // ignore
    }
    process.exit(0);
  }
}

debugMigration();
