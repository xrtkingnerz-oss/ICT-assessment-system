import "dotenv/config";
import { prisma } from "../config/prisma.js";

const demoToken = "DEMO-ICT-2026-01";
const ratingValues = [5, 4, 4, 5, 3, 4, 5, 4, 3, 5, 4, 4, 5, 2, 4, 5, 3, 4];
const waitingTimeOptions = [
  0, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 0, 0, 2, 1, 0, 1, 0,
];
const serviceOptions = [
  [0],
  [1, 2],
  [0, 3],
  [2],
  [0, 1],
  [3, 4],
  [1],
  [0, 2],
  [2, 3],
  [0],
  [1, 4],
  [2],
  [0, 3],
  [1],
  [0, 2, 4],
  [3],
  [1, 2],
  [0, 4],
];
const comments = [
  "ขั้นตอนชัดเจน เจ้าหน้าที่ให้คำแนะนำเข้าใจง่าย",
  "อยากให้มีคู่มือการเชื่อมต่อ Wi-Fi สำหรับผู้ใช้ใหม่",
  "ได้รับบริการรวดเร็วและสุภาพ",
  "บางช่วงมีผู้ใช้บริการพร้อมกันจำนวนมาก ควรเพิ่มช่องทางแจ้งคิว",
  "ระบบโดยรวมใช้งานง่าย หากมีหน้ารวมคำถามที่พบบ่อยจะช่วยได้มาก",
  "อุปกรณ์พร้อมใช้งานดี ขอให้ดูแลและตรวจสอบเป็นประจำ",
];

async function addDemoAssessment() {
  const existing = await prisma.assessments.findUnique({
    where: { public_token: demoToken },
    select: { id: true },
  });
  if (existing) {
    console.log("ชุดข้อมูลสาธิตนี้มีอยู่แล้ว ไม่มีการเพิ่มข้อมูลซ้ำ");
    return;
  }

  const [category, creator] = await Promise.all([
    prisma.assessment_categories.findFirst({
      where: { name: "การประเมินความพึงพอใจ" },
      orderBy: { created_at: "asc" },
      select: { id: true },
    }),
    prisma.users.findFirst({
      where: { is_active: true, roles: { name: "ADMIN" } },
      orderBy: { created_at: "asc" },
      select: { id: true },
    }),
  ]);

  if (!category) throw new Error("ไม่พบหมวดหมู่การประเมินความพึงพอใจ");
  if (!creator) throw new Error("ไม่พบบัญชี Admin ที่เปิดใช้งาน");

  await prisma.$transaction(
    async (tx) => {
      const assessment = await tx.assessments.create({
        data: {
          category_id: category.id,
          created_by: creator.id,
          title: "[ข้อมูลสาธิต] ความพึงพอใจต่อการให้บริการ ICT",
          description:
            "ชุดข้อมูลสาธิตที่สร้างขึ้นเพื่อแสดงตัวอย่าง Dashboard และรายงาน ไม่ใช่ผลประเมินจริงของหน่วยงาน",
          target_group: "BOTH",
          status: "CLOSED",
          public_token: demoToken,
          questions: {
            create: [
              {
                question_text:
                  "โดยรวมแล้ว ท่านพึงพอใจต่อการให้บริการ ICT เพียงใด",
                question_type: "RATING",
                is_required: true,
                sort_order: 0,
              },
              {
                question_text: "ท่านใช้เวลารอรับบริการประมาณเท่าใด",
                question_type: "SINGLE_CHOICE",
                is_required: true,
                sort_order: 1,
                question_options: {
                  create: [
                    { option_text: "ไม่เกิน 10 นาที", score: 5, sort_order: 0 },
                    { option_text: "11–20 นาที", score: 4, sort_order: 1 },
                    { option_text: "มากกว่า 20 นาที", score: 3, sort_order: 2 },
                  ],
                },
              },
              {
                question_text: "ท่านใช้บริการด้านใดบ้าง",
                question_type: "MULTIPLE_CHOICE",
                is_required: false,
                sort_order: 2,
                question_options: {
                  create: [
                    {
                      option_text: "ระบบเครือข่ายและ Wi-Fi",
                      score: 0,
                      sort_order: 0,
                    },
                    {
                      option_text: "บัญชีผู้ใช้และอีเมล",
                      score: 0,
                      sort_order: 1,
                    },
                    {
                      option_text: "คอมพิวเตอร์และอุปกรณ์",
                      score: 0,
                      sort_order: 2,
                    },
                    {
                      option_text: "โปรแกรมและระบบงาน",
                      score: 0,
                      sort_order: 3,
                    },
                    {
                      option_text: "คำแนะนำหรืออบรมการใช้งาน",
                      score: 0,
                      sort_order: 4,
                    },
                  ],
                },
              },
              {
                question_text: "ข้อเสนอแนะเพิ่มเติม",
                question_type: "LONG_TEXT",
                is_required: false,
                sort_order: 3,
              },
            ],
          },
        },
        include: {
          questions: {
            orderBy: { sort_order: "asc" },
            include: { question_options: { orderBy: { sort_order: "asc" } } },
          },
        },
      });

      for (let index = 0; index < ratingValues.length; index += 1) {
        const response = await tx.responses.create({
          data: {
            assessment_id: assessment.id,
            respondent_type: index % 3 === 0 ? "EXTERNAL" : "INTERNAL",
            submitted_at: new Date(Date.now() - (17 - index) * 86_400_000),
          },
        });
        const ratingQuestion = assessment.questions[0];
        const waitQuestion = assessment.questions[1];
        const serviceQuestion = assessment.questions[2];
        const commentQuestion = assessment.questions[3];

        await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: ratingQuestion.id,
            answer_number: ratingValues[index],
          },
        });
        const waitAnswer = await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: waitQuestion.id,
          },
        });
        const waitOption =
          waitQuestion.question_options[waitingTimeOptions[index]];
        await tx.answer_options.create({
          data: { answer_id: waitAnswer.id, option_id: waitOption.id },
        });

        const serviceAnswer = await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: serviceQuestion.id,
          },
        });
        await tx.answer_options.createMany({
          data: serviceOptions[index].map((optionIndex) => ({
            answer_id: serviceAnswer.id,
            option_id: serviceQuestion.question_options[optionIndex].id,
          })),
        });

        if (index % 3 === 0) {
          await tx.answers.create({
            data: {
              response_id: response.id,
              question_id: commentQuestion.id,
              answer_text: comments[index % comments.length],
            },
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  console.log(
    "เพิ่มข้อมูลสาธิตแบบไม่ระบุตัวบุคคลแล้ว: 1 แบบประเมิน, 4 คำถาม, 18 คำตอบ",
  );
}

try {
  await addDemoAssessment();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
