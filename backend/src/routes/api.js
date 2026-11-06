import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  asyncHandler,
  HttpError,
  ok,
  pageArgs,
  safeUser,
} from "../utils/http.js";

const router = Router();
const protectedApi = Router();
router.use("/auth", protectedApi);
const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues.map((e) => e.message).join(", "),
      "VALIDATION_ERROR",
    );
  return result.data;
};
const roles = (...values) => allowRoles(...values);
const userInput = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().email().max(150),
  password: z.string().min(10).max(72).optional(),
  role: z.enum(["ADMIN", "STAFF"]),
  isActive: z.boolean().optional(),
});
const assessmentInput = z
  .object({
    categoryId: z.string().uuid(),
    title: z.string().trim().min(1).max(255),
    description: z.string().optional().nullable(),
    targetGroup: z.enum(["INTERNAL", "EXTERNAL", "BOTH"]),
    startAt: z.string().datetime().optional().nullable(),
    endAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (v) => !v.startAt || !v.endAt || new Date(v.startAt) < new Date(v.endAt),
    "วันเริ่มต้นต้องมาก่อนวันสิ้นสุด",
  );
const questionInput = z.object({
  questionText: z.string().trim().min(1),
  questionType: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "RATING",
    "NUMBER",
  ]),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  options: z
    .array(
      z.object({
        optionText: z.string().trim().min(1).max(255),
        score: z.number().int().default(0),
      }),
    )
    .default([]),
});
const serializedAssessment = (a) => ({
  id: a.id,
  categoryId: a.category_id,
  category: a.assessment_categories?.name,
  creator: a.users?.full_name,
  title: a.title,
  description: a.description,
  targetGroup: a.target_group,
  publicToken: a.public_token,
  startAt: a.start_at,
  endAt: a.end_at,
  status: a.status,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
  responseCount: a._count?.responses,
  questions: a.questions?.map((q) => ({
    id: q.id,
    questionText: q.question_text,
    questionType: q.question_type,
    isRequired: q.is_required,
    sortOrder: q.sort_order,
    options: q.question_options.map((o) => ({
      id: o.id,
      optionText: o.option_text,
      score: o.score,
      sortOrder: o.sort_order,
    })),
  })),
});

// Authentication
router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const input = parse(
      z.object({ email: z.string().email(), password: z.string().min(1) }),
      req.body,
    );
    const user = await prisma.users.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { roles: true },
    });
    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(input.password, user.password_hash))
    )
      throw new HttpError(
        401,
        "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        "INVALID_CREDENTIALS",
      );
    const token = jwt.sign(
      { sub: user.id, role: user.roles.name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    ok(res, { token, user: safeUser(user) }, "เข้าสู่ระบบสำเร็จ");
  }),
);
router.use(
  [
    "/users",
    "/categories",
    "/assessments",
    "/questions",
    "/dashboard",
    "/reports",
  ],
  authenticate,
);
router.post("/auth/logout", authenticate, (_req, res) =>
  ok(res, {}, "ออกจากระบบแล้ว"),
);
router.get("/auth/me", authenticate, (req, res) => ok(res, safeUser(req.user)));
router.put(
  "/auth/change-password",
  authenticate,
  asyncHandler(async (req, res) => {
    const i = parse(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(10).max(72),
      }),
      req.body,
    );
    if (!(await bcrypt.compare(i.currentPassword, req.user.password_hash)))
      throw new HttpError(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
    await prisma.users.update({
      where: { id: req.user.id },
      data: { password_hash: await bcrypt.hash(i.newPassword, 12) },
    });
    ok(res, {}, "เปลี่ยนรหัสผ่านแล้ว");
  }),
);
router.put(
  "/auth/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const i = parse(
      z.object({
        fullName: z.string().trim().min(2).max(150),
        email: z.string().email().max(150),
      }),
      req.body,
    );
    const u = await prisma.users.update({
      where: { id: req.user.id },
      data: { full_name: i.fullName, email: i.email.toLowerCase() },
      include: { roles: true },
    });
    ok(res, safeUser(u));
  }),
);

