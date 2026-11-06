import { HttpError } from "../utils/http.js";
export const allowRoles =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.roles?.name)
      ? next()
      : next(new HttpError(403, "ไม่มีสิทธิ์ดำเนินการ", "FORBIDDEN"));
