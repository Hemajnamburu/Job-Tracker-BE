// models/Company.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema<ICompany> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    avatarColor: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", CompanySchema);