// Users (admin only)
router.get(
  "/users",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = pageArgs(req.query);
    const search = String(req.query.search || "");
    const where = search
      ? {
          OR: [
            { full_name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        include: { roles: true },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.users.count({ where }),
    ]);
    ok(res, { items: items.map(safeUser), page, pageSize, total });
  }),
);
router.post(
  "/users",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const i = parse(userInput, req.body);
    if (!i.password)
      throw new HttpError(400, "ต้องกำหนดรหัสผ่านเริ่มต้นอย่างน้อย 10 ตัว");
    const role = await prisma.roles.findUnique({ where: { name: i.role } });
    if (!role) throw new HttpError(400, "ไม่พบ Role");
    const u = await prisma.users.create({
      data: {
        full_name: i.fullName,
        email: i.email.toLowerCase(),
        password_hash: await bcrypt.hash(i.password, 12),
        role_id: role.id,
        is_active: i.isActive ?? true,
      },
      include: { roles: true },
    });
    ok(res, safeUser(u), "สร้างผู้ใช้แล้ว", 201);
  }),
);
router.get(
  "/users/:id",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const u = await prisma.users.findUnique({
      where: { id: req.params.id },
      include: { roles: true },
    });
    if (!u) throw new HttpError(404, "ไม่พบผู้ใช้");
    ok(res, safeUser(u));
  }),
);
router.put(
  "/users/:id",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const i = parse(userInput, req.body);
    const role = await prisma.roles.findUnique({ where: { name: i.role } });
    const data = {
      full_name: i.fullName,
      email: i.email.toLowerCase(),
      role_id: role.id,
    };
    if (i.password) data.password_hash = await bcrypt.hash(i.password, 12);
    if (i.isActive !== undefined) data.is_active = i.isActive;
    const u = await prisma.users.update({
      where: { id: req.params.id },
      data,
      include: { roles: true },
    });
    ok(res, safeUser(u));
  }),
);
router.patch(
  "/users/:id/status",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
    const target = await prisma.users.findUnique({
      where: { id: req.params.id },
      include: { roles: true },
    });
    if (!target) throw new HttpError(404, "ไม่พบผู้ใช้");
    if (
      !isActive &&
      target.roles.name === "ADMIN" &&
      (await prisma.users.count({
        where: { is_active: true, roles: { name: "ADMIN" } },
      })) <= 1
    )
      throw new HttpError(400, "ไม่สามารถระงับ Admin คนสุดท้าย");
    if (target.id === req.user.id && !isActive)
      throw new HttpError(400, "ไม่สามารถระงับบัญชีของตนเอง");
    const u = await prisma.users.update({
      where: { id: target.id },
      data: { is_active: isActive },
      include: { roles: true },
    });
    ok(res, safeUser(u));
  }),
);
router.delete(
  "/users/:id",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const u = await prisma.users.findUnique({
      where: { id: req.params.id },
      include: { roles: true, _count: { select: { assessments: true } } },
    });
    if (!u) throw new HttpError(404, "ไม่พบผู้ใช้");
    if (u.id === req.user.id)
      throw new HttpError(400, "ไม่สามารถลบบัญชีที่กำลังใช้งาน");
    if (
      u.roles.name === "ADMIN" &&
      (await prisma.users.count({
        where: { is_active: true, roles: { name: "ADMIN" } },
      })) <= 1
    )
      throw new HttpError(400, "ไม่สามารถลบ Admin คนสุดท้าย");
    if (u._count.assessments)
      throw new HttpError(
        409,
        "บัญชีนี้เป็นเจ้าของแบบประเมิน กรุณาระงับบัญชีแทน",
      );
    await prisma.users.delete({ where: { id: u.id } });
    ok(res, {});
  }),
);

