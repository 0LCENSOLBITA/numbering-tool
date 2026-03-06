import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProject extends Document {
  project_number: string;
  client_id: Types.ObjectId;
  name: string;
  description?: string;
  status: "active" | "completed" | "on_hold";
  created_by?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    project_number: {
      type: String,
      required: [true, "Project number is required"],
      unique: true,
      trim: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "completed", "on_hold"],
        message: "Status must be one of: active, completed, on_hold",
      },
      default: "active",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model<IProject>("Project", projectSchema);
