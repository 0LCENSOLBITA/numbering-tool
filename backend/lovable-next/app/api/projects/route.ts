import { connectDb } from "@/lib/mongoose";
import Project from "@/lib/models/Project";
import "@/lib/models/User";
import "@/lib/models/Client";
import { NextResponse, NextRequest } from "next/server";
import { Types } from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const status = searchParams.get("status");
    const clientId = searchParams.get("client_id");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    let query: any = {};
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    if (status) {
      query.status = status;
    }
    if (clientId) {
      if (!Types.ObjectId.isValid(clientId)) {
        return NextResponse.json(
          { error: "Invalid client_id format" },
          { status: 400 }
        );
      }
      query.client_id = clientId;
    }

    const projects = await Project.find(query)
      .populate("client_id", "name prefix")
      .populate("created_by", "email display_name")
      .limit(limit)
      .skip(skip)
      .lean();
    const total = await Project.countDocuments(query);

    return NextResponse.json(
      {
        data: projects,
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

    // Validate required fields
    if (!body.project_number) {
      return NextResponse.json(
        { error: "Project number is required" },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    if (!body.client_id) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 }
      );
    }

    if (!body.created_by) {
      return NextResponse.json(
        { error: "created_by (User ID) is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId formats
    if (!Types.ObjectId.isValid(body.client_id)) {
      return NextResponse.json(
        { error: "Invalid client_id format" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(body.created_by)) {
      return NextResponse.json(
        { error: "Invalid created_by ID format" },
        { status: 400 }
      );
    }

    // Check if project_number already exists
    const existingProject = await Project.findOne({
      project_number: body.project_number,
    });
    if (existingProject) {
      return NextResponse.json(
        { error: "Project with this number already exists" },
        { status: 409 }
      );
    }

    // Create new project
    const project = new Project({
      project_number: body.project_number,
      name: body.name,
      description: body.description,
      client_id: body.client_id,
      status: body.status || "active",
      created_by: body.created_by,
    });

    await project.save();
    await project.populate([
      { path: "client_id", select: "name prefix" },
      { path: "created_by", select: "email display_name" },
    ]);

    return NextResponse.json(
      { data: project, message: "Project created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
