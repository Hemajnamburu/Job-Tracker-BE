import express from "express";
import { Request, Response } from "express";
import { verifyToken } from "../middleware/auth";
import { Interview } from "../models/interview";
import Job from "../models/job";
import Company from "../models/company";
import mongoose from "mongoose";

const router = express.Router();

// GET all interviews for user
router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const interviews = await Interview.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "applicationId",
          foreignField: "_id",
          as: "application",
        },
      },
      { $unwind: { path: "$application", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "companies",
          localField: "application.companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      // Final projection
      {
        $project: {
          _id: 1,
          interviewType: 1,
          interviewDate: 1,
          time: 1,
          duration: 1,
          format: 1,
          meetingLink: 1,
          interviewerName: 1,
          interviewerEmail: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          applicationId: "$application._id",
          companyName: "$application.companyName",
          positionTitle: "$application.positionTitle",
          companyInitial: {
            $cond: [
              { $ifNull: ["$company.name", false] },
              { $substrCP: ["$company.name", 0, 1] },
              "",
            ],
          },
          companyColor: "$company.avatarColor",
        },
      },
      { $sort: { interviewDate: -1 } },
    ]);

    res.json(interviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single interview by ID
router.get("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId,
    }).populate({
      path: "applicationId",
      select: "companyName positionTitle",
    });

    if (!interview) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    res.json(interview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new interview
router.post("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Fetch the job application to get company details
    const job = await Job.findOne({
      _id: req.body.applicationId,
      userId,
    });

    if (!job) {
      res.status(404).json({ message: "Job application not found" });
      return;
    }

    // Fetch the company to get initial and color
    const company = await Company.findOne({
      _id: job.companyId,
      userId,
    });

    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    const newInterview = new Interview({
      ...req.body,
      userId,
      interviewDate: new Date(req.body.interviewDate),
      companyName: job.companyName,
      positionTitle: job.positionTitle,
      companyInitial: company.name.charAt(0),
      companyColor: company.avatarColor,
    });

    await newInterview.save();

    res.status(201).json(newInterview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update interview
router.put("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const updated = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE interview
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const deleted = await Interview.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    res.json({ message: "Interview deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
