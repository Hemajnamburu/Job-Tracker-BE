import mongoose, { Schema, Document } from "mongoose";

export type InterviewType =
  | "HR Round"
  | "Technical"
  | "System Design"
  | "Final Round";

export type InterviewFormat = "Video Call" | "Phone Call" | "On-site";

export interface IInterview extends Document {
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  interviewType: InterviewType;
  interviewDate: Date;
  time: string;
  duration: string;
  format: InterviewFormat;
  meetingLink: string;
  interviewerName: string;
  interviewerEmail: string;
  notes: string;
  companyName: string;
  positionTitle: string;
  companyInitial: string;
  companyColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema<IInterview> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    interviewType: {
      type: String,
      enum: ["HR Round", "Technical", "System Design", "Final Round"],
      required: true,
    },
    interviewDate: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: String, required: true },
    format: {
      type: String,
      enum: ["Video Call", "Phone Call", "On-site"],
      required: true,
    },
    meetingLink: { type: String, default: "" },
    interviewerName: { type: String, default: "" },
    interviewerEmail: { type: String, default: "" },
    notes: { type: String, default: "" },
    companyName: { type: String, required: true },
    positionTitle: { type: String, required: true },
    companyInitial: { type: String, required: true },
    companyColor: { type: String, required: true },
  },
  { timestamps: true }
);

export const Interview = mongoose.model<IInterview>(
  "Interview",
  InterviewSchema
);
