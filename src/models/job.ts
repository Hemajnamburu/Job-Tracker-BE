// src/models/job.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJob extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: Types.ObjectId;
  companyName: string;
  positionTitle: string;
  department: string;
  location: string;
  currentStatus:
    | "Applied"
    | "Interview Scheduled"
    | "Rejected"
    | "Offer Received";
  applicationDate: Date;
  priorityLevel: "Low" | "Medium" | "High";
  jobType: "Full-time" | "Part-time" | "Contract" | "Internship";
  workMode: "Remote" | "On-site" | "Hybrid";
  salaryMin: string;
  salaryMax: string;
  jobPostingUrl: string;
  recruiterName: string;
  recruiterEmail: string;
  hrContact: string;
  applicationSource: string;
  coverLetterSubmitted: "Yes" | "No";
  resumeVersion: string;
  notes: string;
  followUpDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema<IJob> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    companyName: { type: String, required: true },
    positionTitle: { type: String, required: true },
    department: { type: String, default: "" },
    location: { type: String, default: "" },
    currentStatus: {
      type: String,
      enum: ["Applied", "Rejected", "Offer Received", "Interview Scheduled"],
      default: "Applied",
    },
    applicationDate: { type: Date },
    priorityLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    jobType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    workMode: {
      type: String,
      enum: ["Remote", "On-site", "Hybrid"],
      default: "Remote",
    },
    salaryMin: { type: String, default: "" },
    salaryMax: { type: String, default: "" },
    jobPostingUrl: { type: String, default: "" },
    recruiterName: { type: String, default: "" },
    recruiterEmail: { type: String, default: "" },
    hrContact: { type: String, default: "" },
    applicationSource: { type: String, default: "Company Website" },
    coverLetterSubmitted: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    resumeVersion: { type: String, default: "" },
    notes: { type: String, default: "" },
    followUpDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IJob>("Job", JobSchema);
