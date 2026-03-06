import mongoose, { Schema, Document, Types } from "mongoose";

export interface IClient extends Document {
  name: string;
  prefix?: string;
  created_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    prefix: {
      type: String,
      trim: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "created_by is required"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Client || mongoose.model<IClient>("Client", clientSchema);
