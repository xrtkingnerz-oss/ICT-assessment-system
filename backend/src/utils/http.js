export class HttpError extends Error {
  constructor(status, message, code = "REQUEST_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res, data, message = "ดำเนินการสำเร็จ", status = 200) =>
  res.status(status).json({ success: true, message, data });
export const safeUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  isActive: user.is_active,
  role: user.roles?.name,
});
export const pageArgs = (query) => ({
  page: Math.max(1, Number(query.page) || 1),
  pageSize: Math.min(100, Math.max(1, Number(query.pageSize) || 20)),
});
