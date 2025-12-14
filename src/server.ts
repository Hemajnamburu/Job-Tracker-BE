import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import companyRoutes from "./routes/company";
import jobRoutes from "./routes/job";
import interviewRoutes from "./routes/interview";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/auth", authRoutes);
app.use("/companies", companyRoutes);
app.use("/jobs", jobRoutes);
app.use("/interviews", interviewRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});
