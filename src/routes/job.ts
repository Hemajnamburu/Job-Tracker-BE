import express, { Request, Response } from "express";
import Job from "../models/job";
import Company from "../models/company";
import { verifyToken } from "../middleware/auth";
import mongoose from "mongoose";
import { escapeRegex } from "../utils/regex";

const router = express.Router();

// GET /jobs
router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { search, status } = req.query;

    const query: any = {
      userId,
    };

    if (search) {
      const regex = new RegExp(escapeRegex(search as string), "i"); // case-insensitive

      query.$or = [
        { companyName: regex },
        { positionTitle: regex },
      ];
    }

    if (status) {
      query.currentStatus = status;
    }

    const jobs = await Job.find(query).sort({ applicationDate: -1 });

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    if (!req.body.companyId) {
      res.status(400).json({ message: "companyId is required" });
      return;
    }

    const jobData = {
      ...req.body,
      userId,
      companyId: new mongoose.Types.ObjectId(req.body.companyId),
    };

    const job = new Job(jobData);
    const savedJob = await job.save();

    res.status(201).json(savedJob);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

const ALLOWED_STATUSES = [
  "Saved",
  "Applied",
  "Interview Scheduled",
  "Rejected",
  "Offer Received",
];

const randomAvatarColor = () => {
  const colors = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  return colors[Math.floor(Math.random() * colors.length)];
};

// POST /jobs/bulk - import multiple applications at once (e.g. from a spreadsheet).
// Each row identifies its company by name; companies that don't exist yet for
// this user are created on the fly and reused across rows in the same batch.
router.post("/bulk", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const rows: any[] = Array.isArray(req.body.jobs) ? req.body.jobs : [];

    if (rows.length === 0) {
      res.status(400).json({ message: "No rows to import" });
      return;
    }

    const existingCompanies = await Company.find({ userId });
    const companyByName = new Map<string, any>();
    existingCompanies.forEach((c) =>
      companyByName.set(c.name.trim().toLowerCase(), c)
    );

    const results: Array<{
      row: number;
      success: boolean;
      error?: string;
      jobId?: string;
      companyName?: string;
    }> = [];
    let createdCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const rowNumber = i + 1;

      try {
        const companyName = (row.companyName || "").toString().trim();
        const positionTitle = (row.positionTitle || "").toString().trim();

        if (!companyName) {
          results.push({ row: rowNumber, success: false, error: "Company is required" });
          continue;
        }
        if (!positionTitle) {
          results.push({ row: rowNumber, success: false, error: "Position Title is required" });
          continue;
        }

        const currentStatus = (row.currentStatus || "Applied").toString().trim();
        if (!ALLOWED_STATUSES.includes(currentStatus)) {
          results.push({
            row: rowNumber,
            success: false,
            error: `Invalid status "${currentStatus}"`,
          });
          continue;
        }

        const applicationDateRaw = (row.applicationDate || "").toString().trim();
        let applicationDate: Date | undefined;
        if (applicationDateRaw) {
          const parsed = new Date(applicationDateRaw);
          if (isNaN(parsed.getTime())) {
            results.push({
              row: rowNumber,
              success: false,
              error: `Invalid Application Date "${applicationDateRaw}"`,
            });
            continue;
          }
          applicationDate = parsed;
        } else if (currentStatus !== "Saved") {
          results.push({
            row: rowNumber,
            success: false,
            error: "Application Date is required unless status is Saved",
          });
          continue;
        }

        const followUpDateRaw = (row.followUpDate || "").toString().trim();
        let followUpDate: Date | null = null;
        if (followUpDateRaw) {
          const parsed = new Date(followUpDateRaw);
          if (isNaN(parsed.getTime())) {
            results.push({
              row: rowNumber,
              success: false,
              error: `Invalid Follow-up Date "${followUpDateRaw}"`,
            });
            continue;
          }
          followUpDate = parsed;
        }

        const key = companyName.toLowerCase();
        let company = companyByName.get(key);
        if (!company) {
          company = new Company({
            userId,
            name: companyName,
            avatarColor: randomAvatarColor(),
          });
          await company.save();
          companyByName.set(key, company);
        }

        const job = new Job({
          userId,
          companyId: company._id,
          companyName: company.name,
          positionTitle,
          department: row.department || "",
          location: row.location || "",
          currentStatus,
          applicationDate,
          priorityLevel: row.priorityLevel || "Medium",
          jobType: row.jobType || "Full-time",
          workMode: row.workMode || "Remote",
          salaryMin: (row.salaryMin ?? "").toString(),
          salaryMax: (row.salaryMax ?? "").toString(),
          jobPostingUrl: row.jobPostingUrl || "",
          recruiterName: row.recruiterName || "",
          recruiterEmail: row.recruiterEmail || "",
          hrContact: row.hrContact || "",
          applicationSource: row.applicationSource || "Company Website",
          coverLetterSubmitted: row.coverLetterSubmitted || "No",
          resumeVersion: row.resumeVersion || "",
          notes: row.notes || "",
          followUpDate,
        });

        await job.save();
        createdCount++;
        results.push({
          row: rowNumber,
          success: true,
          jobId: (job._id as mongoose.Types.ObjectId).toString(),
          companyName: company.name,
        });
      } catch (err: any) {
        results.push({
          row: rowNumber,
          success: false,
          error: err.message || "Failed to save row",
        });
      }
    }

    res.status(200).json({
      results,
      createdCount,
      failedCount: results.length - createdCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /jobs/:id
router.get("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const job = await Job.findOne({ _id: req.params.id, userId });
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    // Return job data as stored in DB, with companyId as string
    const jobResponse = {
      ...job.toObject(),
      companyId: job.companyId ? job.companyId.toString() : null
    };
    res.json(jobResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /jobs/:id
router.patch("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updates = req.body;

    // Validate companyId if provided
    if (updates.companyId && !mongoose.Types.ObjectId.isValid(updates.companyId)) {
      res.status(400).json({ message: "Invalid companyId format" });
      return;
    }

    // If companyId is provided, verify the company exists
    if (updates.companyId) {
      const company = await Company.findOne({
        _id: updates.companyId,
      });
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /jobs/:id
router.put("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updates = req.body;

    // Validate companyId if provided
    if (updates.companyId && !mongoose.Types.ObjectId.isValid(updates.companyId)) {
      res.status(400).json({ message: "Invalid companyId format" });
      return;
    }

    // If companyId is provided, verify the company exists
    if (updates.companyId) {
      const company = await Company.findOne({
        _id: updates.companyId,
      });
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /jobs/:id
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId });
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
