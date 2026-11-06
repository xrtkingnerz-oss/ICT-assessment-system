import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "node:url";
import api from "./routes/api.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { prisma } from "./config/prisma.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  throw new Error("JWT_SECRET ต้องมีอย่างน้อย 32 ตัวอักษร");
const app = express();
const port = Number(process.env.PORT || 4000);
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (process.env.FRONTEND_URL || "http://localhost:5173")
      .split(",")
      .map((x) => x.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: "ok", database: "connected" } });
  } catch {
    res
      .status(503)
      .json({
        success: false,
        data: { status: "degraded", database: "unavailable" },
      });
  }
});
app.use("/api", api);
app.use((_req, res) =>
  res
    .status(404)
    .json({
      success: false,
      error: { code: "NOT_FOUND", message: "ไม่พบ API ที่ร้องขอ" },
    }),
);
app.use(errorHandler);
const server = app.listen(port, () =>
  console.log(`ICT Assessment API listening on port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    }),
  );
