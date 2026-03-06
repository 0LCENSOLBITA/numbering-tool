import { connectDb } from "@/lib/mongoose";
import Client from "@/lib/models/Client";
import "@/lib/models/User";
import { NextResponse, NextRequest } from "next/server";
import { Types } from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    let query = {};
    if (name) {
      query = { name: { $regex: name, $options: "i" } };
    }

    const clients = await Client.find(query)
      .populate("created_by", "email display_name")
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Client.countDocuments(query);

    return NextResponse.json(
      {
        data: clients,
        pagination: {
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    if (!body.created_by) {
      return NextResponse.json(
        { error: "created_by (User ID) is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(body.created_by)) {
      return NextResponse.json(
        { error: "Invalid created_by ID format" },
        { status: 400 }
      );
    }

    const client = new Client({
      name: body.name,
      prefix: body.prefix,
      created_by: body.created_by,
    });

    await client.save();
    await client.populate("created_by", "email display_name");

    return NextResponse.json(
      { data: client, message: "Client created successfully" },
      { status: 201 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}