import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
import { connectDb } from "../lib/mongoose";
import User from "../lib/models/User";
import Client from "../lib/models/Client";
import Project from "../lib/models/Project";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

async function checkMigration() {
  try {
    await connectDb();
    console.log("✅ Connected to MongoDB\n");

    const userCount = await User.countDocuments();
    const clientCount = await Client.countDocuments();
    const projectCount = await Project.countDocuments();

    console.log("📊 Migration Results:");
    console.log(`   Users:    ${userCount}`);
    console.log(`   Clients:  ${clientCount}`);
    console.log(`   Projects: ${projectCount}`);

    // Get sample user
    const user = await User.findOne().select("email display_name roles");
    console.log("\n👤 Sample User:");
    console.log(`   Email: ${user?.email}`);
    console.log(`   Display: ${user?.display_name}`);
    console.log(`   Roles: ${user?.roles}`);

    // Get sample client with populated creator
    const client = await Client.findOne().populate("created_by", "email");
    console.log("\n🏢 Sample Client:");
    console.log(`   Name: ${client?.name}`);
    console.log(`   Created By: ${(client?.created_by as any)?.email}`);

    // Get sample project
    const project = await Project.findOne()
      .populate("client_id", "name")
      .populate("created_by", "email");
    console.log("\n📋 Sample Project:");
    console.log(`   Number: ${project?.project_number}`);
    console.log(`   Name: ${project?.name}`);
    console.log(`   Status: ${project?.status}`);
    console.log(`   Client: ${(project?.client_id as any)?.name}`);
    console.log(`   Creator: ${(project?.created_by as any)?.email}`);

    console.log("\n✅ Migration verification complete!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
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

checkMigration();
