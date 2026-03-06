import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  short_name?: string;
  roles: Array<"admin" | "manager" | "account" | "viewer">;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    display_name: {
      type: String,
      trim: true,
    },
    short_name: {
      type: String,
      trim: true,
    },
    roles: {
      type: [
        {
          type: String,
          enum: ["admin", "manager", "account", "viewer"],
        },
      ],
      default: ["viewer"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema);
