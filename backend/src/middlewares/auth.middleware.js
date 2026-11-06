import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http.js";

export async function authenticate(req, _res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "กรุณาเข้าสู่ระบบ", "UNAUTHORIZED");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    if (!user?.is_active)
      throw new HttpError(401, "บัญชีนี้ไม่สามารถใช้งานได้", "UNAUTHORIZED");
    req.user = user;
    next();
  } catch (error) {
    next(
      error instanceof HttpError
        ? error
        : new HttpError(401, "Token ไม่ถูกต้องหรือหมดอายุ", "UNAUTHORIZED"),
    );
  }
}