// Categories
router.get(
  "/categories",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      await prisma.assessment_categories.findMany({
        include: { _count: { select: { assessments: true } } },
        orderBy: { name: "asc" },
      }),
    ),
  ),
);
router.post(
  "/categories",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const i = parse(
      z.object({
        name: z.string().trim().min(1).max(150),
        description: z.string().optional().nullable(),
      }),
      req.body,
    );
    ok(
      res,
      await prisma.assessment_categories.create({
        data: { name: i.name, description: i.description || null },
      }),
      "สร้างหมวดหมู่แล้ว",
      201,
    );
  }),
);
router.get(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const c = await prisma.assessment_categories.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { assessments: true } } },
    });
    if (!c) throw new HttpError(404, "ไม่พบหมวดหมู่");
    ok(res, c);
  }),
);
router.put(
  "/categories/:id",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    const i = parse(
      z.object({
        name: z.string().trim().min(1).max(150),
        description: z.string().optional().nullable(),
      }),
      req.body,
    );
    ok(
      res,
      await prisma.assessment_categories.update({
        where: { id: req.params.id },
        data: { name: i.name, description: i.description || null },
      }),
    );
  }),
);
router.delete(
  "/categories/:id",
  roles("ADMIN"),
  asyncHandler(async (req, res) => {
    if (
      await prisma.assessments.count({ where: { category_id: req.params.id } })
    )
      throw new HttpError(409, "หมวดหมู่นี้มีแบบประเมินอ้างอิงอยู่");
    await prisma.assessment_categories.delete({ where: { id: req.params.id } });
    ok(res, {});
  }),
);

