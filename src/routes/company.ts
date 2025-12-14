import express, { Request, Response } from "express";
import Company from "../models/company";
import { verifyToken } from "../middleware/auth";
import mongoose from "mongoose";
import job from "../models/job";

const router = express.Router();

// GET /companies?search=
router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const search = req.query.search as string;

    const companies = await Company.find({
      userId,
      name: { $regex: search || "", $options: "i" },
    });

    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/summary", verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const search = req.query.search;

    const pipeline: any = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: "$companyId",
          applications: { $sum: 1 },
          interviews: {
            $sum: {
              $cond: [{ $eq: ["$currentStatus", "Interview Scheduled"] }, 1, 0],
            },
          },
          lastApplied: { $max: "$applicationDate" },
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "companyInfo",
        },
      },
      {
        $unwind: "$companyInfo",
      },
    ];

    // Add search $match if search exists
    if (search) {
      pipeline.push({
        $match: {
          "companyInfo.name": { $regex: search, $options: "i" },
        },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          name: "$companyInfo.name",
          avatarColor: "$companyInfo.avatarColor",
          applications: 1,
          interviews: 1,
          lastApplied: 1,
          initial: { $substr: ["$companyInfo.name", 0, 1] },
        },
      },
      {
        $sort: { name: 1 },
      }
    );

    const summary = await job.aggregate(pipeline);

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// POST /companies
router.post("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, category, avatarColor } = req.body;

    const initial = name.charAt(0).toUpperCase();

    const company = new Company({
      userId,
      name,
      category,
      avatarColor,
      initial,
    });

    await company.save();
    res.status(201).json(company);
  } catch (err: any) {
    console.error(err);
    if (err.code === 11000) {
      res
        .status(400)
        .json({ message: "Company with this name already exists." });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
});

// GET /companies/:id
router.get("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /companies/:id
router.patch("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const company = await Company.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /companies/:id
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: "Company deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /companies/:id/applications - Get all applications for a company
router.get("/:id/applications", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const companyId = req.params.id;

    // Verify the company belongs to the user
    const company = await Company.findOne({ _id: companyId, userId });
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    // Get all jobs for this company
    const applications = await job.find({ companyId, userId }).sort({ applicationDate: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
