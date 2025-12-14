import express, { Request, Response } from "express";
import Job from "../models/job";
import Company from "../models/company";
import { verifyToken } from "../middleware/auth";
import mongoose from "mongoose";

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
      const regex = new RegExp(search as string, "i"); // case-insensitive

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
