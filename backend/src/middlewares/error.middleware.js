import { Prisma } from "@prisma/client";
export function errorHandler(error, _req, res, _next) {
  const status =
    error.status ||
    (error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code === "P2002"
        ? 409
        : error.code === "P2025"
          ? 404
          : 400
      : 500);
  const message = status === 500 ? "เกิดข้อผิดพลาดภายในระบบ" : error.message;
  if (status === 500) console.error("Request failed:", error.message);
  res
    .status(status)
    .json({
      success: false,
      error: { code: error.code || "INTERNAL_ERROR", message },
    });
}
