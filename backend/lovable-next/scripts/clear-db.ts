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

async function clearDatabase() {
  try {
    await connectDb();
    console.log("🗑️  Clearing database collections...\n");

    const userDeleted = await User.deleteMany({});
    const clientDeleted = await Client.deleteMany({});
    const projectDeleted = await Project.deleteMany({});

    console.log(`   Users deleted: ${userDeleted.deletedCount}`);
    console.log(`   Clients deleted: ${clientDeleted.deletedCount}`);
    console.log(`   Projects deleted: ${projectDeleted.deletedCount}`);
    console.log("\n✅ Database cleared!");
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

clearDatabase();