// Assessments and question builder
router.get(
  "/assessments",
  asyncHandler(async (req, res) => {
    const { page, pageSize } = pageArgs(req.query);
    const search = String(req.query.search || "");
    const where = {
      ...(req.query.status ? { status: String(req.query.status) } : {}),
      ...(req.query.categoryId
        ? { category_id: String(req.query.categoryId) }
        : {}),
      ...(req.user.roles.name === "ADMIN" ? {} : { created_by: req.user.id }),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.assessments.findMany({
        where,
        include: {
          assessment_categories: true,
          users: true,
          _count: { select: { responses: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.assessments.count({ where }),
    ]);
    ok(res, { items: items.map(serializedAssessment), page, pageSize, total });
  }),
);
router.post(
  "/assessments",
  asyncHandler(async (req, res) => {
    const i = parse(assessmentInput, req.body);
    ok(
      res,
      serializedAssessment(
        await prisma.assessments.create({
          data: {
            category_id: i.categoryId,
            created_by: req.user.id,
            title: i.title,
            description: i.description || null,
            target_group: i.targetGroup,
            start_at: i.startAt ? new Date(i.startAt) : null,
            end_at: i.endAt ? new Date(i.endAt) : null,
          },
          include: { assessment_categories: true, users: true },
        }),
      ),
      "สร้างแบบประเมินแล้ว",
      201,
    );
  }),
);
router.get(
  "/assessments/:id",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: {
        assessment_categories: true,
        users: true,
        _count: { select: { responses: true } },
        questions: {
          orderBy: { sort_order: "asc" },
          include: { question_options: { orderBy: { sort_order: "asc" } } },
        },
      },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์เข้าถึง");
    ok(res, serializedAssessment(a));
  }),
);
router.put(
  "/assessments/:id",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์เข้าถึง");
    if (a._count.responses)
      throw new HttpError(409, "แบบประเมินมีคำตอบแล้ว จึงแก้ไขไม่ได้");
    const i = parse(assessmentInput, req.body);
    const updated = await prisma.assessments.update({
      where: { id: a.id },
      data: {
        category_id: i.categoryId,
        title: i.title,
        description: i.description || null,
        target_group: i.targetGroup,
        start_at: i.startAt ? new Date(i.startAt) : null,
        end_at: i.endAt ? new Date(i.endAt) : null,
      },
    });
    ok(
      res,
      serializedAssessment(
        await prisma.assessments.findUnique({
          where: { id: updated.id },
          include: {
            assessment_categories: true,
            users: true,
            _count: { select: { responses: true } },
          },
        }),
      ),
    );
  }),
);
router.delete(
  "/assessments/:id",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์เข้าถึง");
    if (a._count.responses)
      throw new HttpError(409, "แบบประเมินมีคำตอบแล้ว ไม่สามารถลบได้");
    await prisma.assessments.delete({ where: { id: a.id } });
    ok(res, {});
  }),
);
router.post(
  "/assessments/:id/publish",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { questions: true },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์เผยแพร่");
    if (!a.questions.length) throw new HttpError(400, "เพิ่มคำถามก่อนเผยแพร่");
    const now = new Date();
    if (a.start_at && now < a.start_at)
      throw new HttpError(400, "ยังไม่ถึงวันเริ่มต้น");
    if (a.end_at && now > a.end_at)
      throw new HttpError(400, "แบบประเมินเลยวันสิ้นสุดแล้ว");
    const updated = await prisma.assessments.update({
      where: { id: a.id },
      data: {
        status: "PUBLISHED",
        public_token: a.public_token || randomBytes(32).toString("base64url"),
      },
    });
    ok(res, {
      ...updated,
      publicUrl: `${process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:5173"}/assessment/${updated.public_token}`,
    });
  }),
);
router.post(
  "/assessments/:id/close",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์ปิด");
    ok(
      res,
      await prisma.assessments.update({
        where: { id: a.id },
        data: { status: "CLOSED" },
      }),
    );
  }),
);
router.post(
  "/assessments/:id/duplicate",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { questions: { include: { question_options: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์เข้าถึง");
    const clone = await prisma.assessments.create({
      data: {
        category_id: a.category_id,
        created_by: req.user.id,
        title: `${a.title} (สำเนา)`,
        description: a.description,
        target_group: a.target_group,
        questions: {
          create: a.questions.map((q) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            is_required: q.is_required,
            sort_order: q.sort_order,
            question_options: {
              create: q.question_options.map((o) => ({
                option_text: o.option_text,
                score: o.score,
                sort_order: o.sort_order,
              })),
            },
          })),
        },
      },
      include: {
        assessment_categories: true,
        users: true,
        questions: { include: { question_options: true } },
      },
    });
    ok(res, serializedAssessment(clone), "คัดลอกแบบประเมินแล้ว", 201);
  }),
);
router.get(
  "/assessments/:id/questions",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await prisma.questions.findMany({
        where: { assessment_id: req.params.id },
        orderBy: { sort_order: "asc" },
        include: { question_options: true },
      }),
    );
  }),
);
router.post(
  "/assessments/:id/questions",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์แก้ไข");
    if (a.status !== "DRAFT" || a._count.responses)
      throw new HttpError(409, "แก้ไขคำถามได้เฉพาะแบบร่างที่ยังไม่มีคำตอบ");
    const i = parse(questionInput, req.body);
    if (
      ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(i.questionType) &&
      i.options.length < 2
    )
      throw new HttpError(400, "คำถามแบบเลือกต้องมีตัวเลือกอย่างน้อย 2 ข้อ");
    ok(
      res,
      await prisma.questions.create({
        data: {
          assessment_id: a.id,
          question_text: i.questionText,
          question_type: i.questionType,
          is_required: i.isRequired,
          sort_order: i.sortOrder,
          question_options: {
            create: i.options.map((o, index) => ({
              option_text: o.optionText,
              score: o.score,
              sort_order: index,
            })),
          },
        },
        include: { question_options: true },
      }),
      "เพิ่มคำถามแล้ว",
      201,
    );
  }),
);
router.put(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const q = await prisma.questions.findUnique({
      where: { id: req.params.id },
      include: {
        assessments: { include: { _count: { select: { responses: true } } } },
      },
    });
    if (!q) throw new HttpError(404, "ไม่พบคำถาม");
    if (
      req.user.roles.name !== "ADMIN" &&
      q.assessments.created_by !== req.user.id
    )
      throw new HttpError(403, "ไม่มีสิทธิ์แก้ไข");
    if (q.assessments.status !== "DRAFT" || q.assessments._count.responses)
      throw new HttpError(409, "คำถามถูกล็อกแล้ว");
    const i = parse(questionInput, req.body);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.question_options.deleteMany({ where: { question_id: q.id } });
      return tx.questions.update({
        where: { id: q.id },
        data: {
          question_text: i.questionText,
          question_type: i.questionType,
          is_required: i.isRequired,
          sort_order: i.sortOrder,
          question_options: {
            create: i.options.map((o, index) => ({
              option_text: o.optionText,
              score: o.score,
              sort_order: index,
            })),
          },
        },
        include: { question_options: true },
      });
    });
    ok(res, updated);
  }),
);
router.delete(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const q = await prisma.questions.findUnique({
      where: { id: req.params.id },
      include: {
        assessments: { include: { _count: { select: { responses: true } } } },
      },
    });
    if (!q) throw new HttpError(404, "ไม่พบคำถาม");
    if (
      req.user.roles.name !== "ADMIN" &&
      q.assessments.created_by !== req.user.id
    )
      throw new HttpError(403, "ไม่มีสิทธิ์แก้ไข");
    if (q.assessments.status !== "DRAFT" || q.assessments._count.responses)
      throw new HttpError(409, "คำถามถูกล็อกแล้ว");
    await prisma.questions.delete({ where: { id: q.id } });
    ok(res, {});
  }),
);
router.put(
  "/assessments/:id/questions/reorder",
  asyncHandler(async (req, res) => {
    const i = parse(
      z.object({ questionIds: z.array(z.string().uuid()) }),
      req.body,
    );
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์แก้ไข");
    if (a.status !== "DRAFT" || a._count.responses)
      throw new HttpError(409, "คำถามถูกล็อกแล้ว");
    await prisma.$transaction(
      i.questionIds.map((id, index) =>
        prisma.questions.updateMany({
          where: { id, assessment_id: a.id },
          data: { sort_order: index },
        }),
      ),
    );
    ok(res, {});
  }),
);

