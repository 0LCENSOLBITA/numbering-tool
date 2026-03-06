import { connectDb } from "@/lib/mongoose";
import User from "@/lib/models/User";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    let query = {};
    if (email) {
      query = { email: { $regex: email, $options: "i" } };
    }

    const users = await User.find(query).limit(limit).skip(skip).lean();
    const total = await User.countDocuments(query);

    return NextResponse.json(
      {
        data: users,
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
    if (!body.email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const user = new User({
      email: body.email.toLowerCase(),
      first_name: body.first_name,
      last_name: body.last_name,
      display_name: body.display_name,
      short_name: body.short_name,
      roles: body.roles || ["viewer"],
    });

    await user.save();

    return NextResponse.json(
      { data: user, message: "User created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
