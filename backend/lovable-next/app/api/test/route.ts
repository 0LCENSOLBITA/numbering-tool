import { connectMongo } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await connectMongo();
    const db = client.db("lovable");
    const collections = await db.listCollections().toArray();

    return NextResponse.json({
      message: "MongoDB Connected Successfully",
      collections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}