// Anonymous public access and transactional submission
router.get(
  "/public/assessments/:token",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { public_token: req.params.token },
      include: {
        assessment_categories: true,
        questions: {
          orderBy: { sort_order: "asc" },
          include: { question_options: { orderBy: { sort_order: "asc" } } },
        },
      },
    });
    const now = new Date();
    if (
      !a ||
      a.status !== "PUBLISHED" ||
      (a.start_at && now < a.start_at) ||
      (a.end_at && now > a.end_at)
    )
      throw new HttpError(404, "แบบประเมินนี้ไม่เปิดรับคำตอบ");
    ok(res, {
      id: a.id,
      title: a.title,
      description: a.description,
      targetGroup: a.target_group,
      category: a.assessment_categories.name,
      questions: a.questions.map((q) => ({
        id: q.id,
        text: q.question_text,
        type: q.question_type,
        required: q.is_required,
        options: q.question_options.map((o) => ({
          id: o.id,
          text: o.option_text,
          score: o.score,
        })),
      })),
    });
  }),
);
const recentKeys = new Map();
router.post(
  "/public/assessments/:token/responses",
  asyncHandler(async (req, res) => {
    const key = req.headers["idempotency-key"];
    if (key && recentKeys.has(key))
      return ok(res, { id: recentKeys.get(key) }, "บันทึกคำตอบแล้ว");
    const a = await prisma.assessments.findUnique({
      where: { public_token: req.params.token },
      include: { questions: { include: { question_options: true } } },
    });
    const now = new Date();
    if (
      !a ||
      a.status !== "PUBLISHED" ||
      (a.start_at && now < a.start_at) ||
      (a.end_at && now > a.end_at)
    )
      throw new HttpError(404, "แบบประเมินนี้ไม่เปิดรับคำตอบ");
    const body = parse(
      z.object({
        respondentType: z.enum(["INTERNAL", "EXTERNAL"]),
        name: z.string().max(150).optional().nullable(),
        email: z.string().email().max(150).optional().nullable(),
        answers: z.array(
          z.object({
            questionId: z.string().uuid(),
            text: z.string().max(10000).optional().nullable(),
            number: z.number().finite().optional().nullable(),
            optionIds: z.array(z.string().uuid()).optional().default([]),
          }),
        ),
      }),
      req.body,
    );
    if (a.target_group !== "BOTH" && a.target_group !== body.respondentType)
      throw new HttpError(400, "แบบประเมินนี้ไม่รองรับผู้ตอบประเภทนี้");
    const byId = new Map(body.answers.map((x) => [x.questionId, x]));
    if (byId.size !== body.answers.length)
      throw new HttpError(400, "พบคำตอบซ้ำ");
    for (const q of a.questions) {
      const answer = byId.get(q.id);
      if (
        q.is_required &&
        (!answer ||
          (!answer.text?.trim() &&
            answer.number == null &&
            !answer.optionIds?.length))
      )
        throw new HttpError(400, `กรุณาตอบ: ${q.question_text}`);
      if (!answer) continue;
      if (["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(q.question_type)) {
        if (q.question_type === "SINGLE_CHOICE" && answer.optionIds.length > 1)
          throw new HttpError(400, "เลือกได้เพียงหนึ่งตัวเลือก");
        if (
          answer.optionIds.some(
            (id) => !q.question_options.some((o) => o.id === id),
          )
        )
          throw new HttpError(400, "ตัวเลือกไม่ถูกต้อง");
      } else if (
        q.question_type === "RATING" &&
        (!Number.isInteger(answer.number) ||
          answer.number < 1 ||
          answer.number > 5)
      )
        throw new HttpError(400, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5");
      else if (q.question_type === "NUMBER" && answer.number == null)
        throw new HttpError(400, "กรุณากรอกตัวเลข");
    }
    const response = await prisma.$transaction(async (tx) => {
      const r = await tx.responses.create({
        data: {
          assessment_id: a.id,
          respondent_type: body.respondentType,
          respondent_name: body.name || null,
          respondent_email: body.email || null,
        },
      });
      for (const [questionId, x] of byId) {
        const q = a.questions.find((item) => item.id === questionId);
        if (!q) throw new HttpError(400, "พบคำถามที่ไม่อยู่ในแบบประเมิน");
        const ans = await tx.answers.create({
          data: {
            response_id: r.id,
            question_id: q.id,
            answer_text: ["SHORT_TEXT", "LONG_TEXT"].includes(q.question_type)
              ? x.text || null
              : null,
            answer_number:
              ["RATING", "NUMBER"].includes(q.question_type) && x.number != null
                ? x.number
                : null,
          },
        });
        if (x.optionIds.length)
          await tx.answer_options.createMany({
            data: x.optionIds.map((option_id) => ({
              answer_id: ans.id,
              option_id,
            })),
          });
      }
      return r;
    });
    if (key) {
      recentKeys.set(key, response.id);
      setTimeout(() => recentKeys.delete(key), 60 * 60 * 1000).unref?.();
    }
    ok(res, { id: response.id }, "ส่งคำตอบเรียบร้อยแล้ว", 201);
  }),
);

// Dashboard and reports
router.get(
  "/dashboard/summary",
  roles("ADMIN", "STAFF"),
  asyncHandler(async (req, res) => {
    const scope =
      req.user.roles.name === "ADMIN" ? {} : { created_by: req.user.id };
    const [
      total,
      published,
      draft,
      closed,
      responses,
      internal,
      external,
      staff,
      recent,
    ] = await Promise.all([
      prisma.assessments.count({ where: scope }),
      prisma.assessments.count({ where: { ...scope, status: "PUBLISHED" } }),
      prisma.assessments.count({ where: { ...scope, status: "DRAFT" } }),
      prisma.assessments.count({ where: { ...scope, status: "CLOSED" } }),
      prisma.responses.count({ where: { assessments: scope } }),
      prisma.responses.count({
        where: { respondent_type: "INTERNAL", assessments: scope },
      }),
      prisma.responses.count({
        where: { respondent_type: "EXTERNAL", assessments: scope },
      }),
      prisma.users.count({
        where: { is_active: true, roles: { name: "STAFF" } },
      }),
      prisma.assessments.findMany({
        where: scope,
        include: {
          assessment_categories: true,
          _count: { select: { responses: true } },
        },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);
    ok(res, {
      assessments: { total, published, draft, closed },
      responses: { total, internal, external },
      staff,
      recent: recent.map(serializedAssessment),
    });
  }),
);
router.get(
  "/dashboard/charts",
  roles("ADMIN", "STAFF"),
  asyncHandler(async (req, res) => {
    const where =
      req.user.roles.name === "ADMIN" ? {} : { created_by: req.user.id };
    const responses = await prisma.responses.findMany({
      where: { assessments: where },
      select: { submitted_at: true, respondent_type: true },
    });
    const daily = new Map(),
      monthly = new Map();
    for (const r of responses) {
      const d = r.submitted_at.toISOString().slice(0, 10),
        m = d.slice(0, 7);
      daily.set(d, (daily.get(d) || 0) + 1);
      monthly.set(m, (monthly.get(m) || 0) + 1);
    }
    ok(res, {
      daily: [...daily].slice(-30).map(([date, count]) => ({ date, count })),
      monthly: [...monthly]
        .slice(-12)
        .map(([month, count]) => ({ month, count })),
      respondents: {
        internal: responses.filter((r) => r.respondent_type === "INTERNAL")
          .length,
        external: responses.filter((r) => r.respondent_type === "EXTERNAL")
          .length,
      },
    });
  }),
);
router.get(
  "/reports/assessments/:id",
  asyncHandler(async (req, res) => {
    const a = await prisma.assessments.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { responses: true } } },
    });
    if (!a) throw new HttpError(404, "ไม่พบแบบประเมิน");
    if (req.user.roles.name !== "ADMIN" && a.created_by !== req.user.id)
      throw new HttpError(403, "ไม่มีสิทธิ์ดูรายงาน");
    const responses = await prisma.responses.findMany({
      where: { assessment_id: a.id },
      include: {
        answers: {
          include: {
            questions: true,
            answer_options: { include: { question_options: true } },
          },
        },
      },
      orderBy: { submitted_at: "desc" },
    });
    const byQuestion = new Map();
    for (const r of responses)
      for (const ans of r.answers) {
        const item = byQuestion.get(ans.question_id) || {
          question: ans.questions.question_text,
          type: ans.questions.question_type,
          numbers: [],
          options: {},
          texts: [],
        };
        if (
          ans.questions.question_type === "RATING" &&
          ans.answer_number != null
        )
          item.numbers.push(Number(ans.answer_number));
        if (ans.answer_text) item.texts.push(ans.answer_text);
        for (const x of ans.answer_options)
          item.options[x.question_options.option_text] =
            (item.options[x.question_options.option_text] || 0) + 1;
        byQuestion.set(ans.question_id, item);
      }
    const questions = [...byQuestion].map(([id, q]) => ({
      id,
      ...q,
      average: q.numbers.length
        ? q.numbers.reduce((s, n) => s + n, 0) / q.numbers.length
        : null,
    }));
    const score = questions.filter((q) => q.average !== null);
    const avg = score.length
      ? score.reduce((s, q) => s + q.average, 0) / score.length
      : null;
    ok(res, {
      assessment: { id: a.id, title: a.title },
      summary: {
        total: responses.length,
        internal: responses.filter((r) => r.respondent_type === "INTERNAL")
          .length,
        external: responses.filter((r) => r.respondent_type === "EXTERNAL")
          .length,
        average: avg,
      },
      questions,
      responses: responses.map((r) => ({
        id: r.id,
        type: r.respondent_type,
        submittedAt: r.submitted_at,
        answers: r.answers.map((x) => ({
          question: x.questions.question_text,
          text: x.answer_text,
          number: x.answer_number,
          options: x.answer_options.map((o) => o.question_options.option_text),
        })),
      })),
    });
  }),
);
router.get(
  "/reports/assessments/:id/export",
  asyncHandler(async (req, res) => {
    const data = await prisma.responses.findMany({
      where: { assessment_id: req.params.id },
      include: {
        answers: {
          include: {
            questions: true,
            answer_options: { include: { question_options: true } },
          },
        },
      },
      orderBy: { submitted_at: "asc" },
    });
    if (req.user.roles.name !== "ADMIN") {
      const a = await prisma.assessments.findUnique({
        where: { id: req.params.id },
      });
      if (a?.created_by !== req.user.id)
        throw new HttpError(403, "ไม่มีสิทธิ์ส่งออกรายงาน");
    }
    const cell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [
      [
        "response_id",
        "respondent_type",
        "submitted_at",
        "question",
        "text",
        "number",
        "options",
      ]
        .map(cell)
        .join(","),
    ];
    for (const r of data)
      for (const a of r.answers)
        rows.push(
          [
            r.id,
            r.respondent_type,
            r.submitted_at.toISOString(),
            a.questions.question_text,
            a.answer_text,
            a.answer_number,
            a.answer_options
              .map((o) => o.question_options.option_text)
              .join("; "),
          ]
            .map(cell)
            .join(","),
        );
    res
      .type("text/csv; charset=utf-8")
      .attachment(`assessment-${req.params.id}.csv`)
      .send("\uFEFF" + rows.join("\r\n"));
  }),
);

export default router;
